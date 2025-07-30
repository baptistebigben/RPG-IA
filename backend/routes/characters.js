const express = require('express');
const router = express.Router();
const CharacterService = require('../services/CharacterService');

// Créer un nouveau personnage
router.post('/create', async (req, res) => {
  try {
    const { userId, gameName, characterName } = req.body;
    
    if (!userId || !gameName || !characterName) {
      return res.status(400).json({ 
        error: 'Tous les champs sont requis: userId, gameName, characterName' 
      });
    }

    const result = await CharacterService.createCharacter(userId, gameName, characterName);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur lors de la création du personnage:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Obtenir tous les personnages d'un utilisateur pour un jeu
router.get('/user/:userId/:gameName', async (req, res) => {
  try {
    const { userId, gameName } = req.params;
    
    const result = await CharacterService.getUserCharacters(userId, gameName);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des personnages:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Supprimer un personnage
router.delete('/delete/:userId/:gameName/:characterId', async (req, res) => {
  try {
    const { userId, gameName, characterId } = req.params;
    
    const result = await CharacterService.deleteCharacter(userId, gameName, parseInt(characterId));

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du personnage:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Obtenir un personnage par ID
router.get('/:userId/:gameName/:characterId', async (req, res) => {
  try {
    const { userId, gameName, characterId } = req.params;
    
    const result = await CharacterService.getCharacter(userId, gameName, parseInt(characterId));

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du personnage:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router; 