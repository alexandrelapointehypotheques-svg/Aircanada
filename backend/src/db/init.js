const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../database.db');
const schemaPath = path.join(__dirname, '../../database/schema.sql');

// Créer la base de données
const db = new Database(dbPath);

// Lire et exécuter le schéma SQL
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

// Ajouter des données de test pour Cancun et Corse
const insertDestination = db.prepare(`
    INSERT INTO destinations (origin, destination, departure_date, return_date, max_price)
    VALUES (?, ?, ?, ?, ?)
`);

// Données de test
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

console.log('✅ Base de données initialisée avec succès!');
console.log('📍 Destinations de test ajoutées:');
console.log('   - YUL → CUN (Cancun)');
console.log('   - YUL → AJA (Ajaccio, Corse)');

db.close();
