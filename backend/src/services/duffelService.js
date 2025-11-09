const axios = require('axios');
require('dotenv').config();

class DuffelService {
    constructor() {
        this.apiKey = process.env.DUFFEL_API_KEY;
        this.baseURL = 'https://api.duffel.com';
        
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Duffel-Version': 'v1'
            }
        });
    }

    /**
     * Rechercher des vols
     * @param {Object} params - Paramètres de recherche
     * @returns {Promise<Array>} - Liste des vols trouvés
     */
    async searchFlights(params) {
        try {
            const { origin, destination, departureDate, returnDate, passengers = 1 } = params;

            // Créer une offre de recherche
            const offerRequest = {
                data: {
                    slices: [
                        {
                            origin,
                            destination,
                            departure_date: departureDate
                        }
                    ],
                    passengers: Array(passengers).fill({ type: 'adult' }),
                    cabin_class: 'economy'
                }
            };

            // Ajouter le vol retour si spécifié
            if (returnDate) {
                offerRequest.data.slices.push({
                    origin: destination,
                    destination: origin,
                    departure_date: returnDate
                });
            }

            console.log(`🔍 Recherche de vols: ${origin} → ${destination}`);
            
            const response = await this.client.post('/air/offer_requests', offerRequest);
            const offers = response.data.data.offers || [];

            // Filtrer pour Air Canada uniquement
            const airCanadaOffers = offers.filter(offer => 
                offer.owner.name === 'Air Canada' ||
                offer.slices.some(slice => 
                    slice.segments.some(segment => 
                        segment.operating_carrier.name === 'Air Canada'
                    )
                )
            );

            console.log(`✅ ${airCanadaOffers.length} offres Air Canada trouvées`);

            return airCanadaOffers.map(offer => ({
                price: parseFloat(offer.total_amount),
                currency: offer.total_currency,
                airline: 'Air Canada',
                duration: offer.slices.reduce((acc, slice) => acc + slice.duration, 0),
                stops: offer.slices.reduce((acc, slice) => acc + slice.segments.length - 1, 0)
            }));

        } catch (error) {
            console.error('❌ Erreur Duffel API:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Obtenir le prix le plus bas pour une route
     * @param {Object} params - Paramètres de recherche
     * @returns {Promise<Number>} - Prix le plus bas trouvé
     */
    async getLowestPrice(params) {
        try {
            const flights = await this.searchFlights(params);
            
            if (flights.length === 0) {
                return null;
            }

            const prices = flights.map(f => f.price);
            return Math.min(...prices);

        } catch (error) {
            console.error('❌ Erreur lors de la récupération du prix:', error.message);
            return null;
        }
    }
}

module.exports = new DuffelService();
