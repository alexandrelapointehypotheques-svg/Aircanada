# 🚀 Guide d'Installation - Air Canada Price Tracker

## 📋 Prérequis

- **Node.js** version 18 ou supérieure
- Un compte **Duffel API** (gratuit) pour récupérer les prix des vols
- (Optionnel) Un compte **Twilio** pour les alertes SMS

---

## 🔑 APIs Nécessaires

### 1. **Duffel API** (OBLIGATOIRE)

L'API Duffel permet de récupérer les prix des vols Air Canada en temps réel.

**Comment obtenir votre clé API:**

1. Créez un compte gratuit sur: https://duffel.com
2. Connectez-vous à votre dashboard Duffel
3. Allez dans **API Keys** > **Create API Key**
4. Sélectionnez **Test Mode** (gratuit, parfait pour commencer)
5. Copiez votre clé (format: `duffel_test_xxxxxxxxxxxxx`)

**Coût:**
- Mode Test: **GRATUIT** (pour développement et tests)
- Mode Production: Payant par recherche de vol

---

### 2. **Twilio API** (OPTIONNEL)

Pour recevoir des alertes SMS quand les prix baissent.

**Comment obtenir vos credentials:**

1. Créez un compte gratuit: https://www.twilio.com/try-twilio
2. Dans le dashboard, notez:
   - Account SID
   - Auth Token
   - Votre numéro Twilio (format: +1234567890)
3. Vérifiez votre numéro de téléphone personnel

**Coût:**
- Crédit gratuit de 15$ USD à l'inscription
- ~0.01$ USD par SMS ensuite

**Note:** Si vous ne configurez pas Twilio, les alertes s'afficheront dans la console du serveur.

---

## 📦 Installation

### Étape 1: Configurer le Backend

```bash
cd backend

# Copier le fichier d'exemple de configuration
cp .env.example .env

# Modifier le fichier .env avec vos vraies clés API
nano .env  # ou utilisez votre éditeur préféré

# Installer les dépendances
npm install

# Initialiser la base de données
npm run init-db
```

**Fichier `.env` à remplir:**

```env
# OBLIGATOIRE: Votre clé API Duffel
DUFFEL_API_KEY=duffel_test_votre_vraie_cle_ici

# Configuration serveur (laisser par défaut)
PORT=5000
NODE_ENV=development

# OPTIONNEL: Twilio pour les SMS (laisser vide si pas utilisé)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=votre_auth_token_ici
TWILIO_PHONE_NUMBER=+1234567890
YOUR_PHONE_NUMBER=+15141234567
```

---

### Étape 2: Configurer le Frontend

```bash
cd ../frontend

# Copier le fichier d'exemple
cp .env.example .env

# Installer les dépendances
npm install
```

Le fichier `.env` frontend peut rester tel quel (valeur par défaut est correcte).

---

## ▶️ Démarrage de l'Application

### Option A: Démarrage Automatique (Recommandé)

Depuis la racine du projet:

```bash
chmod +x start.sh
./start.sh
```

Le script va:
1. Installer les dépendances backend
2. Initialiser la base de données
3. Démarrer le serveur backend (port 5000)
4. Installer les dépendances frontend
5. Démarrer l'interface React (port 3000)

---

### Option B: Démarrage Manuel

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

---

## 🌐 Accès à l'Application

- **Interface utilisateur:** http://localhost:3000
- **API Backend:** http://localhost:5000/api

---

## ✅ Vérification de l'Installation

### Test du Backend

```bash
# Vérifier que le serveur répond
curl http://localhost:5000/api/health

# Réponse attendue:
{
  "status": "OK",
  "timestamp": "2025-11-09T...",
  "environment": "development"
}
```

### Test du Frontend

1. Ouvrez http://localhost:3000
2. Vous devriez voir le dashboard de suivi des prix
3. Essayez d'ajouter une destination (ex: YUL → CUN)

---

## 🎯 Utilisation

### Ajouter un Vol à Surveiller

1. Dans le formulaire "Ajouter une destination":
   - **Origine:** YUL (Montréal)
   - **Destination:** CUN (Cancún)
   - **Date de départ:** Choisissez une date future
   - **Date de retour:** Choisissez une date après le départ
   - **Prix maximum:** Ex: 600 CAD
2. Cliquez sur **Ajouter**

### Vérification Automatique des Prix

L'application vérifie automatiquement les prix:
- **6h00** tous les matins
- **18h00** tous les soirs

Vous pouvez aussi forcer une vérification manuelle en cliquant sur "Vérifier maintenant" dans l'interface.

### Alertes

Vous recevrez une alerte (SMS ou console) quand:
- Le prix baisse de plus de 15%
- Le prix est excellent (score ≥ 85/100)
- Le prix atteint votre budget maximum

---

## 🔧 Dépannage

### Erreur "DUFFEL_API_KEY not configured"

➜ Vérifiez que vous avez bien copié votre clé API dans `backend/.env`

### Erreur de connexion au backend

➜ Vérifiez que le backend tourne sur le port 5000:
```bash
curl http://localhost:5000/api/health
```

### Pas de prix trouvé pour un vol

➜ Vérifiez que:
- La date de départ est dans le futur (minimum 3 jours)
- Les codes IATA sont corrects (YUL, YYZ, CUN, etc.)
- Votre clé Duffel API est valide

### Les SMS ne fonctionnent pas

➜ C'est normal si vous n'avez pas configuré Twilio. Les alertes apparaissent quand même dans la console du serveur backend.

---

## 📚 Codes IATA des Aéroports Canadiens

- **YUL** - Montréal (Trudeau)
- **YYZ** - Toronto (Pearson)
- **YVR** - Vancouver
- **YYC** - Calgary
- **YOW** - Ottawa
- **YQB** - Québec

## 🌴 Destinations Populaires

- **CUN** - Cancún, Mexique
- **PUJ** - Punta Cana, République Dominicaine
- **MBJ** - Montego Bay, Jamaïque
- **CDG** - Paris, France
- **BCN** - Barcelone, Espagne
- **FCO** - Rome, Italie

---

## 💡 Conseils pour Économiser

1. **Surveillez plusieurs dates** - Les prix varient beaucoup selon le jour
2. **Réservez à l'avance** - Généralement 3-8 semaines avant le départ
3. **Évitez les jours fériés** - Les prix sont plus élevés
4. **Utilisez le score qualité** - Un score > 80 est généralement un bon deal
5. **Activez les alertes SMS** - Pour ne jamais rater une bonne affaire

---

## 🆘 Support

Pour toute question ou problème:
1. Vérifiez ce guide d'installation
2. Consultez les logs du serveur backend
3. Vérifiez la console du navigateur pour les erreurs frontend

Bon voyage! ✈️
