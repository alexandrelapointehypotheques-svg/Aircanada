require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const destinationController = require('./controllers/destinationController');
const priceChecker = require('./cron/priceChecker');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes - Destinations
app.get('/api/destinations', destinationController.getAll.bind(destinationController));
app.get('/api/destinations/:id', destinationController.getById.bind(destinationController));
app.post('/api/destinations', destinationController.create.bind(destinationController));
app.put('/api/destinations/:id', destinationController.update.bind(destinationController));
app.delete('/api/destinations/:id', destinationController.delete.bind(destinationController));

// Routes - System
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Initialisation de la vérification automatique des prix
// Exécution à 6h et 18h tous les jours
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('0 6,18 * * *', () => {
    console.log('⏰ Vérification automatique des prix démarrée...');
    priceChecker.checkAllPrices().catch(error => {
      console.error('Erreur lors de la vérification automatique:', error);
    });
  });

  console.log('✅ Vérifications automatiques programmées (6h et 18h)');
}

// Gestion des routes non trouvées
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Gestion globale des erreurs
app.use((error, req, res, next) => {
  console.error('Erreur serveur:', error);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 API disponible sur: http://localhost:${PORT}/api`);
});

module.exports = app;
