const Database = require('better-sqlite3');
const path = require('path');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '..', 'sessions.db');
  }

  getDatabase() {
    if (!this.db) {
      this.db = new Database(this.dbPath);
      this.initializeTables();
    }
    return this.db;
  }

  initializeTables() {
    // Créer la table sessions si elle n'existe pas
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sessionId TEXT PRIMARY KEY,
        partieId TEXT NOT NULL,
        prompt TEXT,
        resume TEXT,
        version TEXT DEFAULT '1.0'
      )
    `);

    // Créer la table messages si elle n'existe pas
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sessionId TEXT NOT NULL,
        auteur TEXT NOT NULL,
        contenu TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        destinataires TEXT,
        FOREIGN KEY (sessionId) REFERENCES sessions (sessionId)
      )
    `);

    // Vérifier si la colonne destinataires existe dans messages
    try {
      this.db.prepare('SELECT destinataires FROM messages LIMIT 1').get();
    } catch (error) {
      // Si la colonne n'existe pas, l'ajouter
      this.db.exec('ALTER TABLE messages ADD COLUMN destinataires TEXT');
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

module.exports = new DatabaseManager(); 