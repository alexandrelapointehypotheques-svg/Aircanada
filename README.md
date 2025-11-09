# 🛫 Air Canada Price Tracker

Application complète de surveillance des prix de vols Air Canada avec alertes automatiques SMS.

## 📋 Fonctionnalités

- ✈️ Surveillance automatique des prix de vols (2x par jour)
- 📊 Graphiques historiques des prix
- 📱 Alertes SMS via Twilio quand bon moment d'acheter
- 🎯 Score qualité/prix intelligent
- 🌍 Gestion de multiples destinations
- 📈 Analyse de tendances et recommandations

## 🚀 Stack Technique

**Frontend:**
- React 18
- Chart.js pour graphiques
- Tailwind CSS
- Axios pour API calls

**Backend:**
- Node.js + Express
- SQLite (base de données locale)
- node-cron (tâches automatisées)
- Duffel API (prix de vols)
- Twilio (alertes SMS)

## 📦 Installation Rapide

```bash
# Clone le repo
git clone https://github.com/TON-USERNAME/air-canada-price-tracker.git
cd air-canada-price-tracker

# Backend
cd backend
npm install
cp .env.example .env
# Éditer .env avec tes clés API
npm run init-db
npm run dev

# Frontend (nouveau terminal)
cd ../frontend
npm install
npm start
```

## 🔧 Configuration

Créer `backend/.env`:

```env
DUFFEL_API_KEY=duffel_test_xxx
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890
YOUR_PHONE_NUMBER=+1514XXXXXXX
PORT=5000
NODE_ENV=development
```

## 📱 Utilisation

1. Ouvrir http://localhost:3000
2. Ajouter une destination (ex: YUL → CUN, dates)
3. Le système vérifie les prix automatiquement
4. Recevoir des SMS quand bon moment d'acheter

## 🚀 Déploiement

**Frontend:** Vercel (gratuit)
**Backend:** Render.com ou Railway (gratuit)

Voir documentation complète dans `/docs`

## 👨‍💻 Auteur

Alexandre Lapointe - alexandre.lapointe@planiprêt.com

## 📄 Licence

MIT
