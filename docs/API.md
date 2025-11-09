# Documentation API - Air Canada Price Tracker

## Base URL

```
http://localhost:5000/api
```

## Endpoints

### Destinations

#### GET /destinations
Obtenir toutes les destinations surveillées

**Réponse:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "origin": "YUL",
      "destination": "CUN",
      "departure_date": "2025-12-15",
      "return_date": "2025-12-22",
      "max_price": 800,
      "enable_alerts": 1,
      "is_active": 1,
      "latestPrice": 650.00,
      "avgPrice": 720.50,
      "minPrice": 610.00,
      "maxPrice": 850.00
    }
  ]
}
```

#### GET /destinations/:id
Obtenir une destination spécifique avec historique

**Paramètres:**
- `id` (path) - ID de la destination

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "origin": "YUL",
    "destination": "CUN",
    "priceHistory": [...],
    "statistics": {
      "avg_price": 720.50,
      "min_price": 610.00,
      "max_price": 850.00
    }
  }
}
```

#### POST /destinations
Créer une nouvelle destination à surveiller

**Body:**
```json
{
  "origin": "YUL",
  "destination": "CUN",
  "departureDate": "2025-12-15",
  "returnDate": "2025-12-22",
  "maxPrice": 800,
  "enableAlerts": true
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Destination ajoutée avec succès",
  "data": {
    "id": 3,
    ...
  }
}
```

#### PUT /destinations/:id
Mettre à jour une destination

**Paramètres:**
- `id` (path) - ID de la destination

**Body:**
```json
{
  "maxPrice": 750,
  "enableAlerts": false
}
```

#### DELETE /destinations/:id
Supprimer (désactiver) une destination

**Paramètres:**
- `id` (path) - ID de la destination

**Réponse:**
```json
{
  "success": true,
  "message": "Destination supprimée"
}
```

#### POST /destinations/:id/check-price
Vérifier le prix maintenant pour une destination

**Paramètres:**
- `id` (path) - ID de la destination

**Réponse:**
```json
{
  "success": true,
  "message": "Prix vérifié",
  "data": {
    "price": 650.00,
    "checked_at": "2025-11-09T12:00:00Z"
  }
}
```

#### GET /destinations/:id/prices
Obtenir l'historique des prix

**Paramètres:**
- `id` (path) - ID de la destination
- `limit` (query, optionnel) - Nombre de résultats (défaut: 100)

**Réponse:**
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "id": 123,
      "price": 650.00,
      "currency": "CAD",
      "checked_at": "2025-11-09T12:00:00Z"
    }
  ]
}
```

#### GET /destinations/best-deals
Obtenir les meilleures offres actuelles

**Réponse:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "destination": {...},
      "currentPrice": 650,
      "avgPrice": 720,
      "percentageBelowAvg": 9.7,
      "underBudget": 150,
      "score": 19.7
    }
  ]
}
```

### Alertes

#### GET /alerts
Obtenir toutes les alertes

**Query Params:**
- `limit` (optionnel) - Nombre de résultats (défaut: 50)
- `destinationId` (optionnel) - Filtrer par destination

**Réponse:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": 1,
      "destination_id": 1,
      "alert_type": "sms",
      "price_before": 720,
      "price_after": 650,
      "percentage_drop": 9.7,
      "sent_at": "2025-11-09T12:00:00Z"
    }
  ]
}
```

### Paramètres

#### GET /settings
Obtenir les paramètres utilisateur

**Réponse:**
```json
{
  "success": true,
  "data": {
    "phone_number": "+15141234567",
    "email": "user@example.com",
    "alert_threshold": 15.0,
    "preferred_currency": "CAD"
  }
}
```

#### PUT /settings
Mettre à jour les paramètres

**Body:**
```json
{
  "phoneNumber": "+15141234567",
  "email": "user@example.com",
  "alertThreshold": 15.0,
  "preferredCurrency": "CAD"
}
```

### Système

#### POST /check-all-prices
Forcer la vérification de tous les prix

**Réponse:**
```json
{
  "success": true,
  "message": "Vérification des prix démarrée"
}
```

#### POST /test-sms
Envoyer un SMS de test

**Réponse:**
```json
{
  "success": true,
  "message": "SMS de test envoyé"
}
```

#### POST /test-email
Tester la connexion email

**Réponse:**
```json
{
  "success": true,
  "message": "Connexion email OK"
}
```

#### GET /stats
Obtenir les statistiques globales

**Réponse:**
```json
{
  "success": true,
  "data": {
    "totalDestinations": 5,
    "activeDestinations": 4,
    "totalAlerts": 23,
    "overallAvgPrice": "785.50",
    "alertsLast7Days": 3
  }
}
```

#### GET /health
Vérifier l'état de l'API

**Réponse:**
```json
{
  "success": true,
  "message": "API fonctionnelle",
  "timestamp": "2025-11-09T12:00:00Z",
  "version": "1.0.0"
}
```

## Codes d'erreur

- `200` - Succès
- `201` - Créé avec succès
- `400` - Mauvaise requête
- `404` - Non trouvé
- `500` - Erreur serveur

## Exemples avec cURL

### Ajouter une destination
```bash
curl -X POST http://localhost:5000/api/destinations \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "YUL",
    "destination": "CUN",
    "departureDate": "2025-12-15",
    "returnDate": "2025-12-22",
    "maxPrice": 800,
    "enableAlerts": true
  }'
```

### Obtenir toutes les destinations
```bash
curl http://localhost:5000/api/destinations
```

### Vérifier un prix
```bash
curl -X POST http://localhost:5000/api/destinations/1/check-price
```
