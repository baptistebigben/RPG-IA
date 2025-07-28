const express = require('express');
const router = express.Router();
const gameService = require('../services/GameService');

// Créer une partie
router.post('/', (req, res) => {
  const { nom, mjId, pseudo, version } = req.body;
  
  if (!nom || typeof nom !== 'string' || nom.trim() === '') {
    return res.status(400).json({ error: 'Nom de partie invalide' });
  }
  if (!mjId || !gameService.getUser(mjId)) {
    return res.status(400).json({ error: 'MJ invalide' });
  }
  if (!pseudo || typeof pseudo !== 'string') {
    return res.status(400).json({ error: 'Propriétaire manquant' });
  }
  if (!version || typeof version !== 'string') {
    return res.status(400).json({ error: 'Version du jeu de rôle obligatoire' });
  }

  try {
    const partie = gameService.createParty(nom, mjId, pseudo, version);
    res.json(partie);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lister les parties
router.get('/', (req, res) => {
  res.json(gameService.getAllParties());
});

// Rejoindre une partie
router.post('/:id/rejoindre', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    const partie = gameService.joinParty(id, userId);
    res.json(partie);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Renommer une partie
router.post('/:id/rename', (req, res) => {
  const { id } = req.params;
  const { nom, pseudo } = req.body;

  if (!nom || typeof nom !== 'string' || nom.trim() === '') {
    return res.status(400).json({ error: 'Nom de partie invalide' });
  }

  try {
    const result = gameService.renameParty(id, nom, pseudo);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Supprimer une partie
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const { pseudo } = req.body;

  try {
    const result = gameService.deleteParty(id, pseudo);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 