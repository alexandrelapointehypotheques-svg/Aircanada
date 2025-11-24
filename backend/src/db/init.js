require('dotenv').config();
const fs = require('fs');
const path = require('path');

const usePostgres = !!process.env.DATABASE_URL;

async function initDatabase() {
    if (usePostgres) {
        // PostgreSQL
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });

        console.log('🔄 Initialisation de la base de donnees PostgreSQL...');

        // Schema PostgreSQL
        const schemaPostgres = `
            CREATE TABLE IF NOT EXISTS destinations (
                id SERIAL PRIMARY KEY,
                origin TEXT NOT NULL,
                destination TEXT NOT NULL,
                departure_date TEXT NOT NULL,
                return_date TEXT,
                max_price REAL,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS prices (
                id SERIAL PRIMARY KEY,
                destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
                price REAL NOT NULL,
                currency TEXT DEFAULT 'CAD',
                airline TEXT DEFAULT 'Air Canada',
                checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS alerts (
                id SERIAL PRIMARY KEY,
                destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
                alert_type TEXT NOT NULL,
                message TEXT NOT NULL,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_prices_destination ON prices(destination_id);
            CREATE INDEX IF NOT EXISTS idx_prices_checked_at ON prices(checked_at);
            CREATE INDEX IF NOT EXISTS idx_destinations_active ON destinations(is_active);
        `;

        try {
            await pool.query(schemaPostgres);
            console.log('✅ Tables PostgreSQL creees avec succes!');

            // Verifier si des donnees existent deja
            const result = await pool.query('SELECT COUNT(*) FROM destinations');
            if (parseInt(result.rows[0].count) === 0) {
                // Ajouter des donnees de test
                await pool.query(`
                    INSERT INTO destinations (origin, destination, departure_date, return_date, max_price)
                    VALUES
                        ('YUL', 'CUN', '2025-12-15', '2025-12-22', 800),
                        ('YUL', 'AJA', '2025-08-10', '2025-08-24', 1200)
                `);
                console.log('📍 Destinations de test ajoutees:');
                console.log('   - YUL → CUN (Cancun)');
                console.log('   - YUL → AJA (Ajaccio, Corse)');
            } else {
                console.log('📍 Donnees existantes conservees');
            }

            await pool.end();
        } catch (error) {
            console.error('❌ Erreur PostgreSQL:', error.message);
            process.exit(1);
        }

    } else {
        // SQLite
        const Database = require('better-sqlite3');
        const dbPath = path.join(__dirname, '../../database.db');
        const schemaPath = path.join(__dirname, '../../database/schema.sql');

        console.log('🔄 Initialisation de la base de donnees SQLite...');

        // Creer la base de donnees
        const db = new Database(dbPath);

        // Lire et executer le schema SQL
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);

        // Verifier si des donnees existent deja
        const count = db.prepare('SELECT COUNT(*) as count FROM destinations').get();

        if (count.count === 0) {
            // Ajouter des donnees de test
            const insertDestination = db.prepare(`
                INSERT INTO destinations (origin, destination, departure_date, return_date, max_price)
                VALUES (?, ?, ?, ?, ?)
            `);

            const testDestinations = [
                {
                    origin: 'YUL',
                    destination: 'CUN',
                    departure_date: '2025-12-15',
                    return_date: '2025-12-22',
                    max_price: 800
                },
                {
                    origin: 'YUL',
                    destination: 'AJA',
                    departure_date: '2025-08-10',
                    return_date: '2025-08-24',
                    max_price: 1200
                }
            ];

            testDestinations.forEach(dest => {
                insertDestination.run(
                    dest.origin,
                    dest.destination,
                    dest.departure_date,
                    dest.return_date,
                    dest.max_price
                );
            });

            console.log('📍 Destinations de test ajoutees:');
            console.log('   - YUL → CUN (Cancun)');
            console.log('   - YUL → AJA (Ajaccio, Corse)');
        } else {
            console.log('📍 Donnees existantes conservees');
        }

        db.close();
        console.log('✅ Base de donnees SQLite initialisee avec succes!');
    }
}

initDatabase().catch(console.error);
