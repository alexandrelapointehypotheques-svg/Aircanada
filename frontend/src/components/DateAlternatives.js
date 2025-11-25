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

    const getStopsLabel = (alt) => {
        if (!alt.available) return null;
        if (alt.isDirect) return 'Vol direct';
        if (alt.totalStops === 1) return '1 escale';
        return `${alt.totalStops} escales`;
    };

    const getStopsClass = (alt) => {
        if (!alt.available) return '';
        if (alt.isDirect) return 'direct';
        return 'with-stops';
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

    // Compter les vols directs
    const directFlights = availableDates.filter(a => a.isDirect);

    return (
        <div className="date-alternatives-modal">
            <div className="date-alternatives-content">
                <div className="modal-header">
                    <h3>Dates alternatives</h3>
                    <p className="route-info">
                        {data?.destination?.origin} - {data?.destination?.destination}
                    </p>
                    <button className="close-btn" onClick={onClose}>x</button>
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
                                <div className="best-main">
                                    <span className="best-label">Meilleur prix</span>
                                    <span className="best-date">{formatDate(availableDates[0]?.date)}</span>
                                </div>
                                <div className="best-details">
                                    <span className="best-price">{formatPrice(availableDates[0]?.price)}</span>
                                    <span className={`stops-badge ${getStopsClass(availableDates[0])}`}>
                                        {getStopsLabel(availableDates[0])}
                                    </span>
                                </div>
                            </div>

                            {/* Resume des vols */}
                            <div className="flights-summary">
                                <span className="summary-item">
                                    <strong>{availableDates.length}</strong> vols disponibles
                                </span>
                                <span className="summary-item direct">
                                    <strong>{directFlights.length}</strong> vols directs
                                </span>
                                <span className="summary-item with-stops">
                                    <strong>{availableDates.length - directFlights.length}</strong> avec escale
                                </span>
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
                                            <div className="flight-badges">
                                                {alt.isOriginalDate && (
                                                    <span className="original-badge">Date choisie</span>
                                                )}
                                                {alt.isBestPrice && (
                                                    <span className="best-badge">Meilleur prix</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flight-info">
                                            <span className={`stops-indicator ${getStopsClass(alt)}`}>
                                                {alt.isDirect ? (
                                                    <>
                                                        <span className="stops-icon">&#10003;</span>
                                                        <span>Direct</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="stops-icon">&#8644;</span>
                                                        <span>{alt.totalStops} escale{alt.totalStops > 1 ? 's' : ''}</span>
                                                    </>
                                                )}
                                            </span>
                                            {alt.duration && (
                                                <span className="duration">{alt.duration}</span>
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
