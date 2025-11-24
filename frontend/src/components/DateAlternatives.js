import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { destinationAPI } from '../services/api';
import './DateAlternatives.css';

function DateAlternatives({ destinationId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadAlternatives = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await destinationAPI.getAlternatives(destinationId, 3);
            setData(response.data.data);
        } catch (err) {
            console.error('Erreur chargement alternatives:', err);
            setError('Impossible de charger les dates alternatives');
        } finally {
            setLoading(false);
        }
    }, [destinationId]);

    useEffect(() => {
        loadAlternatives();
    }, [loadAlternatives]);

    const formatDate = (dateStr) => {
        try {
            return format(new Date(dateStr), 'EEE d MMM yyyy', { locale: fr });
        } catch {
            return dateStr;
        }
    };

    const formatPrice = (price) => {
        if (!price) return 'N/A';
        return `${price.toFixed(0)} $`;
    };

    if (loading) {
        return (
            <div className="date-alternatives-modal">
                <div className="date-alternatives-content">
                    <div className="loading-alternatives">
                        <div className="spinner"></div>
                        <p>Recherche des dates alternatives...</p>
                        <p className="loading-note">Cela peut prendre quelques secondes</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="date-alternatives-modal">
                <div className="date-alternatives-content">
                    <div className="error-message">
                        <p>{error}</p>
                        <button className="btn btn-primary" onClick={onClose}>Fermer</button>
                    </div>
                </div>
            </div>
        );
    }

    const availableDates = data?.alternatives?.filter(a => a.available) || [];
    const unavailableDates = data?.alternatives?.filter(a => !a.available) || [];

    return (
        <div className="date-alternatives-modal">
            <div className="date-alternatives-content">
                <div className="modal-header">
                    <h3>Dates alternatives</h3>
                    <p className="route-info">
                        {data?.destination?.origin} → {data?.destination?.destination}
                    </p>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="alternatives-body">
                    {availableDates.length === 0 ? (
                        <div className="no-flights">
                            <p>Aucun vol Air Canada trouve pour ces dates</p>
                            <p className="hint">Essayez de modifier vos dates de voyage</p>
                        </div>
                    ) : (
                        <>
                            <div className="best-price-banner">
                                <span className="best-label">Meilleur prix</span>
                                <span className="best-date">{formatDate(availableDates[0]?.date)}</span>
                                <span className="best-price">{formatPrice(availableDates[0]?.price)}</span>
                            </div>

                            <div className="dates-list">
                                <h4>Tous les vols disponibles</h4>
                                {availableDates.map((alt, index) => (
                                    <div
                                        key={alt.date}
                                        className={`date-item ${alt.isBestPrice ? 'best' : ''} ${alt.isOriginalDate ? 'original' : ''}`}
                                    >
                                        <div className="date-info">
                                            <span className="date">{formatDate(alt.date)}</span>
                                            {alt.returnDate && (
                                                <span className="return-date">
                                                    Retour: {formatDate(alt.returnDate)}
                                                </span>
                                            )}
                                            {alt.isOriginalDate && (
                                                <span className="original-badge">Date choisie</span>
                                            )}
                                            {alt.isBestPrice && (
                                                <span className="best-badge">Meilleur prix</span>
                                            )}
                                        </div>
                                        <div className="price-info">
                                            <span className={`price ${alt.isBestPrice ? 'best-price' : ''}`}>
                                                {formatPrice(alt.price)}
                                            </span>
                                            {index > 0 && availableDates[0]?.price && (
                                                <span className="price-diff">
                                                    +{(alt.price - availableDates[0].price).toFixed(0)} $
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {unavailableDates.length > 0 && (
                                <div className="unavailable-dates">
                                    <h4>Dates sans vol Air Canada</h4>
                                    <div className="unavailable-list">
                                        {unavailableDates.map(alt => (
                                            <span key={alt.date} className="unavailable-date">
                                                {formatDate(alt.date)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Fermer
                    </button>
                    <button className="btn btn-primary" onClick={loadAlternatives}>
                        Actualiser
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DateAlternatives;
