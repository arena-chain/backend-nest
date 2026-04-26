import * as fs from "fs";

// Node 22.5+ built-in SQLite; avoids native `sqlite3` npm builds on Windows/Node 24.
const DatabaseSync = require("node:sqlite").DatabaseSync;

let database: any;

/**
 * Creates or loads a new sqlite database.
 */
export async function create() {
    const existed = fs.existsSync("database.db");

    database = new DatabaseSync("database.db");

    if (!existed) {
        database.exec(`
            CREATE TABLE \`conduit_instances\` (
                \`code\`	    TEXT,
                \`public_key\`	TEXT,
                PRIMARY KEY(\`code\`)
            );
        `);
    }
}

/**
 * Generates a new unique code for the specified public key and returns that key.
 * Either inserts the public key in the database, or returns the existing code
 * if it already existed.
 */
export async function generateCode(pubkey: string): Promise<string> {
    if (!database) throw new Error("Database not loaded yet.");

    const existing = database.prepare(`SELECT * FROM conduit_instances WHERE public_key = ? LIMIT 1`).get(pubkey);
    if (existing) return existing.code;

    let code: string;
    while (true) {
        code = (Math.floor(Math.random() * 900000) + 100000).toString();

        const existed = database.prepare(`SELECT COUNT(*) as count FROM conduit_instances WHERE code = ?`).get(code);

        if (existed.count === 0) break;
    }

    database.prepare(`INSERT INTO conduit_instances VALUES (?, ?)`).run(code, pubkey);
    return code;
}

/**
 * Looks up the public key belonging to the specified code. Returns either the
 * key, or null if not found.
 */
export async function lookup(code: string): Promise<{ public_key: string; code: string } | null> {
    if (!database) throw new Error("Database not loaded yet.");

    const entry = database.prepare(`SELECT * FROM conduit_instances WHERE code = ? LIMIT 1`).get(code);
    return entry || null;
}

/**
 * Checks if the specified code is still a valid entry. If yes, updates the pubkey for
 * said code and returns true. Else, returns false.
 */
export async function potentiallyUpdate(code: string, pubkey: string): Promise<boolean> {
    if (!database) throw new Error("Database not loaded yet.");

    const existed = database.prepare(`SELECT COUNT(*) as count FROM conduit_instances WHERE code = ?`).get(code);
    if (existed.count === 0) return false;

    database.prepare(`UPDATE conduit_instances SET public_key = ? WHERE code = ?`).run(pubkey, code);
    return true;
}
