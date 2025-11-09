const db = require('../db/database');
const duffelService = require('../services/duffelService');
const priceAnalyzer = require('../services/priceAnalyzer');

class DestinationController {
    /**
     * Récupérer toutes les destinations
     */
    getAllDestinations(req, res) {
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
    getDestination(req, res) {
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
    async createDestination(req, res) {
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
    updateDestination(req, res) {
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
    deleteDestination(req, res) {
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

    /**
     * Vérifier le prix d'une destination
     */
    async checkPrice(req, res) {
        try {
            const { id } = req.params;

            const destination = db.prepare('SELECT * FROM destinations WHERE id = ?').get(id);
            if (!destination) {
                return res.status(404).json({ success: false, error: 'Destination introuvable' });
            }

            const price = await duffelService.getLowestPrice({
                origin: destination.origin,
                destination: destination.destination,
                departureDate: destination.departure_date,
                returnDate: destination.return_date
            });

            if (price) {
                db.prepare(`
                    INSERT INTO prices (destination_id, price, currency, airline)
                    VALUES (?, ?, 'CAD', 'Air Canada')
                `).run(id, price);

                const analysis = priceAnalyzer.calculateQualityScore(id, price);

                res.json({
                    success: true,
                    data: { price, analysis },
                    message: 'Prix vérifié avec succès'
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: 'Aucun vol trouvé pour cette destination'
                });
            }

        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Récupérer l'historique des prix
     */
    getPriceHistory(req, res) {
        try {
            const { id } = req.params;
            const limit = req.query.limit || 100;

            const prices = db.prepare(`
                SELECT * FROM prices
                WHERE destination_id = ?
                ORDER BY checked_at DESC
                LIMIT ?
            `).all(id, limit);

            res.json({ success: true, data: prices });

        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Récupérer les meilleures offres
     */
    getBestDeals(req, res) {
        try {
            const destinations = db.prepare(`
                SELECT
                    d.*,
                    p.price as latest_price,
                    p.checked_at
                FROM destinations d
                LEFT JOIN prices p ON p.id = (
                    SELECT id FROM prices
                    WHERE destination_id = d.id
                    ORDER BY checked_at DESC
                    LIMIT 1
                )
                WHERE d.is_active = 1
                AND p.price IS NOT NULL
                ORDER BY p.price ASC
                LIMIT 10
            `).all();

            res.json({ success: true, data: destinations });

        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Récupérer les alertes
     */
    getAlerts(req, res) {
        try {
            const destinationId = req.query.destinationId;

            let query = 'SELECT * FROM alerts ORDER BY sent_at DESC';
            let params = [];

            if (destinationId) {
                query = 'SELECT * FROM alerts WHERE destination_id = ? ORDER BY sent_at DESC';
                params = [destinationId];
            }

            const alerts = db.prepare(query).all(...params);

            res.json({ success: true, data: alerts });

        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Récupérer les statistiques globales
     */
    getStats(req, res) {
        try {
            const stats = {
                activeDestinations: db.prepare('SELECT COUNT(*) as count FROM destinations WHERE is_active = 1').get().count,
                totalPriceChecks: db.prepare('SELECT COUNT(*) as count FROM prices').get().count,
                totalAlerts: db.prepare('SELECT COUNT(*) as count FROM alerts').get().count,
                averagePrice: db.prepare('SELECT AVG(price) as avg FROM prices').get().avg || 0
            };

            res.json({ success: true, data: stats });

        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new DestinationController();
