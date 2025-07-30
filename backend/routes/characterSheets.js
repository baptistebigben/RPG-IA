const express = require('express');
const router = express.Router();
const CharacterSheetService = require('../services/CharacterSheetService');

// Sauvegarder une fiche de personnage
router.post('/save', async (req, res) => {
  console.log('📋 Requête de sauvegarde reçue:', req.body);
  
  try {
    const { userId, gameName, characterName, characterId, pdfFields } = req.body;
    
    console.log('📋 Données reçues:', {
      userId,
      gameName,
      characterName,
      characterId,
      pdfFieldsCount: pdfFields ? Object.keys(pdfFields).length : 0
    });
    
    if (!userId || !gameName || !characterName || !characterId || !pdfFields) {
      console.log('📋 Données manquantes:', { userId, gameName, characterName, characterId, hasPdfFields: !!pdfFields });
      return res.status(400).json({ 
        error: 'Tous les champs sont requis: userId, gameName, characterName, characterId, pdfFields' 
      });
    }

    const result = await CharacterSheetService.saveCharacterSheet(
      userId, 
      gameName, 
      characterName, 
      characterId, 
      pdfFields
    );

    console.log('📋 Résultat de la sauvegarde:', result);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('📋 Erreur lors de la sauvegarde:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Charger une fiche de personnage
router.get('/load/:userId/:gameName/:characterId', async (req, res) => {
  try {
    const { userId, gameName, characterId } = req.params;
    
    const result = await CharacterSheetService.loadCharacterSheet(
      userId, 
      gameName, 
      parseInt(characterId)
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Erreur lors du chargement:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Obtenir toutes les fiches d'un utilisateur pour un jeu
router.get('/user/:userId/:gameName', async (req, res) => {
  try {
    const { userId, gameName } = req.params;
    
    const result = await CharacterSheetService.getUserCharacterSheets(userId, gameName);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Supprimer une fiche de personnage
router.delete('/delete/:userId/:gameName/:characterId', async (req, res) => {
  try {
    const { userId, gameName, characterId } = req.params;
    
    const result = await CharacterSheetService.deleteCharacterSheet(
      userId, 
      gameName, 
      parseInt(characterId)
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route de test pour vérifier la base de données
router.get('/test', async (req, res) => {
  try {
    const db = require('../config/database').getDatabase();
    const testResult = db.prepare('SELECT COUNT(*) as count FROM character_sheets').get();
    res.json({ 
      success: true, 
      message: 'Base de données accessible',
      characterSheetsCount: testResult.count
    });
  } catch (error) {
    console.error('Erreur test base de données:', error);
    res.status(500).json({ error: 'Erreur base de données: ' + error.message });
  }
});

module.exports = router; 