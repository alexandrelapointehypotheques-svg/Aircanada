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
                'Duffel-Version': 'v2'
            }
        });
    }

    /**
     * Rechercher des vols
     * @param {Object} params - Parametres de recherche
     * @returns {Promise<Array>} - Liste des vols trouves
     */
    async searchFlights(params) {
        try {
            const { origin, destination, departureDate, returnDate, passengers = 1 } = params;

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

            if (returnDate) {
                offerRequest.data.slices.push({
                    origin: destination,
                    destination: origin,
                    departure_date: returnDate
                });
            }

            console.log(`Recherche de vols: ${origin} -> ${destination} (${departureDate})`);

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

            console.log(`${airCanadaOffers.length} offres Air Canada trouvees`);

            return airCanadaOffers.map(offer => {
                // Calculer les escales pour l'aller
                const outboundSlice = offer.slices[0];
                const outboundStops = outboundSlice ? outboundSlice.segments.length - 1 : 0;

                // Calculer les escales pour le retour (si applicable)
                const returnSlice = offer.slices[1];
                const returnStops = returnSlice ? returnSlice.segments.length - 1 : 0;

                // Total des escales
                const totalStops = outboundStops + returnStops;

                // Duree totale en minutes
                const durationMinutes = offer.slices.reduce((acc, slice) => {
                    if (slice.duration) {
                        // Format ISO 8601 duration (PT2H30M)
                        const match = slice.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
                        if (match) {
                            const hours = parseInt(match[1] || 0);
                            const minutes = parseInt(match[2] || 0);
                            return acc + (hours * 60) + minutes;
                        }
                    }
                    return acc;
                }, 0);

                return {
                    price: parseFloat(offer.total_amount),
                    currency: offer.total_currency,
                    airline: 'Air Canada',
                    durationMinutes,
                    durationFormatted: this.formatDuration(durationMinutes),
                    totalStops,
                    outboundStops,
                    returnStops,
                    isDirect: totalStops === 0,
                    departureTime: outboundSlice?.segments[0]?.departing_at || null,
                    arrivalTime: outboundSlice?.segments[outboundSlice.segments.length - 1]?.arriving_at || null
                };
            });

        } catch (error) {
            console.error('Erreur Duffel API:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Formater la duree en heures et minutes
     */
    formatDuration(minutes) {
        if (!minutes) return null;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0) return `${mins}min`;
        if (mins === 0) return `${hours}h`;
        return `${hours}h${mins}`;
    }

    /**
     * Obtenir le meilleur vol pour une route
     * @param {Object} params - Parametres de recherche
     * @returns {Promise<Object>} - Meilleur vol trouve (prix + infos)
     */
    async getBestFlight(params) {
        try {
            const flights = await this.searchFlights(params);

            if (flights.length === 0) {
                return null;
            }

            // Trier par prix et prendre le moins cher
            flights.sort((a, b) => a.price - b.price);
            return flights[0];

        } catch (error) {
            console.error('Erreur lors de la recuperation du vol:', error.message);
            return null;
        }
    }

    /**
     * Obtenir le prix le plus bas pour une route (compatibilite)
     * @param {Object} params - Parametres de recherche
     * @returns {Promise<Number>} - Prix le plus bas trouve
     */
    async getLowestPrice(params) {
        const flight = await this.getBestFlight(params);
        return flight ? flight.price : null;
    }

    /**
     * Rechercher les prix sur plusieurs dates alternatives
     * @param {Object} params - Parametres de recherche
     * @param {Number} daysRange - Nombre de jours avant/apres (defaut: 3)
     * @returns {Promise<Array>} - Liste des dates avec prix
     */
    async searchAlternativeDates(params, daysRange = 3) {
        const { origin, destination, departureDate, returnDate } = params;
        const baseDate = new Date(departureDate);
        const results = [];

        console.log(`Recherche alternatives: ${origin} -> ${destination} (+/- ${daysRange} jours)`);

        // Generer les dates alternatives
        const dates = [];
        for (let i = -daysRange; i <= daysRange; i++) {
            const altDate = new Date(baseDate);
            altDate.setDate(altDate.getDate() + i);

            // Ne pas chercher dans le passe
            if (altDate >= new Date()) {
                dates.push(altDate.toISOString().split('T')[0]);
            }
        }

        // Rechercher les prix pour chaque date (avec delai pour eviter rate limiting)
        for (const date of dates) {
            try {
                // Calculer la date de retour correspondante si applicable
                let altReturnDate = null;
                if (returnDate) {
                    const originalDeparture = new Date(departureDate);
                    const originalReturn = new Date(returnDate);
                    const tripDuration = Math.round((originalReturn - originalDeparture) / (1000 * 60 * 60 * 24));

                    const newReturn = new Date(date);
                    newReturn.setDate(newReturn.getDate() + tripDuration);
                    altReturnDate = newReturn.toISOString().split('T')[0];
                }

                const flight = await this.getBestFlight({
                    origin,
                    destination,
                    departureDate: date,
                    returnDate: altReturnDate
                });

                results.push({
                    date,
                    returnDate: altReturnDate,
                    price: flight?.price || null,
                    available: flight !== null,
                    isOriginalDate: date === departureDate,
                    // Nouvelles infos sur les escales
                    isDirect: flight?.isDirect || false,
                    totalStops: flight?.totalStops || 0,
                    outboundStops: flight?.outboundStops || 0,
                    returnStops: flight?.returnStops || 0,
                    duration: flight?.durationFormatted || null,
                    departureTime: flight?.departureTime || null
                });

                // Pause de 1 seconde entre chaque requete
                await this.sleep(1000);

            } catch (error) {
                results.push({
                    date,
                    returnDate: null,
                    price: null,
                    available: false,
                    isOriginalDate: date === departureDate,
                    isDirect: false,
                    totalStops: 0,
                    error: error.message
                });
            }
        }

        // Trier par prix (moins cher en premier)
        results.sort((a, b) => {
            if (!a.available) return 1;
            if (!b.available) return -1;
            return a.price - b.price;
        });

        // Trouver le meilleur prix
        const bestPrice = results.find(r => r.available);
        if (bestPrice) {
            bestPrice.isBestPrice = true;
        }

        return results;
    }

    /**
     * Utilitaire: Pause
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new DuffelService();
