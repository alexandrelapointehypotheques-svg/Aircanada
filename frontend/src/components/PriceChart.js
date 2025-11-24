import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { destinationAPI } from '../services/api';
import './PriceChart.css';

function PriceChart({ destinationId }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadPriceHistory = useCallback(async () => {
        try {
            const response = await destinationAPI.getPriceHistory(destinationId, 100);
            const history = response.data.data;

            // Formatter les donnees pour Recharts
            const formattedData = history
                .reverse() // Plus ancien au plus recent
                .map(item => ({
                    date: format(new Date(item.checked_at), 'dd/MM HH:mm'),
                    prix: item.price,
                    fullDate: new Date(item.checked_at)
                }));

            setData(formattedData);
        } catch (error) {
            console.error('Erreur chargement historique:', error);
        } finally {
            setLoading(false);
        }
    }, [destinationId]);

    useEffect(() => {
        loadPriceHistory();
    }, [loadPriceHistory]);

    if (loading) {
        return <div className="chart-loading">Chargement du graphique...</div>;
    }

    if (data.length === 0) {
        return <div className="chart-empty">Pas assez de données pour afficher un graphique</div>;
    }

    const minPrice = Math.min(...data.map(d => d.prix));
    const maxPrice = Math.max(...data.map(d => d.prix));
    const avgPrice = data.reduce((sum, d) => sum + d.prix, 0) / data.length;

    return (
        <div className="price-chart">
            <div className="chart-header">
                <h4>📊 Historique des prix</h4>
                <div className="chart-stats">
                    <span className="stat">
                        <span className="label">Min:</span>
                        <span className="value green">{minPrice.toFixed(0)} $</span>
                    </span>
                    <span className="stat">
                        <span className="label">Moy:</span>
                        <span className="value">{avgPrice.toFixed(0)} $</span>
                    </span>
                    <span className="stat">
                        <span className="label">Max:</span>
                        <span className="value red">{maxPrice.toFixed(0)} $</span>
                    </span>
                    <span className="stat">
                        <span className="label">Points:</span>
                        <span className="value">{data.length}</span>
                    </span>
                </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                        dataKey="date" 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        domain={[minPrice * 0.95, maxPrice * 1.05]}
                    />
                    <Tooltip 
                        contentStyle={{ 
                            background: '#fff', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '10px'
                        }}
                        formatter={(value) => [`${value.toFixed(0)} $`, 'Prix']}
                    />
                    <Legend />
                    <Line 
                        type="monotone" 
                        dataKey="prix" 
                        stroke="#667eea" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        name="Prix (CAD)"
                    />
                    {/* Ligne de prix moyen */}
                    <Line 
                        type="monotone" 
                        dataKey={() => avgPrice} 
                        stroke="#f59e0b" 
                        strokeDasharray="5 5"
                        dot={false}
                        name="Prix moyen"
                    />
                </LineChart>
            </ResponsiveContainer>

            <div className="chart-insights">
                {data[data.length - 1].prix < avgPrice && (
                    <p className="insight good">
                        ✅ Prix actuel sous la moyenne de {(avgPrice - data[data.length - 1].prix).toFixed(0)} $
                    </p>
                )}
                {data[data.length - 1].prix === minPrice && (
                    <p className="insight excellent">
                        🎯 Prix actuel au minimum historique!
                    </p>
                )}
                {data[data.length - 1].prix > avgPrice * 1.1 && (
                    <p className="insight warning">
                        ⚠️ Prix actuel supérieur à la moyenne - Attendez une baisse
                    </p>
                )}
            </div>
        </div>
    );
}

export default PriceChart;
