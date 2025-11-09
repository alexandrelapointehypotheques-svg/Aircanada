const twilio = require('twilio');
require('dotenv').config();

class TwilioService {
    constructor() {
        this.accountSid = process.env.TWILIO_ACCOUNT_SID;
        this.authToken = process.env.TWILIO_AUTH_TOKEN;
        this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
        this.toNumber = process.env.YOUR_PHONE_NUMBER;

        if (this.accountSid && this.authToken) {
            this.client = twilio(this.accountSid, this.authToken);
        } else {
            console.warn('⚠️  Twilio non configuré. SMS désactivés.');
        }
    }

    /**
     * Envoyer un SMS
     * @param {String} message - Message à envoyer
     * @returns {Promise<Object>} - Résultat de l'envoi
     */
    async sendSMS(message) {
        if (!this.client) {
            console.log('📱 SMS (simulation):', message);
            return { success: false, message: 'Twilio non configuré' };
        }

        try {
            const result = await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: this.toNumber
            });

            console.log('✅ SMS envoyé:', result.sid);
            return { success: true, sid: result.sid };

        } catch (error) {
            console.error('❌ Erreur envoi SMS:', error.message);
            throw error;
        }
    }

    /**
     * Envoyer une alerte de baisse de prix
     * @param {Object} data - Données de l'alerte
     * @returns {Promise<Object>}
     */
    async sendPriceDropAlert(data) {
        const { origin, destination, currentPrice, previousPrice, percentageDrop } = data;
        
        const message = `🛫 ALERTE PRIX Air Canada!\n\n` +
            `${origin} → ${destination}\n` +
            `Prix: ${currentPrice}$ CAD (${percentageDrop}% de baisse)\n` +
            `Ancien prix: ${previousPrice}$ CAD\n\n` +
            `C'est le moment d'acheter! 🎯`;

        return this.sendSMS(message);
    }

    /**
     * Envoyer une alerte de prix optimal
     * @param {Object} data - Données de l'alerte
     * @returns {Promise<Object>}
     */
    async sendOptimalPriceAlert(data) {
        const { origin, destination, currentPrice, score } = data;
        
        const message = `✨ EXCELLENT PRIX Air Canada!\n\n` +
            `${origin} → ${destination}\n` +
            `Prix: ${currentPrice}$ CAD\n` +
            `Score qualité/prix: ${score}%\n\n` +
            `Meilleur prix des 30 derniers jours! 🎉`;

        return this.sendSMS(message);
    }

    /**
     * Envoyer une alerte de prix maximum atteint
     * @param {Object} data - Données de l'alerte
     * @returns {Promise<Object>}
     */
    async sendMaxPriceAlert(data) {
        const { origin, destination, currentPrice, maxPrice } = data;
        
        const message = `🎯 PRIX CIBLE ATTEINT!\n\n` +
            `${origin} → ${destination}\n` +
            `Prix: ${currentPrice}$ CAD\n` +
            `Votre limite: ${maxPrice}$ CAD\n\n` +
            `Réservez maintenant! ⚡`;

        return this.sendSMS(message);
    }

    /**
     * Tester l'envoi de SMS
     * @returns {Promise<Object>}
     */
    async testSMS() {
        const message = '🧪 Test Air Canada Price Tracker\n\n' +
            'Votre système d\'alertes fonctionne correctement! ✅';
        
        return this.sendSMS(message);
    }
}

module.exports = new TwilioService();
