const db = require('../db/database');
const { differenceInDays, parseISO } = require('date-fns');

class PriceAnalyzer {
    /**
     * Calculer le score qualité/prix
     * @param {Number} destinationId - ID de la destination
     * @param {Number} currentPrice - Prix actuel
     * @returns {Object} - Score et analyse
     */
    calculateQualityScore(destinationId, currentPrice) {
        // Récupérer l'historique des prix (30 derniers jours)
        const prices = db.prepare(`
            SELECT price, checked_at 
            FROM prices 
            WHERE destination_id = ? 
            AND checked_at >= datetime('now', '-30 days')
            ORDER BY checked_at DESC
        `).all(destinationId);

        if (prices.length === 0) {
            return {
                score: 50,
                recommendation: 'Pas assez de données historiques',
                analysis: 'Premier relevé de prix'
            };
        }

        const priceValues = prices.map(p => p.price);
        const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
        const minPrice = Math.min(...priceValues);
        const maxPrice = Math.max(...priceValues);

        // Calculer l'écart-type
        const variance = priceValues.reduce((sum, price) => {
            return sum + Math.pow(price - avgPrice, 2);
        }, 0) / priceValues.length;
        const stdDev = Math.sqrt(variance);

        // Calculer le score (0-100)
        let score = 100;

        // Facteur 1: Comparaison à la moyenne (40% du score)
        const avgDifference = ((avgPrice - currentPrice) / avgPrice) * 100;
        score -= Math.max(0, -avgDifference * 0.4);

        // Facteur 2: Position dans la fourchette min-max (30% du score)
        const rangePosition = ((currentPrice - minPrice) / (maxPrice - minPrice)) * 100;
        score -= rangePosition * 0.3;

        // Facteur 3: Tendance récente (30% du score)
        const recentPrices = priceValues.slice(0, 5);
        const trend = this.calculateTrend(recentPrices);
        if (trend === 'hausse') {
            score += 15;
        } else if (trend === 'baisse') {
            score -= 15;
        }

        // Normaliser le score entre 0 et 100
        score = Math.max(0, Math.min(100, score));

        // Déterminer la recommandation
        let recommendation, analysis;
        if (score >= 90) {
            recommendation = 'Excellent moment pour acheter';
            analysis = `Prix ${Math.abs(avgDifference).toFixed(1)}% inférieur à la moyenne`;
        } else if (score >= 70) {
            recommendation = 'Bon prix, achetez si dates conviennent';
            analysis = 'Prix dans la fourchette basse';
        } else if (score >= 50) {
            recommendation = 'Prix moyen, attendre si possible';
            analysis = 'Prix proche de la moyenne historique';
        } else {
            recommendation = 'Prix élevé, attendre une baisse';
            analysis = `Prix ${Math.abs(avgDifference).toFixed(1)}% supérieur à la moyenne`;
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
     * @param {Array} prices - Liste des prix récents
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
     * Détecter si c'est le moment d'acheter
     * @param {Number} destinationId - ID de la destination
     * @param {Number} currentPrice - Prix actuel
     * @returns {Object} - Recommandation d'achat
     */
    shouldBuyNow(destinationId, currentPrice) {
        const scoreData = this.calculateQualityScore(destinationId, currentPrice);
        
        // Récupérer la destination
        const destination = db.prepare('SELECT * FROM destinations WHERE id = ?').get(destinationId);
        
        if (!destination) {
            return { buy: false, reason: 'Destination introuvable' };
        }

        // Vérifier le prix maximum
        if (destination.max_price && currentPrice <= destination.max_price) {
            return {
                buy: true,
                reason: 'Prix cible atteint',
                urgency: 'high',
                score: scoreData.score
            };
        }

        // Vérifier le score qualité/prix
        if (scoreData.score >= 85) {
            return {
                buy: true,
                reason: 'Excellent prix historique',
                urgency: 'high',
                score: scoreData.score
            };
        }

        // Vérifier la proximité de la date de départ
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
     * Détecter une baisse significative de prix
     * @param {Number} destinationId - ID de la destination
     * @param {Number} currentPrice - Prix actuel
     * @returns {Object|null} - Info sur la baisse ou null
     */
    detectPriceDrop(destinationId, currentPrice) {
        // Récupérer le dernier prix
        const lastPrice = db.prepare(`
            SELECT price 
            FROM prices 
            WHERE destination_id = ? 
            ORDER BY checked_at DESC 
            LIMIT 1
        `).get(destinationId);

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
