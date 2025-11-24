require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const destinationController = require('./controllers/destinationController');
const priceChecker = require('./cron/priceChecker');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Helper pour executer les requetes de maniere unifiee
async function execQuery(stmt, method, ...params) {
    const result = stmt[method](...params);
    return result instanceof Promise ? await result : result;
}

// Middleware
app.use(cors());
app.use(express.json());

// Routes - Destinations
app.get('/api/destinations', destinationController.getAll.bind(destinationController));
app.get('/api/destinations/:id', destinationController.getById.bind(destinationController));
app.post('/api/destinations', destinationController.create.bind(destinationController));
app.put('/api/destinations/:id', destinationController.update.bind(destinationController));
app.delete('/api/destinations/:id', destinationController.delete.bind(destinationController));

// Route - Historique des prix d'une destination
app.get('/api/destinations/:id/prices', async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 100;

        const stmt = db.prepare(`
            SELECT * FROM prices
            WHERE destination_id = ?
            ORDER BY checked_at DESC
            LIMIT ?
        `);
        const prices = await execQuery(stmt, 'all', id, limit);

        res.json({ success: true, data: prices });
    } catch (error) {
        console.error('Erreur getPriceHistory:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route - Verifier le prix d'une destination manuellement
app.post('/api/destinations/:id/check-price', async (req, res) => {
    try {
        const { id } = req.params;
        await priceChecker.checkSingleDestination(id);
        res.json({ success: true, message: 'Verification du prix lancee' });
    } catch (error) {
        console.error('Erreur checkPrice:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route - Rechercher les dates alternatives pour une destination
const duffelService = require('./services/duffelService');

app.get('/api/destinations/:id/alternatives', async (req, res) => {
    try {
        const { id } = req.params;
        const daysRange = parseInt(req.query.days) || 3;

        // Recuperer la destination
        const stmt = db.prepare('SELECT * FROM destinations WHERE id = ?');
        const destination = await execQuery(stmt, 'get', id);

        if (!destination) {
            return res.status(404).json({ success: false, error: 'Destination introuvable' });
        }

        // Rechercher les alternatives
        const alternatives = await duffelService.searchAlternativeDates({
            origin: destination.origin,
            destination: destination.destination,
            departureDate: destination.departure_date,
            returnDate: destination.return_date
        }, daysRange);

        res.json({
            success: true,
            data: {
                destination: {
                    origin: destination.origin,
                    destination: destination.destination,
                    originalDate: destination.departure_date,
                    returnDate: destination.return_date
                },
                alternatives
            }
        });
    } catch (error) {
        console.error('Erreur getAlternatives:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Routes - System
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Route - Statistiques globales
app.get('/api/stats', async (req, res) => {
    try {
        const destStmt = db.prepare('SELECT COUNT(*) as count FROM destinations WHERE is_active = 1');
        const destCount = await execQuery(destStmt, 'get');

        const priceStmt = db.prepare('SELECT COUNT(*) as count FROM prices');
        const priceCount = await execQuery(priceStmt, 'get');

        const alertStmt = db.prepare('SELECT COUNT(*) as count FROM alerts');
        const alertCount = await execQuery(alertStmt, 'get');

        const avgStmt = db.prepare(`
            SELECT AVG(price) as avg_price
            FROM prices
            WHERE checked_at >= datetime('now', '-7 days')
        `);
        const avgPrice = await execQuery(avgStmt, 'get');

        res.json({
            success: true,
            data: {
                destinations: destCount?.count || 0,
                totalPriceChecks: priceCount?.count || 0,
                alertsSent: alertCount?.count || 0,
                avgPriceLastWeek: avgPrice?.avg_price ? parseFloat(avgPrice.avg_price).toFixed(2) : null
            }
        });
    } catch (error) {
        console.error('Erreur getStats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route - Verifier tous les prix manuellement
app.post('/api/check-all-prices', async (req, res) => {
    try {
        priceChecker.checkAllPrices();
        res.json({ success: true, message: 'Verification de tous les prix lancee' });
    } catch (error) {
        console.error('Erreur checkAllPrices:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Initialisation de la verification automatique des prix
// Execution a 6h et 18h tous les jours
if (process.env.NODE_ENV !== 'test') {
    cron.schedule('0 6,18 * * *', () => {
        console.log('Verification automatique des prix demarree...');
        priceChecker.checkAllPrices().catch(error => {
            console.error('Erreur lors de la verification automatique:', error);
        });
    });

    console.log('Verifications automatiques programmees (6h et 18h)');
}

// Gestion des routes non trouvees
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvee' });
});

// Gestion globale des erreurs
app.use((error, req, res, next) => {
    console.error('Erreur serveur:', error);
    res.status(500).json({
        error: 'Erreur interne du serveur',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// Demarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur demarre sur le port ${PORT}`);
    console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API disponible sur: http://localhost:${PORT}/api`);
});

module.exports = app;
