const Session = require('../models/Session');
const aiService = require('../config/ai');
const gameService = require('./GameService');

class MessageService {
  constructor() {
    this.commandHandlers = {
      '/start': this.handleStart.bind(this),
      '/help': this.handleHelp.bind(this),
      '/resume': this.handleResume.bind(this),
      '/correctStory': this.handleCorrectStory.bind(this),
      '/message': this.handleMessage.bind(this),
      '/roll': this.handleRoll.bind(this),
      '/correctContext': this.handleCorrectContext.bind(this)
    };
  }

  async processMessage(sessionId, auteur, contenu, destinataires = null) {
    // Nettoyer le contenu (enlever les espaces en début et fin)
    contenu = contenu.trim();
    
    console.log('🔍 MessageService.processMessage:', { sessionId, auteur, contenu, destinataires });
    
    // Ajouter le message à la base de données
    const result = Session.addMessage(sessionId, auteur, contenu, destinataires);
    const messageId = result.lastInsertRowid;
    console.log('📝 Message ajouté à la DB, ID:', messageId);

    // Traiter les commandes
    if (contenu.startsWith('/')) {
      console.log('⚡ Commande détectée:', contenu);
      return await this.handleCommand(sessionId, auteur, contenu, destinataires, messageId);
    }

    // Message normal - mettre à jour le résumé si nécessaire
    this.updateResumeIfNeeded(sessionId);
    console.log('✅ Message normal traité');

    return { messageId, type: 'normal' };
  }

  async handleCommand(sessionId, auteur, contenu, destinataires, messageId) {
    const [command, ...args] = contenu.split(' ');
    console.log('🎯 handleCommand:', { command, args });
    
    const handler = this.commandHandlers[command];
    console.log('🔧 Handler trouvé:', !!handler);

    if (handler) {
      return await handler(sessionId, auteur, args.join(' '), destinataires, messageId);
    }

    // Commande inconnue
    console.log('❌ Commande inconnue:', command);
    const reponseMJ = "Commande inconnue. Tapez /help pour la liste des commandes.";
    Session.addMessage(sessionId, 'MJ', reponseMJ, destinataires);
    return { messageId, type: 'command', reponseMJ };
  }

  async handleStart(sessionId, auteur, args, destinataires, messageId) {
    const promptSystem = Session.getSessionContext(sessionId)?.find(m => m.role === 'system')?.content || '';
    const introPrompt = [
      { role: 'system', content: promptSystem },
      { role: 'user', content: "Lance l'aventure, présente l'univers, le contexte, les enjeux pour les joueurs. Sois immersif et en français." }
    ];

    try {
      const reponseMJ = await aiService.generateResponse(introPrompt);
      Session.addMessage(sessionId, 'MJ', reponseMJ, destinataires);
      this.updateResumeIfNeeded(sessionId);
      return { messageId, type: 'command', reponseMJ };
    } catch (error) {
      const reponseMJ = "Erreur lors du lancement de l'aventure : " + error.message;
      Session.addMessage(sessionId, 'MJ', reponseMJ, destinataires);
      return { messageId, type: 'command', reponseMJ };
    }
  }

  handleHelp(sessionId, auteur, args, destinataires, messageId) {
    const reponseMJ = "Commandes disponibles : /start (introduction), /resume (résumé de la partie), /help (cette aide).";
    Session.addMessage(sessionId, 'MJ', reponseMJ, destinataires);
    return { messageId, type: 'command', reponseMJ };
  }

  async handleResume(sessionId, auteur, args, destinataires, messageId) {
    const context = Session.getSessionContext(sessionId) || [];
    const resumePrompt = [
      ...context,
      { role: 'user', content: "Fais un résumé de l'aventure en cours pour les joueurs, en français." }
    ];

    try {
      const reponseMJ = await aiService.generateResponse(resumePrompt);
      Session.addMessage(sessionId, 'MJ', reponseMJ, destinataires);
      this.updateResumeIfNeeded(sessionId);
      return { messageId, type: 'command', reponseMJ };
    } catch (error) {
      const reponseMJ = "Erreur lors de la génération du résumé : " + error.message;
      Session.addMessage(sessionId, 'MJ', reponseMJ, destinataires);
      return { messageId, type: 'command', reponseMJ };
    }
  }

  async handleCorrectStory(sessionId, auteur, correctif, destinataires, messageId) {
    if (!correctif) {
      const reponseMJ = "Correctif vide. Utilisez : /correctStory [votre correction]";
      Session.addMessage(sessionId, 'MJ', reponseMJ, destinataires);
      return { messageId, type: 'command', reponseMJ };
    }

    try {
      const interpretation = await aiService.interpretContextCorrection(
        Session.getSessionContext(sessionId) || [], 
        correctif
      );
      Session.addMessage(sessionId, 'MJ', interpretation, destinataires);
      this.updateResumeIfNeeded(sessionId);
      return { messageId, type: 'command', reponseMJ: interpretation };
    } catch (error) {
      const reponseMJ = "Erreur lors de l'appel à l'IA pour la correction : " + error.message;
      Session.addMessage(sessionId, 'MJ', reponseMJ, destinataires);
      return { messageId, type: 'command', reponseMJ };
    }
  }

  async handleMessage(sessionId, auteur, action, destinataires, messageId) {
    console.log('🤖 handleMessage appelé avec:', { sessionId, auteur, action, destinataires, messageId });
    
    const context = Session.getSessionContext(sessionId) || [];
    context.push({ role: 'user', content: action });
    console.log('📋 Contexte préparé:', context.length, 'messages');

    try {
      const reponseMJ = await aiService.generateResponse(context);
      console.log('🤖 Réponse IA générée:', reponseMJ.substring(0, 100) + '...');
      
      Session.addMessage(sessionId, 'MJ', reponseMJ, destinataires);
      this.updateResumeIfNeeded(sessionId);
      return { messageId, type: 'command', reponseMJ };
    } catch (error) {
      console.error('❌ Erreur dans handleMessage:', error);
      const reponseMJ = "Erreur lors de l'appel à l'IA : " + error.message;
      Session.addMessage(sessionId, 'MJ', reponseMJ, destinataires);
      return { messageId, type: 'command', reponseMJ };
    }
  }

  handleRoll(sessionId, auteur, rollCmd, destinataires, messageId) {
    const groups = rollCmd.split('&').map(g => g.trim());
    let resultText = '';

    for (const group of groups) {
      const match = group.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
      if (!match) {
        resultText += `Syntaxe invalide pour : ${group}\n`;
        continue;
      }

      const nb = parseInt(match[1] || '1', 10);
      const faces = parseInt(match[2], 10);
      const mod = match[3] ? parseInt(match[3], 10) : 0;
      const rolls = [];

      for (let i = 0; i < nb; i++) {
        rolls.push(Math.floor(Math.random() * faces) + 1);
      }

      const total = rolls.reduce((a, b) => a + b, 0) + mod;
      resultText += `🎲 ${group} : [${rolls.join(', ')}]`;
      if (mod) resultText += (mod > 0 ? ` +${mod}` : ` ${mod}`);
      resultText += ` = **${total}**\n`;
    }

    Session.addMessage(sessionId, 'Système', resultText, destinataires);
    return { messageId, type: 'roll', reponseMJ: resultText };
  }

  async handleCorrectContext(sessionId, auteur, correctif, destinataires, messageId) {
    if (!correctif) {
      throw new Error('Correctif vide');
    }

    try {
      const interpretation = await aiService.interpretContextCorrection(
        Session.getSessionContext(sessionId) || [], 
        correctif
      );
      return { messageId, type: 'correctContext', interpretation, correctif };
    } catch (error) {
      throw new Error("Erreur lors de l'appel à Groq: " + error.message);
    }
  }

  confirmContextCorrection(sessionId, correctif) {
    const session = Session.getById(sessionId);
    if (!session) {
      throw new Error('Session non trouvée');
    }

    const nouveauResume = session.resume ? 
      session.resume + ' | Correction : ' + correctif : 
      'Correction : ' + correctif;

    Session.updateResume(sessionId, nouveauResume);
    return { sessionId, resume: nouveauResume };
  }

  updateResumeIfNeeded(sessionId) {
    gameService.incrementResumeCounter(sessionId);
    if (gameService.shouldUpdateResume(sessionId)) {
      gameService.updateSessionResume(sessionId).catch(e => 
        console.error('Erreur MAJ résumé :', e)
      );
    }
  }

  getMessages(sessionId) {
    return Session.getMessages(sessionId);
  }
}

module.exports = new MessageService(); 