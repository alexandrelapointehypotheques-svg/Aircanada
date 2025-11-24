const path = require('path');
require('dotenv').config();

const usePostgres = !!process.env.DATABASE_URL;

/**
 * Convertit les placeholders SQLite (?) en placeholders PostgreSQL ($1, $2, ...)
 */
function convertPlaceholders(sql) {
    let counter = 0;
    return sql.replace(/\?/g, () => `$${++counter}`);
}

/**
 * Convertit la syntaxe SQLite en PostgreSQL
 */
function convertSqlToPostgres(sql) {
    let converted = convertPlaceholders(sql);
    // Convertir datetime('now', ...) en syntaxe PostgreSQL
    converted = converted.replace(/datetime\('now', '-(\d+) days'\)/gi, "NOW() - INTERVAL '$1 days'");
    converted = converted.replace(/datetime\('now'\)/gi, 'NOW()');
    converted = converted.replace(/CURRENT_TIMESTAMP/gi, 'NOW()');
    return converted;
}

let db;

if (usePostgres) {
    // PostgreSQL pour la production (Render)
    const { Pool } = require('pg');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    db = {
        isAsync: true,
        pool,

        prepare(sql) {
            const pgSql = convertSqlToPostgres(sql);
            return {
                sql: pgSql,
                async run(...params) {
                    // Pour INSERT avec RETURNING id
                    let querySql = pgSql;
                    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
                        querySql = pgSql.replace(/;?\s*$/, ' RETURNING id');
                    }
                    const result = await pool.query(querySql, params);
                    return {
                        lastInsertRowid: result.rows[0]?.id,
                        changes: result.rowCount
                    };
                },
                async get(...params) {
                    const result = await pool.query(pgSql, params);
                    return result.rows[0];
                },
                async all(...params) {
                    const result = await pool.query(pgSql, params);
                    return result.rows;
                }
            };
        },

        async exec(sql) {
            const pgSql = convertSqlToPostgres(sql);
            await pool.query(pgSql);
        },

        pragma() {
            // PostgreSQL n'utilise pas pragma
        }
    };

    console.log('PostgreSQL connexion etablie');

} else {
    // SQLite pour le developpement local uniquement
    // better-sqlite3 est charge dynamiquement pour eviter les erreurs en production
    let Database;
    try {
        Database = require('better-sqlite3');
    } catch (err) {
        console.error('better-sqlite3 non disponible. Utilisez DATABASE_URL pour PostgreSQL.');
        process.exit(1);
    }

    const dbPath = path.join(__dirname, '../../database.db');
    const sqliteDb = new Database(dbPath);

    // Activer les cles etrangeres
    sqliteDb.pragma('foreign_keys = ON');

    db = {
        isAsync: false,

        prepare(sql) {
            const stmt = sqliteDb.prepare(sql);
            return {
                sql,
                run(...params) {
                    const result = stmt.run(...params);
                    return {
                        lastInsertRowid: result.lastInsertRowid,
                        changes: result.changes
                    };
                },
                get(...params) {
                    return stmt.get(...params);
                },
                all(...params) {
                    return stmt.all(...params);
                }
            };
        },

        exec(sql) {
            sqliteDb.exec(sql);
        },

        pragma(statement) {
            sqliteDb.pragma(statement);
        }
    };

    console.log('SQLite connexion etablie');
}

module.exports = db;
