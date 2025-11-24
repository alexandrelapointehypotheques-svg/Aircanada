import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Intercepteur pour gérer les erreurs globalement
api.interceptors.response.use(
    response => response,
    error => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export const destinationAPI = {
    // Obtenir toutes les destinations
    getAll: () => api.get('/destinations'),
    
    // Obtenir une destination par ID
    getById: (id) => api.get(`/destinations/${id}`),
    
    // Créer une nouvelle destination
    create: (data) => api.post('/destinations', data),
    
    // Mettre à jour une destination
    update: (id, data) => api.put(`/destinations/${id}`, data),
    
    // Supprimer une destination
    delete: (id) => api.delete(`/destinations/${id}`),
    
    // Vérifier le prix maintenant
    checkPrice: (id) => api.post(`/destinations/${id}/check-price`),
    
    // Obtenir l'historique des prix
    getPriceHistory: (id, limit = 100) => api.get(`/destinations/${id}/prices`, { params: { limit } }),
    
    // Obtenir les meilleures offres
    getBestDeals: () => api.get('/destinations/best-deals'),

    // Obtenir les dates alternatives avec prix
    getAlternatives: (id, days = 3) => api.get(`/destinations/${id}/alternatives`, { params: { days } })
};

export const alertAPI = {
    // Obtenir toutes les alertes
    getAll: (params) => api.get('/alerts', { params }),
    
    // Obtenir les alertes pour une destination
    getByDestination: (destinationId, limit = 50) => 
        api.get('/alerts', { params: { destinationId, limit } })
};

export const settingsAPI = {
    // Obtenir les paramètres
    get: () => api.get('/settings'),
    
    // Mettre à jour les paramètres
    update: (data) => api.put('/settings', data)
};

export const systemAPI = {
    // Vérifier tous les prix manuellement
    checkAllPrices: () => api.post('/check-all-prices'),
    
    // Test SMS
    testSMS: () => api.post('/test-sms'),
    
    // Test Email
    testEmail: () => api.post('/test-email'),
    
    // Statistiques globales
    getStats: () => api.get('/stats'),
    
    // Health check
    health: () => api.get('/health')
};

export default api;
