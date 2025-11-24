const cron = require('node-cron');
const db = require('../db/database');
const duffelService = require('../services/duffelService');
const twilioService = require('../services/twilioService');
const priceAnalyzer = require('../services/priceAnalyzer');

// Helper pour executer les requetes de maniere unifiee
async function execQuery(stmt, method, ...params) {
    const result = stmt[method](...params);
    return result instanceof Promise ? await result : result;
}

class PriceChecker {
    constructor() {
        this.isRunning = false;
    }

    /**
     * Demarrer le cron job
     * Verifie les prix 2x par jour: 6h AM et 6h PM
     */
    start() {
        console.log('Demarrage du cron job de verification des prix...');

        // Verifier les prix a 6h AM et 18h PM tous les jours
        cron.schedule('0 6,18 * * *', async () => {
            console.log('\nVerification automatique des prix...');
            await this.checkAllPrices();
        });

        console.log('Cron job configure: 6h AM et 18h PM tous les jours');

        // Premiere verification au demarrage
        this.checkAllPrices();
    }

    /**
     * Verifier les prix de toutes les destinations actives
     */
    async checkAllPrices() {
        if (this.isRunning) {
            console.log('Verification deja en cours...');
            return;
        }

        this.isRunning = true;

        try {
            // Recuperer toutes les destinations actives
            const stmt = db.prepare(`
                SELECT * FROM destinations
                WHERE is_active = 1
            `);
            const destinations = await execQuery(stmt, 'all');

            console.log(`${destinations.length} destination(s) a verifier`);

            for (const dest of destinations) {
                await this.checkDestinationPrice(dest);
                // Pause de 2 secondes entre chaque requete pour ne pas surcharger l'API
                await this.sleep(2000);
            }

            console.log('Verification terminee\n');

        } catch (error) {
            console.error('Erreur lors de la verification:', error.message);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Verifier le prix pour une destination specifique
     * @param {Object} destination - Destination a verifier
     */
    async checkDestinationPrice(destination) {
        try {
            console.log(`\nVerification: ${destination.origin} -> ${destination.destination}`);

            // Recuperer le prix via Duffel
            const price = await duffelService.getLowestPrice({
                origin: destination.origin,
                destination: destination.destination,
                departureDate: destination.departure_date,
                returnDate: destination.return_date
            });

            if (!price) {
                console.log('Aucun vol trouve');
                return;
            }

            console.log(`Prix trouve: ${price}$ CAD`);

            // Sauvegarder le prix dans la DB
            const stmt = db.prepare(`
                INSERT INTO prices (destination_id, price, currency, airline)
                VALUES (?, ?, 'CAD', 'Air Canada')
            `);
            await execQuery(stmt, 'run', destination.id, price);

            // Analyser le prix
            await this.analyzeAndAlert(destination, price);

        } catch (error) {
            console.error(`Erreur pour ${destination.origin}-${destination.destination}:`, error.message);
        }
    }

    /**
     * Analyser le prix et envoyer des alertes si necessaire
     * @param {Object} destination - Destination
     * @param {Number} price - Prix actuel
     */
    async analyzeAndAlert(destination, price) {
        // Verifier s'il faut acheter maintenant
        const buyDecision = await priceAnalyzer.shouldBuyNow(destination.id, price);

        if (buyDecision.buy && buyDecision.urgency === 'high') {
            console.log('ALERTE: Moment optimal pour acheter!');

            // Envoyer SMS
            await twilioService.sendOptimalPriceAlert({
                origin: destination.origin,
                destination: destination.destination,
                currentPrice: price,
                score: buyDecision.score
            });

            // Enregistrer l'alerte
            await this.saveAlert(destination.id, 'optimal_price',
                `Prix optimal detecte: ${price}$ CAD (Score: ${buyDecision.score}%)`);
        }

        // Verifier une baisse significative
        const priceDrop = await priceAnalyzer.detectPriceDrop(destination.id, price);

        if (priceDrop) {
            console.log(`Baisse de ${priceDrop.percentageDrop}% detectee!`);

            // Envoyer SMS
            await twilioService.sendPriceDropAlert({
                origin: destination.origin,
                destination: destination.destination,
                currentPrice: price,
                previousPrice: priceDrop.previousPrice,
                percentageDrop: priceDrop.percentageDrop
            });

            // Enregistrer l'alerte
            await this.saveAlert(destination.id, 'price_drop',
                `Baisse de ${priceDrop.percentageDrop}%: ${priceDrop.previousPrice}$ -> ${price}$`);
        }

        // Verifier le prix maximum
        if (destination.max_price && price <= destination.max_price) {
            console.log('Prix cible atteint!');

            // Envoyer SMS
            await twilioService.sendMaxPriceAlert({
                origin: destination.origin,
                destination: destination.destination,
                currentPrice: price,
                maxPrice: destination.max_price
            });

            // Enregistrer l'alerte
            await this.saveAlert(destination.id, 'max_price_reached',
                `Prix cible atteint: ${price}$ CAD (Limite: ${destination.max_price}$)`);
        }
    }

    /**
     * Sauvegarder une alerte dans la DB
     * @param {Number} destinationId - ID destination
     * @param {String} alertType - Type d'alerte
     * @param {String} message - Message de l'alerte
     */
    async saveAlert(destinationId, alertType, message) {
        const stmt = db.prepare(`
            INSERT INTO alerts (destination_id, alert_type, message)
            VALUES (?, ?, ?)
        `);
        await execQuery(stmt, 'run', destinationId, alertType, message);
    }

    /**
     * Utilitaire: Pause
     * @param {Number} ms - Millisecondes
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Verifier manuellement une destination specifique
     * @param {Number} destinationId - ID de la destination
     */
    async checkSingleDestination(destinationId) {
        const stmt = db.prepare('SELECT * FROM destinations WHERE id = ?');
        const destination = await execQuery(stmt, 'get', destinationId);

        if (!destination) {
            throw new Error('Destination introuvable');
        }

        await this.checkDestinationPrice(destination);
    }
}

module.exports = new PriceChecker();
