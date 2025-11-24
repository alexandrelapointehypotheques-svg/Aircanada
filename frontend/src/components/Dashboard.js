import React, { useState, useEffect } from 'react';
import { destinationAPI, systemAPI } from '../services/api';
import DestinationCard from './DestinationCard';
import AddDestinationForm from './AddDestinationForm';
import StatsOverview from './StatsOverview';
import './Dashboard.css';

function Dashboard() {
    const [destinations, setDestinations] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
        // Rafraîchir toutes les 5 minutes
        const interval = setInterval(loadData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const [destResponse, statsResponse] = await Promise.all([
                destinationAPI.getAll(),
                systemAPI.getStats()
            ]);
            setDestinations(destResponse.data.data);
            setStats(statsResponse.data.data);
        } catch (error) {
            console.error('Erreur chargement données:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshAll = async () => {
        setRefreshing(true);
        try {
            await systemAPI.checkAllPrices();
            alert('Vérification des prix démarrée! Rafraîchissez dans 30 secondes.');
        } catch (error) {
            alert('Erreur lors de la vérification des prix');
        } finally {
            setRefreshing(false);
        }
    };

    const handleAddDestination = async (data) => {
        try {
            // Convertir les noms de champs pour le backend
            const backendData = {
                origin: data.origin,
                destination: data.destination,
                departure_date: data.departureDate,
                return_date: data.returnDate || null,
                max_price: data.maxPrice ? parseFloat(data.maxPrice) : null
            };
            await destinationAPI.create(backendData);
            setShowAddForm(false);
            loadData();
            alert('Destination ajoutée avec succès!');
        } catch (error) {
            alert('Erreur lors de l\'ajout de la destination');
        }
    };

    const handleDeleteDestination = async (id) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette destination?')) {
            return;
        }
        try {
            await destinationAPI.delete(id);
            loadData();
            alert('Destination supprimée');
        } catch (error) {
            alert('Erreur lors de la suppression');
        }
    };

    const handleCheckPrice = async (id) => {
        try {
            await destinationAPI.checkPrice(id);
            setTimeout(loadData, 2000); // Recharger après 2 secondes
            alert('Prix vérifié! Rafraîchissement...');
        } catch (error) {
            alert('Erreur lors de la vérification du prix');
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Chargement...</p>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-content">
                    <h1>🛫 Air Canada Price Tracker</h1>
                    <p className="subtitle">Suivez et achetez au meilleur moment</p>
                </div>
                <div className="header-actions">
                    <button 
                        className="btn btn-secondary"
                        onClick={handleRefreshAll}
                        disabled={refreshing}
                    >
                        {refreshing ? '⏳ Vérification...' : '🔄 Vérifier tous les prix'}
                    </button>
                    <button 
                        className="btn btn-primary"
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        {showAddForm ? '❌ Annuler' : '➕ Ajouter destination'}
                    </button>
                </div>
            </header>

            {stats && <StatsOverview stats={stats} />}

            {showAddForm && (
                <div className="add-form-container">
                    <AddDestinationForm 
                        onSubmit={handleAddDestination}
                        onCancel={() => setShowAddForm(false)}
                    />
                </div>
            )}

            <div className="destinations-container">
                <h2>Mes destinations surveillées ({destinations.length})</h2>
                
                {destinations.length === 0 ? (
                    <div className="empty-state">
                        <p>🏝️ Aucune destination surveillée</p>
                        <p>Ajoutez votre première destination pour commencer!</p>
                        <button 
                            className="btn btn-primary"
                            onClick={() => setShowAddForm(true)}
                        >
                            ➕ Ajouter ma première destination
                        </button>
                    </div>
                ) : (
                    <div className="destinations-grid">
                        {destinations.map(dest => (
                            <DestinationCard
                                key={dest.id}
                                destination={dest}
                                onDelete={handleDeleteDestination}
                                onCheckPrice={handleCheckPrice}
                                onRefresh={loadData}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
