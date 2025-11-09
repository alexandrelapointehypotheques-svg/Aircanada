const db = require('../db/database');
const duffelService = require('../services/duffelService');
const priceAnalyzer = require('../services/priceAnalyzer');

class DestinationController {
    /**
     * Récupérer toutes les destinations
     */
    getAll(req, res) {
        try {
            const destinations = db.prepare(`
                SELECT 
                    d.*,
                    (SELECT price FROM prices WHERE destination_id = d.id ORDER BY checked_at DESC LIMIT 1) as latest_price,
                    (SELECT COUNT(*) FROM prices WHERE destination_id = d.id) as price_count
                FROM destinations d
                ORDER BY d.created_at DESC
            `).all();

            res.json({ success: true, data: destinations });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Récupérer une destination par ID
     */
    getById(req, res) {
        try {
            const { id } = req.params;
            
            const destination = db.prepare(`
                SELECT 
                    d.*,
                    (SELECT price FROM prices WHERE destination_id = d.id ORDER BY checked_at DESC LIMIT 1) as latest_price
                FROM destinations d
                WHERE d.id = ?
            `).get(id);

            if (!destination) {
                return res.status(404).json({ success: false, error: 'Destination introuvable' });
            }

            // Ajouter l'analyse du prix
            if (destination.latest_price) {
                const analysis = priceAnalyzer.calculateQualityScore(destination.id, destination.latest_price);
                destination.analysis = analysis;
            }

            res.json({ success: true, data: destination });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Créer une nouvelle destination
     */
    async create(req, res) {
        try {
            const { origin, destination, departure_date, return_date, max_price } = req.body;

            // Validation
            if (!origin || !destination || !departure_date) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Origine, destination et date de départ requis' 
                });
            }

            // Insérer la destination
            const result = db.prepare(`
                INSERT INTO destinations (origin, destination, departure_date, return_date, max_price)
                VALUES (?, ?, ?, ?, ?)
            `).run(origin, destination, departure_date, return_date, max_price || null);

            const newDestination = db.prepare('SELECT * FROM destinations WHERE id = ?').get(result.lastInsertRowid);

            // Vérifier le prix immédiatement
            try {
                const price = await duffelService.getLowestPrice({
                    origin,
                    destination,
                    departureDate: departure_date,
                    returnDate: return_date
                });

                if (price) {
                    db.prepare(`
                        INSERT INTO prices (destination_id, price, currency, airline)
                        VALUES (?, ?, 'CAD', 'Air Canada')
                    `).run(result.lastInsertRowid, price);

                    newDestination.latest_price = price;
                }
            } catch (error) {
                console.error('Erreur lors de la vérification initiale du prix:', error.message);
            }

            res.status(201).json({ 
                success: true, 
                data: newDestination,
                message: 'Destination ajoutée avec succès' 
            });

        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Mettre à jour une destination
     */
    update(req, res) {
        try {
            const { id } = req.params;
            const { origin, destination, departure_date, return_date, max_price, is_active } = req.body;

            // Vérifier que la destination existe
            const existing = db.prepare('SELECT * FROM destinations WHERE id = ?').get(id);
            if (!existing) {
                return res.status(404).json({ success: false, error: 'Destination introuvable' });
            }

            // Construire la requête de mise à jour
            const updates = [];
            const values = [];

            if (origin !== undefined) { updates.push('origin = ?'); values.push(origin); }
            if (destination !== undefined) { updates.push('destination = ?'); values.push(destination); }
            if (departure_date !== undefined) { updates.push('departure_date = ?'); values.push(departure_date); }
            if (return_date !== undefined) { updates.push('return_date = ?'); values.push(return_date); }
            if (max_price !== undefined) { updates.push('max_price = ?'); values.push(max_price); }
            if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }

            if (updates.length === 0) {
                return res.status(400).json({ success: false, error: 'Aucune modification fournie' });
            }

            updates.push('updated_at = CURRENT_TIMESTAMP');
            values.push(id);

            db.prepare(`
                UPDATE destinations 
                SET ${updates.join(', ')}
                WHERE id = ?
            `).run(...values);

            const updated = db.prepare('SELECT * FROM destinations WHERE id = ?').get(id);

            res.json({ 
                success: true, 
                data: updated,
                message: 'Destination mise à jour' 
            });

        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Supprimer une destination
     */
    delete(req, res) {
        try {
            const { id } = req.params;

            const existing = db.prepare('SELECT * FROM destinations WHERE id = ?').get(id);
            if (!existing) {
                return res.status(404).json({ success: false, error: 'Destination introuvable' });
            }

            db.prepare('DELETE FROM destinations WHERE id = ?').run(id);

            res.json({ 
                success: true, 
                message: 'Destination supprimée' 
            });

        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new DestinationController();
