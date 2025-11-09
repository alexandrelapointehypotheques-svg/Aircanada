const cron = require('node-cron');
const db = require('../db/database');
const duffelService = require('../services/duffelService');
const twilioService = require('../services/twilioService');
const priceAnalyzer = require('../services/priceAnalyzer');

class PriceChecker {
    constructor() {
        this.isRunning = false;
    }

    /**
     * Démarrer le cron job
     * Vérifie les prix 2x par jour: 6h AM et 6h PM
     */
    start() {
        console.log('🕐 Démarrage du cron job de vérification des prix...');

        // Vérifier les prix à 6h AM et 18h PM tous les jours
        cron.schedule('0 6,18 * * *', async () => {
            console.log('\n🔄 Vérification automatique des prix...');
            await this.checkAllPrices();
        });

        console.log('✅ Cron job configuré: 6h AM et 18h PM tous les jours');

        // Première vérification au démarrage
        this.checkAllPrices();
    }

    /**
     * Vérifier les prix de toutes les destinations actives
     */
    async checkAllPrices() {
        if (this.isRunning) {
            console.log('⏳ Vérification déjà en cours...');
            return;
        }

        this.isRunning = true;

        try {
            // Récupérer toutes les destinations actives
            const destinations = db.prepare(`
                SELECT * FROM destinations 
                WHERE is_active = 1
            `).all();

            console.log(`📍 ${destinations.length} destination(s) à vérifier`);

            for (const dest of destinations) {
                await this.checkDestinationPrice(dest);
                // Pause de 2 secondes entre chaque requête pour ne pas surcharger l'API
                await this.sleep(2000);
            }

            console.log('✅ Vérification terminée\n');

        } catch (error) {
            console.error('❌ Erreur lors de la vérification:', error.message);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Vérifier le prix pour une destination spécifique
     * @param {Object} destination - Destination à vérifier
     */
    async checkDestinationPrice(destination) {
        try {
            console.log(`\n🔍 Vérification: ${destination.origin} → ${destination.destination}`);

            // Récupérer le prix via Duffel
            const price = await duffelService.getLowestPrice({
                origin: destination.origin,
                destination: destination.destination,
                departureDate: destination.departure_date,
                returnDate: destination.return_date
            });

            if (!price) {
                console.log('⚠️  Aucun vol trouvé');
                return;
            }

            console.log(`💰 Prix trouvé: ${price}$ CAD`);

            // Sauvegarder le prix dans la DB
            db.prepare(`
                INSERT INTO prices (destination_id, price, currency, airline)
                VALUES (?, ?, 'CAD', 'Air Canada')
            `).run(destination.id, price);

            // Analyser le prix
            await this.analyzeAndAlert(destination, price);

        } catch (error) {
            console.error(`❌ Erreur pour ${destination.origin}-${destination.destination}:`, error.message);
        }
    }

    /**
     * Analyser le prix et envoyer des alertes si nécessaire
     * @param {Object} destination - Destination
     * @param {Number} price - Prix actuel
     */
    async analyzeAndAlert(destination, price) {
        // Vérifier s'il faut acheter maintenant
        const buyDecision = priceAnalyzer.shouldBuyNow(destination.id, price);
        
        if (buyDecision.buy && buyDecision.urgency === 'high') {
            console.log('🎯 ALERTE: Moment optimal pour acheter!');
            
            // Envoyer SMS
            await twilioService.sendOptimalPriceAlert({
                origin: destination.origin,
                destination: destination.destination,
                currentPrice: price,
                score: buyDecision.score
            });

            // Enregistrer l'alerte
            this.saveAlert(destination.id, 'optimal_price', 
                `Prix optimal détecté: ${price}$ CAD (Score: ${buyDecision.score}%)`);
        }

        // Vérifier une baisse significative
        const priceDrop = priceAnalyzer.detectPriceDrop(destination.id, price);
        
        if (priceDrop) {
            console.log(`📉 Baisse de ${priceDrop.percentageDrop}% détectée!`);
            
            // Envoyer SMS
            await twilioService.sendPriceDropAlert({
                origin: destination.origin,
                destination: destination.destination,
                currentPrice: price,
                previousPrice: priceDrop.previousPrice,
                percentageDrop: priceDrop.percentageDrop
            });

            // Enregistrer l'alerte
            this.saveAlert(destination.id, 'price_drop', 
                `Baisse de ${priceDrop.percentageDrop}%: ${priceDrop.previousPrice}$ → ${price}$`);
        }

        // Vérifier le prix maximum
        if (destination.max_price && price <= destination.max_price) {
            console.log('🎯 Prix cible atteint!');
            
            // Envoyer SMS
            await twilioService.sendMaxPriceAlert({
                origin: destination.origin,
                destination: destination.destination,
                currentPrice: price,
                maxPrice: destination.max_price
            });

            // Enregistrer l'alerte
            this.saveAlert(destination.id, 'max_price_reached', 
                `Prix cible atteint: ${price}$ CAD (Limite: ${destination.max_price}$)`);
        }
    }

    /**
     * Sauvegarder une alerte dans la DB
     * @param {Number} destinationId - ID destination
     * @param {String} alertType - Type d'alerte
     * @param {String} message - Message de l'alerte
     */
    saveAlert(destinationId, alertType, message) {
        db.prepare(`
            INSERT INTO alerts (destination_id, alert_type, message)
            VALUES (?, ?, ?)
        `).run(destinationId, alertType, message);
    }

    /**
     * Utilitaire: Pause
     * @param {Number} ms - Millisecondes
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Vérifier manuellement une destination spécifique
     * @param {Number} destinationId - ID de la destination
     */
    async checkSingleDestination(destinationId) {
        const destination = db.prepare('SELECT * FROM destinations WHERE id = ?').get(destinationId);
        
        if (!destination) {
            throw new Error('Destination introuvable');
        }

        await this.checkDestinationPrice(destination);
    }
}

module.exports = new PriceChecker();
