#!/bin/bash

echo "🛫 Air Canada Price Tracker - Démarrage"
echo "========================================"
echo ""

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    echo "Installe Node.js depuis https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Backend
echo "📦 Installation du backend..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi

# Vérifier .env
if [ ! -f ".env" ]; then
    echo "⚠️  Fichier .env manquant"
    echo "Copie .env.example vers .env et configure tes clés API"
    cp .env.example .env
    echo "📝 Édite backend/.env avec tes clés maintenant"
    exit 1
fi

# Initialiser DB
if [ ! -f "../database/tracker.db" ]; then
    echo "🗄️  Initialisation de la base de données..."
    npm run init-db
fi

echo ""
echo "🚀 Démarrage du backend..."
npm run dev &
BACKEND_PID=$!

# Attendre que le backend démarre
sleep 3

# Frontend
cd ../frontend
echo ""
echo "📦 Installation du frontend..."
if [ ! -d "node_modules" ]; then
    npm install
fi

echo ""
echo "🎨 Démarrage du frontend..."
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Application démarrée!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000"
echo ""
echo "💡 Appuie sur Ctrl+C pour arrêter"
echo ""

# Attendre
wait
