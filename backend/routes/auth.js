const express = require('express');
const router = express.Router();
const gameService = require('../services/GameService');

// Login utilisateur
router.post('/login', (req, res) => {
  const { pseudo, userId, color } = req.body;
  
  if (!pseudo || typeof pseudo !== 'string' || pseudo.trim() === '') {
    return res.status(400).json({ error: 'Pseudo invalide' });
  }

  // Vérifier si le pseudo est déjà pris
  const existingUserId = Object.keys(gameService.users).find(id => 
    gameService.users[id]?.pseudo === pseudo
  );

  if (existingUserId) {
    // Vérifier s'il y a une socket active pour ce pseudo
    const isStillConnected = Object.values(global.io?.sockets?.sockets || {}).some(s => s.pseudo === pseudo);
    if (!isStillConnected) {
      // Libérer le pseudo et permettre la reconnexion
      delete gameService.users[existingUserId];
    } else {
      return res.status(409).json({ error: 'Ce pseudo est déjà utilisé' });
    }
  }

  // Nouveau pseudo ou reconnexion
  const newUserId = userId || (Date.now() + Math.random().toString(36).substr(2, 9));
  gameService.addUser(newUserId, pseudo, color);
  
  res.json({ userId: newUserId, pseudo });
});

// Endpoint temporaire pour lister les pseudos connus
router.get('/users', (req, res) => {
  res.json(Object.values(gameService.users));
});

module.exports = router; 