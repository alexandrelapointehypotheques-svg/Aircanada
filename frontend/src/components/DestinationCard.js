import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import PriceChart from './PriceChart';
import './DestinationCard.css';

function DestinationCard({ destination, onDelete, onCheckPrice, onRefresh }) {
    const [showChart, setShowChart] = useState(false);
    
    const {
        id,
        origin,
        destination: dest,
        departure_date,
        return_date,
        max_price,
        enable_alerts,
        latestPrice,
        avgPrice,
        minPrice,
        maxPrice: histMaxPrice
    } = destination;

    // Calculer le score qualité/prix
    const getQualityScore = () => {
        if (!latestPrice || !avgPrice) return null;
        const percentageBelowAvg = ((avgPrice - latestPrice) / avgPrice) * 100;
        
        if (percentageBelowAvg >= 20) return { score: 10, label: 'Excellent', color: '#10b981' };
        if (percentageBelowAvg >= 10) return { score: 8, label: 'Très bon', color: '#3b82f6' };
        if (percentageBelowAvg >= 0) return { score: 6, label: 'Bon', color: '#f59e0b' };
        if (percentageBelowAvg >= -10) return { score: 4, label: 'Moyen', color: '#ef4444' };
        return { score: 2, label: 'Élevé', color: '#991b1b' };
    };

    const qualityScore = getQualityScore();

    // Déterminer la recommandation
    const getRecommendation = () => {
        if (!latestPrice || !avgPrice) return null;
        
        const percentageBelowAvg = ((avgPrice - latestPrice) / avgPrice) * 100;
        const underBudget = max_price && latestPrice < max_price;
        
        if (percentageBelowAvg >= 15 || (underBudget && percentageBelowAvg >= 10)) {
            return { text: '🎯 Acheter maintenant!', color: '#10b981', urgent: true };
        } else if (percentageBelowAvg >= 5) {
            return { text: '✅ Bon moment', color: '#3b82f6', urgent: false };
        } else {
            return { text: '⏳ Attendre', color: '#f59e0b', urgent: false };
        }
    };

    const recommendation = getRecommendation();

    return (
        <div className={`destination-card ${recommendation?.urgent ? 'urgent' : ''}`}>
            <div className="card-header">
                <div className="route-info">
                    <h3>{origin} ✈️ {dest}</h3>
                    <p className="dates">
                        {format(new Date(departure_date), 'dd MMM yyyy', { locale: fr })}
                        {return_date && ` - ${format(new Date(return_date), 'dd MMM yyyy', { locale: fr })}`}
                    </p>
                </div>
                {qualityScore && (
                    <div className="quality-badge" style={{ background: qualityScore.color }}>
                        <span className="score">{qualityScore.score}/10</span>
                        <span className="label">{qualityScore.label}</span>
                    </div>
                )}
            </div>

            <div className="card-body">
                <div className="price-info">
                    {latestPrice ? (
                        <>
                            <div className="current-price">
                                <span className="label">Prix actuel</span>
                                <span className="price">{latestPrice.toFixed(0)} $</span>
                            </div>
                            {avgPrice && (
                                <div className="price-stats">
                                    <div className="stat">
                                        <span className="label">Moyenne</span>
                                        <span className="value">{avgPrice.toFixed(0)} $</span>
                                    </div>
                                    <div className="stat">
                                        <span className="label">Min</span>
                                        <span className="value green">{minPrice?.toFixed(0) || 'N/A'} $</span>
                                    </div>
                                    <div className="stat">
                                        <span className="label">Max</span>
                                        <span className="value red">{histMaxPrice?.toFixed(0) || 'N/A'} $</span>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="no-price">Aucun prix disponible</p>
                    )}
                </div>

                {max_price && (
                    <div className="budget-info">
                        <span className="label">Budget max:</span>
                        <span className={`budget ${latestPrice && latestPrice < max_price ? 'under' : 'over'}`}>
                            {max_price.toFixed(0)} $
                            {latestPrice && latestPrice < max_price && 
                                ` (économie: ${(max_price - latestPrice).toFixed(0)} $)`
                            }
                        </span>
                    </div>
                )}

                {recommendation && (
                    <div className="recommendation" style={{ background: `${recommendation.color}20`, borderColor: recommendation.color }}>
                        <strong style={{ color: recommendation.color }}>{recommendation.text}</strong>
                    </div>
                )}

                <div className="alert-status">
                    <span className={`status-badge ${enable_alerts ? 'active' : 'inactive'}`}>
                        {enable_alerts ? '🔔 Alertes actives' : '🔕 Alertes désactivées'}
                    </span>
                </div>
            </div>

            <div className="card-actions">
                <button 
                    className="btn btn-small btn-secondary"
                    onClick={() => setShowChart(!showChart)}
                >
                    {showChart ? '📉 Masquer graphique' : '📊 Voir graphique'}
                </button>
                <button 
                    className="btn btn-small btn-primary"
                    onClick={() => onCheckPrice(id)}
                >
                    🔄 Vérifier prix
                </button>
                <a 
                    href="https://www.aircanada.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-small btn-success"
                >
                    ✈️ Réserver
                </a>
                <button 
                    className="btn btn-small btn-danger"
                    onClick={() => onDelete(id)}
                >
                    🗑️
                </button>
            </div>

            {showChart && (
                <div className="chart-container">
                    <PriceChart destinationId={id} />
                </div>
            )}
        </div>
    );
}

export default DestinationCard;
