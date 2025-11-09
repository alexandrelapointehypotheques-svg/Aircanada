import React, { useState } from 'react';
import './AddDestinationForm.css';

function AddDestinationForm({ onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        origin: 'YUL',
        destination: '',
        departureDate: '',
        returnDate: '',
        maxPrice: '',
        enableAlerts: true
    });

    const popularDestinations = [
        { code: 'CUN', name: 'Cancun (Mexique)', emoji: '🏖️' },
        { code: 'AJA', name: 'Ajaccio, Corse (France)', emoji: '🏝️' },
        { code: 'CDG', name: 'Paris (France)', emoji: '🗼' },
        { code: 'LHR', name: 'Londres (UK)', emoji: '🇬🇧' },
        { code: 'BCN', name: 'Barcelone (Espagne)', emoji: '🏛️' },
        { code: 'FCO', name: 'Rome (Italie)', emoji: '🏛️' },
        { code: 'DXB', name: 'Dubaï (EAU)', emoji: '🏜️' },
        { code: 'NRT', name: 'Tokyo (Japon)', emoji: '🗾' },
        { code: 'LAX', name: 'Los Angeles (USA)', emoji: '🌴' },
        { code: 'MIA', name: 'Miami (USA)', emoji: '🌴' }
    ];

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.destination || !formData.departureDate) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }

        // Vérifier que la date de départ est future
        if (new Date(formData.departureDate) < new Date()) {
            alert('La date de départ doit être dans le futur');
            return;
        }

        // Vérifier que la date de retour est après la date de départ
        if (formData.returnDate && new Date(formData.returnDate) <= new Date(formData.departureDate)) {
            alert('La date de retour doit être après la date de départ');
            return;
        }

        onSubmit(formData);
    };

    return (
        <div className="add-destination-form">
            <h3>➕ Ajouter une destination à surveiller</h3>
            
            <form onSubmit={handleSubmit}>
                <div className="form-row">
                    <div className="form-group">
                        <label>Départ *</label>
                        <select 
                            name="origin"
                            value={formData.origin}
                            onChange={handleChange}
                            required
                        >
                            <option value="YUL">YUL - Montréal (Trudeau)</option>
                            <option value="YYZ">YYZ - Toronto</option>
                            <option value="YVR">YVR - Vancouver</option>
                            <option value="YYC">YYC - Calgary</option>
                            <option value="YOW">YOW - Ottawa</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Destination * 
                            <span className="help-text">Code IATA (3 lettres)</span>
                        </label>
                        <input 
                            type="text"
                            name="destination"
                            value={formData.destination}
                            onChange={handleChange}
                            placeholder="Ex: CUN, AJA, CDG"
                            maxLength={3}
                            pattern="[A-Z]{3}"
                            required
                        />
                        <div className="suggestions">
                            <p className="suggestions-label">Destinations populaires:</p>
                            <div className="suggestions-grid">
                                {popularDestinations.map(dest => (
                                    <button
                                        key={dest.code}
                                        type="button"
                                        className="suggestion-btn"
                                        onClick={() => setFormData(prev => ({ ...prev, destination: dest.code }))}
                                    >
                                        {dest.emoji} {dest.code} - {dest.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Date de départ *</label>
                        <input 
                            type="date"
                            name="departureDate"
                            value={formData.departureDate}
                            onChange={handleChange}
                            min={new Date().toISOString().split('T')[0]}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Date de retour (optionnel)</label>
                        <input 
                            type="date"
                            name="returnDate"
                            value={formData.returnDate}
                            onChange={handleChange}
                            min={formData.departureDate}
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Budget maximum (CAD $) 
                            <span className="help-text">Recevoir alerte si prix sous ce montant</span>
                        </label>
                        <input 
                            type="number"
                            name="maxPrice"
                            value={formData.maxPrice}
                            onChange={handleChange}
                            placeholder="Ex: 800"
                            min="0"
                            step="10"
                        />
                    </div>

                    <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                            <input 
                                type="checkbox"
                                name="enableAlerts"
                                checked={formData.enableAlerts}
                                onChange={handleChange}
                            />
                            <span>🔔 Activer les alertes SMS/Email</span>
                        </label>
                        <p className="help-text">
                            Vous serez notifié quand le prix baisse ou atteint votre budget
                        </p>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={onCancel}>
                        Annuler
                    </button>
                    <button type="submit" className="btn btn-primary">
                        ➕ Ajouter et surveiller
                    </button>
                </div>

                <div className="form-note">
                    <p>💡 <strong>Astuce:</strong> Les prix sont vérifiés automatiquement 2 fois par jour (6h et 18h). Vous pouvez aussi vérifier manuellement.</p>
                </div>
            </form>
        </div>
    );
}

export default AddDestinationForm;
