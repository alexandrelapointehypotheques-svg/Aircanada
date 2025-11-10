═══════════════════════════════════════════════════════════════════
  🛫 AIR CANADA PRICE TRACKER - GUIDE DE DÉMARRAGE RAPIDE
═══════════════════════════════════════════════════════════════════

📦 CONTENU DU PACKAGE:
  • Code source complet (Frontend + Backend)
  • Base de données pré-configurée
  • Script de démarrage automatique
  • Documentation complète

═══════════════════════════════════════════════════════════════════

🚀 DÉMARRAGE EN 3 ÉTAPES:

1️⃣  EXTRAIRE LE ZIP
   • Extraire Aircanada-complete.zip dans un dossier
   • Ouvrir un terminal dans le dossier "Aircanada"

2️⃣  RENDRE LE SCRIPT EXÉCUTABLE (une seule fois)
   chmod +x start.sh

3️⃣  LANCER L'APPLICATION
   ./start.sh

   ➜ Le backend démarre sur http://localhost:5000
   ➜ Le frontend démarre sur http://localhost:3000
   ➜ Votre navigateur s'ouvre automatiquement

═══════════════════════════════════════════════════════════════════

📋 PRÉREQUIS:

✅ Node.js version 18 ou supérieure
   Télécharger: https://nodejs.org/

✅ npm (inclus avec Node.js)

═══════════════════════════════════════════════════════════════════

🔑 CONFIGURATION DE LA CLÉ API (OPTIONNEL):

Pour activer les recherches de prix réelles:

1. Créer un compte gratuit: https://duffel.com
2. Obtenir une clé API de test
3. Éditer le fichier: backend/.env
4. Remplacer: YOUR_DUFFEL_TEST_KEY_HERE
   Par votre vraie clé: duffel_test_xxxxxxxxxxxxx

Sans clé API:
  ✅ L'interface fonctionne
  ✅ Gestion des destinations fonctionne
  ❌ Recherche de prix désactivée

═══════════════════════════════════════════════════════════════════

⏹️  ARRÊTER L'APPLICATION:

   Appuyer sur Ctrl+C dans le terminal

═══════════════════════════════════════════════════════════════════

🆘 DÉPANNAGE:

Erreur "command not found: node"
   ➜ Installer Node.js depuis https://nodejs.org/

Erreur "port 3000/5000 already in use"
   ➜ Un autre programme utilise ce port
   ➜ Fermer l'autre application ou changer le port

Erreur "Cannot find module"
   ➜ Supprimer node_modules dans backend/ et frontend/
   ➜ Relancer ./start.sh

═══════════════════════════════════════════════════════════════════

📂 STRUCTURE DU PROJET:

Aircanada/
├── backend/              # API Node.js + Express
│   ├── src/
│   │   ├── server.js     # Point d'entrée
│   │   ├── controllers/  # Logique métier
│   │   ├── services/     # Services (Duffel, Twilio, etc)
│   │   └── db/           # Base de données
│   └── .env              # Configuration (clés API)
│
├── frontend/             # Interface React
│   ├── src/
│   │   ├── components/   # Composants UI
│   │   └── services/     # API client
│   └── public/           # Fichiers statiques
│
├── start.sh              # 🚀 Script de démarrage
├── INSTALLATION.md       # Guide complet
└── README.md             # Documentation

═══════════════════════════════════════════════════════════════════

📚 UTILISATION:

1. Ajouter des destinations à surveiller
   • Origine: YUL (Montréal)
   • Destination: CUN (Cancún), CDG (Paris), etc.
   • Dates de voyage
   • Budget maximum

2. L'application vérifie automatiquement les prix:
   • 6h00 tous les matins
   • 18h00 tous les soirs

3. Vous recevez des alertes quand:
   • Le prix baisse de plus de 15%
   • Le prix est excellent (score ≥ 85/100)
   • Le prix atteint votre budget

═══════════════════════════════════════════════════════════════════

🔗 LIENS UTILES:

• Documentation API: docs/API.md
• Guide d'installation: INSTALLATION.md
• Duffel API: https://duffel.com
• Node.js: https://nodejs.org

═══════════════════════════════════════════════════════════════════

✈️ BON VOYAGE ET BONNES ÉCONOMIES!

═══════════════════════════════════════════════════════════════════
