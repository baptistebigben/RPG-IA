// Script pour vider la base de données (sessions et messages)
const Database = require('better-sqlite3');
const db = new Database('sessions.db');

db.exec('DELETE FROM messages;');
db.exec('DELETE FROM sessions;');

console.log('Base de données vidée (sessions et messages supprimés).'); 