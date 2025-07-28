const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const messageService = require('../services/MessageService');

// Récupérer l'historique des messages d'une session
router.get('/:sessionId/messages', (req, res) => {
  const { sessionId } = req.params;
  const messages = messageService.getMessages(sessionId);
  res.json(messages);
});

// Envoyer un message
router.post('/:sessionId/message', async (req, res) => {
  const { sessionId } = req.params;
  const { auteur, contenu } = req.body;

  if (!auteur || typeof auteur !== 'string' || !contenu || typeof contenu !== 'string') {
    return res.status(400).json({ error: 'Auteur ou contenu manquant' });
  }

  try {
    const result = await messageService.processMessage(sessionId, auteur, contenu);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mettre à jour le résumé de la session
router.put('/:sessionId/resume', (req, res) => {
  const { sessionId } = req.params;
  const { resume } = req.body;

  if (typeof resume !== 'string' || resume.trim() === '') {
    return res.status(400).json({ error: 'Résumé invalide' });
  }

  try {
    Session.updateResume(sessionId, resume);
    res.json({ sessionId, resume });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Confirmer et appliquer le correctif de contexte
router.post('/:sessionId/confirm-correctContext', (req, res) => {
  const { sessionId } = req.params;
  const { correctif } = req.body;

  if (!correctif || typeof correctif !== 'string' || correctif.trim() === '') {
    return res.status(400).json({ error: 'Correctif manquant' });
  }

  try {
    const result = messageService.confirmContextCorrection(sessionId, correctif);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Discuter avec le MJ virtuel
router.post('/:sessionId/ask-mj', async (req, res) => {
  const { sessionId } = req.params;
  const { auteur, contenu } = req.body;

  if (!auteur || typeof auteur !== 'string' || !contenu || typeof contenu !== 'string') {
    return res.status(400).json({ error: 'Auteur ou contenu manquant' });
  }

  try {
    const result = await messageService.processMessage(sessionId, auteur, contenu);
    res.json({ reponseMJ: result.reponseMJ });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 