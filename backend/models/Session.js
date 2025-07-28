const dbManager = require('../config/database');

class Session {
  constructor() {
    this.db = dbManager.getDatabase();
  }

  create(sessionId, partieId, prompt, resume, version) {
    return this.db.prepare(
      'INSERT INTO sessions (sessionId, partieId, prompt, resume, version) VALUES (?, ?, ?, ?, ?)'
    ).run(sessionId, partieId, prompt, resume, version);
  }

  getById(sessionId) {
    return this.db.prepare('SELECT * FROM sessions WHERE sessionId = ?').get(sessionId);
  }

  updateResume(sessionId, resume) {
    return this.db.prepare('UPDATE sessions SET resume = ? WHERE sessionId = ?').run(resume, sessionId);
  }

  getAll() {
    return this.db.prepare('SELECT * FROM sessions').all();
  }

  delete(sessionId) {
    return this.db.prepare('DELETE FROM sessions WHERE sessionId = ?').run(sessionId);
  }

  getMessages(sessionId, limit = 15) {
    return this.db.prepare(
      'SELECT id, auteur, contenu, destinataires FROM messages WHERE sessionId = ? ORDER BY timestamp ASC'
    ).all(sessionId);
  }

  getRecentMessages(sessionId, limit = 15) {
    return this.db.prepare(
      'SELECT auteur, contenu FROM messages WHERE sessionId = ? ORDER BY timestamp DESC LIMIT ?'
    ).all(sessionId, limit).reverse();
  }

  addMessage(sessionId, auteur, contenu, destinataires = null) {
    const destinatairesStr = destinataires ? JSON.stringify(destinataires) : null;
    return this.db.prepare(
      'INSERT INTO messages (sessionId, auteur, contenu, timestamp, destinataires) VALUES (?, ?, ?, ?, ?)'
    ).run(sessionId, auteur, contenu, Date.now(), destinatairesStr);
  }

  deleteMessages(sessionId) {
    return this.db.prepare('DELETE FROM messages WHERE sessionId = ?').run(sessionId);
  }

  getSessionContext(sessionId) {
    const session = this.getById(sessionId);
    if (!session) return null;

    const messages = this.getRecentMessages(sessionId, 15);
    const context = [];

    if (session.prompt) {
      context.push({ role: 'system', content: session.prompt });
    }
    if (session.resume) {
      context.push({ role: 'system', content: `Résumé de la session : ${session.resume}` });
    }

    for (const msg of messages) {
      context.push({
        role: msg.auteur === 'MJ' ? 'assistant' : 'user',
        content: msg.contenu
      });
    }

    return context;
  }
}

module.exports = new Session(); 