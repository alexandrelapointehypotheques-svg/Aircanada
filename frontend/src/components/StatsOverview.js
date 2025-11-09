import React from 'react';
import './StatsOverview.css';

function StatsOverview({ stats }) {
    const { 
        totalDestinations, 
        activeDestinations, 
        totalAlerts, 
        overallAvgPrice,
        alertsLast7Days 
    } = stats;

    const statCards = [
        {
            icon: '📍',
            label: 'Destinations',
            value: activeDestinations,
            total: totalDestinations,
            color: '#667eea'
        },
        {
            icon: '💰',
            label: 'Prix moyen',
            value: `${parseFloat(overallAvgPrice).toFixed(0)} $`,
            color: '#10b981'
        },
        {
            icon: '🔔',
            label: 'Alertes envoyées',
            value: totalAlerts,
            subtitle: `${alertsLast7Days} cette semaine`,
            color: '#f59e0b'
        }
    ];

    return (
        <div className="stats-overview">
            {statCards.map((stat, index) => (
                <div key={index} className="stat-card" style={{ borderColor: stat.color }}>
                    <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
                        {stat.icon}
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">{stat.label}</div>
                        <div className="stat-value" style={{ color: stat.color }}>
                            {stat.value}
                            {stat.total && <span className="stat-total"> / {stat.total}</span>}
                        </div>
                        {stat.subtitle && <div className="stat-subtitle">{stat.subtitle}</div>}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default StatsOverview;
