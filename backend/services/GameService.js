const Session = require('../models/Session');
const aiService = require('../config/ai');

class GameService {
  constructor() {
    this.parties = {}; // Stockage en mémoire des parties
    this.users = {}; // Stockage en mémoire des utilisateurs
    this.resumeCounters = {}; // Compteur pour la mise à jour automatique du résumé
    this.loadExistingSessions();
  }

  loadExistingSessions() {
    const sessions = Session.getAll();
    for (const session of sessions) {
      // Récupérer la liste des joueurs distincts ayant envoyé un message dans cette session
      const joueurs = Session.getMessages(session.sessionId)
        .map(r => r.auteur)
        .filter(j => j && j !== 'MJ' && j !== 'Système')
        .map(j => (typeof j === 'object' && j.pseudo ? j : { pseudo: String(j), color: '#6d2e7a' }));

      // Correction du nom de la partie
      let nomPartie = '';
      if (session.prompt && session.prompt.includes('Nom de la partie :')) {
        nomPartie = session.prompt.split('Nom de la partie :')[1]?.split('\n')[0]?.trim() || session.sessionId;
      } else {
        nomPartie = 'Partie sans nom';
      }

      this.parties[session.sessionId] = {
        id: session.sessionId,
        nom: nomPartie,
        prompt: session.prompt,
        resume: session.resume,
        version: session.version || '',
        joueurs,
        messages: [],
        fiches: {},
        proprietaire: joueurs[0] || '',
        mjId: 'MJ',
      };
    }
  }

  createParty(nom, mjId, pseudo, version) {
    const partieId = Date.now() + Math.random().toString(36).substr(2, 9);
    const sessionId = partieId;

    const promptSystem = `Tu es le maître de jeu d'une aventure de jeu de rôle médiéval fantastique. Les règles à utiliser sont : ${version}. Sois immersif, mais concis. Laisse de la place à l'imagination des joueurs, ne donne pas tous les détails, suggère, pose des questions ouvertes, laisse des mystères. Réponds toujours en français, en Markdown, en alternant les textes courts et les textes longs en fonction de la situation.`;

    // Créer la session dans la base de données
    Session.create(sessionId, partieId, promptSystem, '', version);

    this.parties[partieId] = {
      id: partieId,
      version,
      nom,
      mjId,
      joueurs: [{ pseudo, color: this.users[mjId]?.color || '#6d2e7a' }],
      messages: [],
      fiches: {},
      proprietaire: pseudo,
    };

    // Générer l'introduction automatique
    this.generateSessionIntro(sessionId, promptSystem);

    return this.parties[partieId];
  }

  async generateSessionIntro(sessionId, promptSystem) {
    try {
      const introMJ = await aiService.generateSessionIntro(promptSystem);
      Session.addMessage(sessionId, 'MJ', introMJ);
    } catch (e) {
      Session.addMessage(sessionId, 'MJ', "[Erreur lors de la génération de l'introduction IA]");
    }
  }

  joinParty(partieId, userId) {
    const partie = this.parties[partieId];
    if (!partie) {
      throw new Error('Partie non trouvée');
    }

    const joueur = this.users[userId];
    if (!joueur) {
      throw new Error('Utilisateur invalide');
    }

    if (!partie.joueurs.some(j => j.pseudo === joueur.pseudo)) {
      partie.joueurs.push({ pseudo: joueur.pseudo, color: joueur.color || '#6d2e7a' });
    }

    // Nettoyer la liste pour ne garder que des objets bien formés
    partie.joueurs = partie.joueurs.map(j => 
      (typeof j === 'object' && j.pseudo ? j : { pseudo: String(j), color: '#6d2e7a' })
    );

    return partie;
  }

  renameParty(partieId, nom, pseudo) {
    const partie = this.parties[partieId];
    if (!partie) {
      throw new Error('Partie non trouvée');
    }

    if (pseudo !== 'admin' && pseudo !== partie.proprietaire) {
      throw new Error('Seul le propriétaire ou l\'admin peut renommer cette partie.');
    }

    this.parties[partieId].nom = nom;
    return { id: partieId, nom };
  }

  deleteParty(partieId, pseudo) {
    if (pseudo !== 'admin') {
      throw new Error('Seul l\'administrateur peut supprimer une partie.');
    }

    if (!this.parties[partieId]) {
      throw new Error('Partie non trouvée');
    }

    // Supprimer la session et les messages
    Session.deleteMessages(partieId);
    Session.delete(partieId);

    // Supprimer la partie en mémoire
    delete this.parties[partieId];
    return { success: true };
  }

  getAllParties() {
    return Object.values(this.parties);
  }

  getParty(partieId) {
    return this.parties[partieId];
  }

  addUser(userId, pseudo, color) {
    this.users[userId] = { pseudo, color };
    return { userId, pseudo };
  }

  getUser(userId) {
    return this.users[userId];
  }

  updateUserColor(userId, color) {
    if (this.users[userId]) {
      this.users[userId].color = color;
    }
  }

  removeUserFromParty(partieId, pseudo) {
    if (this.parties[partieId]) {
      // Supprimer tous les doublons de ce pseudo
      this.parties[partieId].joueurs = this.parties[partieId].joueurs.filter(p => p.pseudo !== pseudo);
      console.log(`👤 Utilisateur ${pseudo} retiré de la partie ${partieId}`);
    }
  }

  // Nouvelle méthode pour ajouter un utilisateur sans doublon
  addUserToParty(partieId, pseudo, color = '#6d2e7a') {
    if (this.parties[partieId]) {
      // Supprimer d'abord tous les doublons existants
      this.parties[partieId].joueurs = this.parties[partieId].joueurs.filter(p => p.pseudo !== pseudo);
      
      // Ajouter l'utilisateur
      this.parties[partieId].joueurs.push({ pseudo, color });
      console.log(`👤 Utilisateur ${pseudo} ajouté à la partie ${partieId}`);
    }
  }

  async updateSessionResume(sessionId) {
    try {
      const context = Session.getSessionContext(sessionId) || [];
      const resume = await aiService.generateSessionResume(context);
      Session.updateResume(sessionId, resume);
      console.log("Résumé mis à jour :", resume);
      return resume;
    } catch (error) {
      console.error('Erreur MAJ résumé :', error);
      throw error;
    }
  }

  incrementResumeCounter(sessionId) {
    this.resumeCounters[sessionId] = (this.resumeCounters[sessionId] || 0) + 1;
    return this.resumeCounters[sessionId];
  }

  shouldUpdateResume(sessionId) {
    return this.resumeCounters[sessionId] % 5 === 0;
  }
}

module.exports = new GameService(); 