const db = require('../db/database');
const { differenceInDays, parseISO } = require('date-fns');

// Helper pour executer les requetes de maniere unifiee
async function execQuery(stmt, method, ...params) {
    const result = stmt[method](...params);
    return result instanceof Promise ? await result : result;
}

class PriceAnalyzer {
    /**
     * Calculer le score qualite/prix
     * @param {Number} destinationId - ID de la destination
     * @param {Number} currentPrice - Prix actuel
     * @returns {Object} - Score et analyse
     */
    async calculateQualityScore(destinationId, currentPrice) {
        // Recuperer l'historique des prix (30 derniers jours)
        const stmt = db.prepare(`
            SELECT price, checked_at
            FROM prices
            WHERE destination_id = ?
            AND checked_at >= datetime('now', '-30 days')
            ORDER BY checked_at DESC
        `);
        const prices = await execQuery(stmt, 'all', destinationId);

        if (prices.length === 0) {
            return {
                score: 50,
                recommendation: 'Pas assez de donnees historiques',
                analysis: 'Premier releve de prix'
            };
        }

        const priceValues = prices.map(p => p.price);
        const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
        const minPrice = Math.min(...priceValues);
        const maxPrice = Math.max(...priceValues);

        // Calculer l'ecart-type
        const variance = priceValues.reduce((sum, price) => {
            return sum + Math.pow(price - avgPrice, 2);
        }, 0) / priceValues.length;
        const stdDev = Math.sqrt(variance);

        // Calculer le score (0-100)
        let score = 100;

        // Facteur 1: Comparaison a la moyenne (40% du score)
        const avgDifference = ((avgPrice - currentPrice) / avgPrice) * 100;
        score -= Math.max(0, -avgDifference * 0.4);

        // Facteur 2: Position dans la fourchette min-max (30% du score)
        const rangePosition = maxPrice !== minPrice
            ? ((currentPrice - minPrice) / (maxPrice - minPrice)) * 100
            : 50;
        score -= rangePosition * 0.3;

        // Facteur 3: Tendance recente (30% du score)
        const recentPrices = priceValues.slice(0, 5);
        const trend = this.calculateTrend(recentPrices);
        if (trend === 'hausse') {
            score += 15;
        } else if (trend === 'baisse') {
            score -= 15;
        }

        // Normaliser le score entre 0 et 100
        score = Math.max(0, Math.min(100, score));

        // Determiner la recommandation
        let recommendation, analysis;
        if (score >= 90) {
            recommendation = 'Excellent moment pour acheter';
            analysis = `Prix ${Math.abs(avgDifference).toFixed(1)}% inferieur a la moyenne`;
        } else if (score >= 70) {
            recommendation = 'Bon prix, achetez si dates conviennent';
            analysis = 'Prix dans la fourchette basse';
        } else if (score >= 50) {
            recommendation = 'Prix moyen, attendre si possible';
            analysis = 'Prix proche de la moyenne historique';
        } else {
            recommendation = 'Prix eleve, attendre une baisse';
            analysis = `Prix ${Math.abs(avgDifference).toFixed(1)}% superieur a la moyenne`;
        }

        return {
            score: Math.round(score),
            recommendation,
            analysis,
            stats: {
                currentPrice,
                avgPrice: avgPrice.toFixed(2),
                minPrice: minPrice.toFixed(2),
                maxPrice: maxPrice.toFixed(2),
                trend,
                dataPoints: prices.length
            }
        };
    }

    /**
     * Calculer la tendance des prix
     * @param {Array} prices - Liste des prix recents
     * @returns {String} - 'hausse', 'baisse', ou 'stable'
     */
    calculateTrend(prices) {
        if (prices.length < 3) return 'stable';

        const recent = prices.slice(0, 3);
        const older = prices.slice(3, 6);

        if (older.length === 0) return 'stable';

        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

        const change = ((recentAvg - olderAvg) / olderAvg) * 100;

        if (change > 5) return 'hausse';
        if (change < -5) return 'baisse';
        return 'stable';
    }

    /**
     * Detecter si c'est le moment d'acheter
     * @param {Number} destinationId - ID de la destination
     * @param {Number} currentPrice - Prix actuel
     * @returns {Object} - Recommandation d'achat
     */
    async shouldBuyNow(destinationId, currentPrice) {
        const scoreData = await this.calculateQualityScore(destinationId, currentPrice);

        // Recuperer la destination
        const stmt = db.prepare('SELECT * FROM destinations WHERE id = ?');
        const destination = await execQuery(stmt, 'get', destinationId);

        if (!destination) {
            return { buy: false, reason: 'Destination introuvable' };
        }

        // Verifier le prix maximum
        if (destination.max_price && currentPrice <= destination.max_price) {
            return {
                buy: true,
                reason: 'Prix cible atteint',
                urgency: 'high',
                score: scoreData.score
            };
        }

        // Verifier le score qualite/prix
        if (scoreData.score >= 85) {
            return {
                buy: true,
                reason: 'Excellent prix historique',
                urgency: 'high',
                score: scoreData.score
            };
        }

        // Verifier la proximite de la date de depart
        const daysUntilDeparture = differenceInDays(
            parseISO(destination.departure_date),
            new Date()
        );

        if (daysUntilDeparture <= 14 && scoreData.score >= 70) {
            return {
                buy: true,
                reason: 'Bon prix et date proche',
                urgency: 'medium',
                score: scoreData.score
            };
        }

        return {
            buy: false,
            reason: scoreData.recommendation,
            score: scoreData.score,
            daysUntilDeparture
        };
    }

    /**
     * Detecter une baisse significative de prix
     * @param {Number} destinationId - ID de la destination
     * @param {Number} currentPrice - Prix actuel
     * @returns {Object|null} - Info sur la baisse ou null
     */
    async detectPriceDrop(destinationId, currentPrice) {
        // Recuperer le dernier prix
        const stmt = db.prepare(`
            SELECT price
            FROM prices
            WHERE destination_id = ?
            ORDER BY checked_at DESC
            LIMIT 1
        `);
        const lastPrice = await execQuery(stmt, 'get', destinationId);

        if (!lastPrice) return null;

        const priceDrop = lastPrice.price - currentPrice;
        const percentageDrop = (priceDrop / lastPrice.price) * 100;

        // Baisse significative si > 15%
        if (percentageDrop >= 15) {
            return {
                previousPrice: lastPrice.price,
                currentPrice,
                drop: priceDrop,
                percentageDrop: percentageDrop.toFixed(1)
            };
        }

        return null;
    }
}

module.exports = new PriceAnalyzer();
