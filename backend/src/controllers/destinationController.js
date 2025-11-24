const db = require('../db/database');
const duffelService = require('../services/duffelService');
const priceAnalyzer = require('../services/priceAnalyzer');

// Helper pour executer les requetes de maniere unifiee (sync SQLite / async PostgreSQL)
async function execQuery(stmt, method, ...params) {
    const result = stmt[method](...params);
    // Si c'est une Promise (PostgreSQL), await; sinon retourne directement (SQLite)
    return result instanceof Promise ? await result : result;
}

class DestinationController {
    /**
     * Recuperer toutes les destinations
     */
    async getAll(req, res) {
        try {
            const stmt = db.prepare(`
                SELECT
                    d.*,
                    (SELECT price FROM prices WHERE destination_id = d.id ORDER BY checked_at DESC LIMIT 1) as latest_price,
                    (SELECT COUNT(*) FROM prices WHERE destination_id = d.id) as price_count
                FROM destinations d
                ORDER BY d.created_at DESC
            `);
            const destinations = await execQuery(stmt, 'all');

            res.json({ success: true, data: destinations });
        } catch (error) {
            console.error('Erreur getAll:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Recuperer une destination par ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;

            const stmt = db.prepare(`
                SELECT
                    d.*,
                    (SELECT price FROM prices WHERE destination_id = d.id ORDER BY checked_at DESC LIMIT 1) as latest_price
                FROM destinations d
                WHERE d.id = ?
            `);
            const destination = await execQuery(stmt, 'get', id);

            if (!destination) {
                return res.status(404).json({ success: false, error: 'Destination introuvable' });
            }

            // Ajouter l'analyse du prix
            if (destination.latest_price) {
                const analysis = await priceAnalyzer.calculateQualityScore(destination.id, destination.latest_price);
                destination.analysis = analysis;
            }

            res.json({ success: true, data: destination });
        } catch (error) {
            console.error('Erreur getById:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Creer une nouvelle destination
     */
    async create(req, res) {
        try {
            const { origin, destination, departure_date, return_date, max_price } = req.body;

            // Validation
            if (!origin || !destination || !departure_date) {
                return res.status(400).json({
                    success: false,
                    error: 'Origine, destination et date de depart requis'
                });
            }

            // Inserer la destination
            const insertStmt = db.prepare(`
                INSERT INTO destinations (origin, destination, departure_date, return_date, max_price)
                VALUES (?, ?, ?, ?, ?)
            `);
            const result = await execQuery(insertStmt, 'run', origin, destination, departure_date, return_date, max_price || null);

            const selectStmt = db.prepare('SELECT * FROM destinations WHERE id = ?');
            const newDestination = await execQuery(selectStmt, 'get', result.lastInsertRowid);

            // Verifier le prix immediatement
            try {
                const price = await duffelService.getLowestPrice({
                    origin,
                    destination,
                    departureDate: departure_date,
                    returnDate: return_date
                });

                if (price) {
                    const priceStmt = db.prepare(`
                        INSERT INTO prices (destination_id, price, currency, airline)
                        VALUES (?, ?, 'CAD', 'Air Canada')
                    `);
                    await execQuery(priceStmt, 'run', result.lastInsertRowid, price);

                    newDestination.latest_price = price;
                }
            } catch (error) {
                console.error('Erreur lors de la verification initiale du prix:', error.message);
            }

            res.status(201).json({
                success: true,
                data: newDestination,
                message: 'Destination ajoutee avec succes'
            });

        } catch (error) {
            console.error('Erreur create:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Mettre a jour une destination
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const { origin, destination, departure_date, return_date, max_price, is_active } = req.body;

            // Verifier que la destination existe
            const existStmt = db.prepare('SELECT * FROM destinations WHERE id = ?');
            const existing = await execQuery(existStmt, 'get', id);
            if (!existing) {
                return res.status(404).json({ success: false, error: 'Destination introuvable' });
            }

            // Construire la requete de mise a jour
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

            const updateStmt = db.prepare(`
                UPDATE destinations
                SET ${updates.join(', ')}
                WHERE id = ?
            `);
            await execQuery(updateStmt, 'run', ...values);

            const selectStmt = db.prepare('SELECT * FROM destinations WHERE id = ?');
            const updated = await execQuery(selectStmt, 'get', id);

            res.json({
                success: true,
                data: updated,
                message: 'Destination mise a jour'
            });

        } catch (error) {
            console.error('Erreur update:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Supprimer une destination
     */
    async delete(req, res) {
        try {
            const { id } = req.params;

            const existStmt = db.prepare('SELECT * FROM destinations WHERE id = ?');
            const existing = await execQuery(existStmt, 'get', id);
            if (!existing) {
                return res.status(404).json({ success: false, error: 'Destination introuvable' });
            }

            const deleteStmt = db.prepare('DELETE FROM destinations WHERE id = ?');
            await execQuery(deleteStmt, 'run', id);

            res.json({
                success: true,
                message: 'Destination supprimee'
            });

        } catch (error) {
            console.error('Erreur delete:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new DestinationController();
