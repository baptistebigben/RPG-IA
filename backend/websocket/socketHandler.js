const gameService = require('../services/GameService');
const messageService = require('../services/MessageService');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Un utilisateur s\'est connecté');

      // Rejoindre une room (sessionId)
      socket.on('joinRoom', ({ sessionId, pseudo }) => {
        this.handleJoinRoom(socket, sessionId, pseudo);
      });

      // Message (public ou direct, MJ = Groq)
      socket.on('message', async ({ sessionId, auteur, contenu, destinataires }) => {
        await this.handleMessage(socket, sessionId, auteur, contenu, destinataires);
      });

      // Correction de contexte
      socket.on('correctContext', async ({ sessionId, auteur, correctif }) => {
        await this.handleCorrectContext(socket, sessionId, auteur, correctif);
      });

      // Confirmation de correction
      socket.on('confirmCorrectContext', ({ sessionId, correctif }) => {
        this.handleConfirmCorrectContext(socket, sessionId, correctif);
      });

      // Mise à jour de la couleur du joueur
      socket.on('updateColor', ({ sessionId, pseudo, color }) => {
        this.handleUpdateColor(socket, sessionId, pseudo, color);
      });

      // Déconnexion
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  handleJoinRoom(socket, sessionId, pseudo) {
    socket.join(sessionId);
    socket.sessionId = sessionId;
    socket.pseudo = pseudo;

    console.log(`🏠 ${pseudo} rejoint la room ${sessionId}`);

    // Utiliser la nouvelle méthode pour éviter les doublons
    if (gameService.getParty(sessionId)) {
      // Chercher la couleur dans users
      const userColor = Object.values(gameService.users).find(u => u.pseudo === pseudo)?.color || '#6d2e7a';
      
      // Ajouter l'utilisateur sans doublon
      gameService.addUserToParty(sessionId, pseudo, userColor);
      
      // Diffuser la liste mise à jour
      const partie = gameService.getParty(sessionId);
      this.io.to(sessionId).emit('playersUpdate', { players: partie.joueurs });
    }

    socket.to(sessionId).emit('info', `${pseudo} a rejoint la partie.`);
  }

  async handleMessage(socket, sessionId, auteur, contenu, destinataires) {
    if (!sessionId || !auteur || !contenu) return;

    try {
      console.log('🔄 handleMessage appelé:', { sessionId, auteur, contenu, destinataires });
      const result = await messageService.processMessage(sessionId, auteur, contenu, destinataires);
      const messageId = result.messageId;
      console.log('📝 Résultat traitement:', result);

      // Diffusion du message utilisateur
      if (destinataires && Array.isArray(destinataires) && destinataires.length > 0) {
        // Message direct : envoyer uniquement aux sockets concernés
        const sockets = await this.io.in(sessionId).fetchSockets();
        sockets.forEach(s => {
          if (destinataires.includes(s.pseudo) || s.pseudo === auteur) {
            s.emit('message', { id: messageId, auteur, contenu, destinataires });
          }
        });
      } else {
        // Message public : à toute la room
        console.log('📤 Diffusion message public:', { id: messageId, auteur, contenu });
        this.io.to(sessionId).emit('message', { id: messageId, auteur, contenu });
      }

      // Si c'est une commande, diffuser la réponse du MJ
      if (result.type === 'command' && result.reponseMJ) {
        console.log('🤖 Diffusion réponse MJ:', { auteur: 'MJ', contenu: result.reponseMJ });
        this.io.to(sessionId).emit('mjReply', { 
          auteur: 'MJ', 
          contenu: result.reponseMJ 
        });
      }

      // Si c'est un roll, diffuser le résultat
      if (result.type === 'roll') {
        console.log('🎲 Diffusion résultat roll:', { auteur: 'Système', contenu: result.reponseMJ });
        this.io.to(sessionId).emit('mjReply', { 
          auteur: 'Système', 
          contenu: result.reponseMJ 
        });
      }

    } catch (error) {
      console.error('❌ Erreur dans handleMessage:', error);
      socket.emit('error', { error: "Erreur lors du traitement du message", details: error.message });
    }
  }

  async handleCorrectContext(socket, sessionId, auteur, correctif) {
    if (!sessionId || !auteur || !correctif) return;

    try {
      const result = await messageService.handleCorrectContext(sessionId, auteur, correctif, null, null);
      socket.emit('interpretation', { 
        interpretation: result.interpretation, 
        correctif: result.correctif 
      });
    } catch (error) {
      socket.emit('error', { error: "Erreur Groq", details: error.message });
    }
  }

  handleConfirmCorrectContext(socket, sessionId, correctif) {
    if (!sessionId || !correctif) return;

    try {
      const result = messageService.confirmContextCorrection(sessionId, correctif);
      this.io.to(sessionId).emit('resumeUpdated', { 
        sessionId, 
        resume: result.resume 
      });
    } catch (error) {
      socket.emit('error', { error: error.message });
    }
  }

  handleUpdateColor(socket, sessionId, pseudo, color) {
    if (!sessionId || !pseudo || !color) return;

    // Met à jour la couleur dans users
    const userId = Object.keys(gameService.users).find(id => 
      gameService.users[id]?.pseudo === pseudo
    );
    if (userId) {
      gameService.updateUserColor(userId, color);
    }

    // Met à jour la couleur dans la partie
    const partie = gameService.getParty(sessionId);
    if (partie) {
      partie.joueurs = partie.joueurs.map(j =>
        j.pseudo === pseudo ? { ...j, color } : j
      );
      this.io.to(sessionId).emit('playersUpdate', { players: partie.joueurs });
    }
  }

  handleDisconnect(socket) {
    // Pour chaque partie, retirer ce joueur si présent
    Object.values(gameService.parties).forEach(partie => {
      if (Array.isArray(partie.joueurs)) {
        const before = partie.joueurs.length;
        gameService.removeUserFromParty(partie.id, socket.pseudo);
        
        if (partie.joueurs.length !== before) {
          // Mise à jour pour tous les clients de la room
          this.io.to(partie.id).emit('playersUpdate', { players: partie.joueurs });
        }
      }
    });

    if (socket.sessionId && socket.pseudo) {
      socket.to(socket.sessionId).emit('info', `${socket.pseudo} a quitté la partie.`);
    }

    console.log('Un utilisateur s\'est déconnecté');
  }
}

module.exports = SocketHandler; 