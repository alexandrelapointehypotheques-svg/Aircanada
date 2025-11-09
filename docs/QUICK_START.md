# 🚀 Guide de démarrage rapide

## Installation en 5 minutes

### 1. Prérequis

- Node.js 18+ installé
- Compte Twilio (gratuit) pour SMS
- Clé API Duffel (plan gratuit disponible)

### 2. Clone et installation

```bash
git clone https://github.com/TON-USERNAME/air-canada-price-tracker.git
cd air-canada-price-tracker
```

### 3. Configuration Backend

```bash
cd backend
npm install
cp .env.example .env
```

Édite `.env` avec tes clés:

```env
PORT=5000
DUFFEL_API_KEY=duffel_test_ton_api_key
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=ton_token
TWILIO_PHONE_NUMBER=+15551234567
ADMIN_PHONE_NUMBER=+15149876543
SMTP_USER=ton_email@gmail.com
SMTP_PASS=ton_mot_de_passe
```

### 4. Initialiser la base de données

```bash
npm run init-db
```

Tu verras:
```
✅ Base de données initialisée avec succès!
📍 Destinations de test ajoutées:
   - YUL → CUN (Cancun): 15-22 Déc 2025
   - YUL → AJA (Corse): 1-15 Juin 2026
```

### 5. Démarrer le backend

```bash
npm run dev
```

Tu verras:
```
==================================================
🛫 AIR CANADA PRICE TRACKER - Backend
==================================================
✅ Serveur démarré sur le port 5000
🌐 URL: http://localhost:5000
📝 Mode: development
==================================================

⏰ Initialisation des cron jobs...
✅ Cron jobs initialisés:
   - Matin: 0 6 * * *
   - Soir: 0 18 * * *
```

### 6. Configuration Frontend

**Nouvelle fenêtre de terminal:**

```bash
cd frontend
npm install
npm start
```

L'application s'ouvre automatiquement sur `http://localhost:3000`

## ✅ Vérification

### Test SMS
```bash
curl -X POST http://localhost:5000/api/test-sms
```

### Test Email
```bash
curl -X POST http://localhost:5000/api/test-email
```

### Voir les destinations
```bash
curl http://localhost:5000/api/destinations
```

## 📱 Utilisation

### Dans l'interface web:

1. **Ajouter une destination**
   - Clique sur "➕ Ajouter destination"
   - Remplis le formulaire
   - Active les alertes

2. **Voir les prix**
   - Chaque carte montre le prix actuel
   - Score qualité/prix (1-10)
   - Recommandation "Acheter" ou "Attendre"

3. **Graphiques**
   - Clique sur "📊 Voir graphique"
   - Historique des prix
   - Tendances

4. **Vérification manuelle**
   - Bouton "🔄 Vérifier prix"
   - Ou "🔄 Vérifier tous les prix" en haut

## 🤖 Automatisation

Les prix sont vérifiés automatiquement:
- 6h AM
- 18h (6 PM)

Tu recevras des alertes SMS/Email quand:
- Prix baisse de 15%+
- Prix sous ton budget maximum
- Prix excellent (20%+ sous moyenne)

## 🎯 Destinations de test

L'application est préchargée avec:

1. **YUL → CUN (Cancun)**
   - Date: 15-22 Déc 2025
   - Budget: 800$

2. **YUL → AJA (Corse)**
   - Date: 1-15 Juin 2026
   - Budget: 1200$

## 🐛 Dépannage

### Erreur "Cannot connect to database"
```bash
cd backend
npm run init-db
```

### Erreur "API key invalid"
Vérifie que ta clé Duffel est correcte dans `.env`

### Pas de SMS reçus
- Vérifie ton TWILIO_ACCOUNT_SID
- Vérifie ton numéro est vérifié sur Twilio

### Frontend ne se connecte pas au backend
- Vérifie que le backend tourne sur port 5000
- Vérifie REACT_APP_API_URL dans frontend/.env

## 📚 Prochaines étapes

- Lis [API.md](./API.md) pour l'API complète
- Configure le déploiement sur Vercel/Render
- Ajoute tes vraies destinations
- Personnalise les seuils d'alerte

## 💡 Conseils

1. **Maximise les économies**
   - Ajoute plusieurs destinations similaires
   - Compare les dates flexibles
   - Active toujours les alertes

2. **Meilleurs moments pour réserver**
   - Mardi/mercredi généralement moins cher
   - 6-8 semaines avant départ
   - Hors saison pour destinations populaires

3. **Utilise les graphiques**
   - Repère les tendances
   - Identifie les patterns saisonniers
   - Décide quand acheter

## 🎉 C'est tout!

Tu es prêt à tracker et économiser sur tes vols Air Canada! ✈️
