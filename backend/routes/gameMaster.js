const express = require('express');
const router = express.Router();
const CharacterSheetService = require('../services/CharacterSheetService');

// GET /api/game-master/character/:sessionId/:characterId
// Endpoint pour que le MJ IA consulte une fiche de personnage
router.get('/character/:sessionId/:characterId', async (req, res) => {
  try {
    const { sessionId, characterId } = req.params;
    
    // Pour l'instant, on récupère depuis la base de données
    // Plus tard, on pourra récupérer depuis le contexte de session en temps réel
    const characterSheets = await CharacterSheetService.getAllCharacterSheets();
    
    // Trouver la fiche du personnage
    const characterSheet = characterSheets.find(sheet => 
      sheet.characterId === parseInt(characterId)
    );
    
    if (!characterSheet) {
      return res.status(404).json({
        success: false,
        error: 'Fiche de personnage non trouvée'
      });
    }
    
    // Structurer les données pour le MJ IA
    const structuredData = extractStructuredDataForGM(characterSheet);
    
    res.json({
      success: true,
      character: {
        id: characterSheet.characterId,
        name: characterSheet.characterName,
        player: characterSheet.userId,
        game: characterSheet.gameName,
        ...structuredData,
        lastUpdated: new Date(characterSheet.updatedAt).toISOString()
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération de la fiche:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// GET /api/game-master/session/:sessionId/characters
// Endpoint pour récupérer tous les personnages d'une session
router.get('/session/:sessionId/characters', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Récupérer tous les personnages de la session
    const characterSheets = await CharacterSheetService.getAllCharacterSheets();
    
    // Structurer les données pour le MJ IA
    const characters = characterSheets.map(sheet => ({
      id: sheet.characterId,
      name: sheet.characterName,
      player: sheet.userId,
      game: sheet.gameName,
      ...extractStructuredDataForGM(sheet),
      lastUpdated: new Date(sheet.updatedAt).toISOString()
    }));
    
    res.json({
      success: true,
      sessionId: sessionId,
      characters: characters,
      count: characters.length
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des personnages:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// GET /api/game-master/character/:characterId/stats
// Endpoint pour récupérer uniquement les stats d'un personnage
router.get('/character/:characterId/stats', async (req, res) => {
  try {
    const { characterId } = req.params;
    
    const characterSheets = await CharacterSheetService.getAllCharacterSheets();
    const characterSheet = characterSheets.find(sheet => 
      sheet.characterId === parseInt(characterId)
    );
    
    if (!characterSheet) {
      return res.status(404).json({
        success: false,
        error: 'Fiche de personnage non trouvée'
      });
    }
    
    const structuredData = extractStructuredDataForGM(characterSheet);
    
    res.json({
      success: true,
      characterId: characterSheet.characterId,
      characterName: characterSheet.characterName,
      stats: structuredData.stats,
      combat: structuredData.combat,
      level: structuredData.character.level
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// Fonction pour extraire et structurer les données pour le MJ IA
function extractStructuredDataForGM(characterSheet) {
  const fields = characterSheet.pdfFields;
  
  return {
    stats: {
      strength: parseInt(fields['Strength'] || fields['Force'] || '0'),
      dexterity: parseInt(fields['Dexterity'] || fields['Dextérité'] || '0'),
      constitution: parseInt(fields['Constitution'] || '0'),
      intelligence: parseInt(fields['Intelligence'] || fields['Intelligence'] || '0'),
      wisdom: parseInt(fields['Wisdom'] || fields['Sagesse'] || '0'),
      charisma: parseInt(fields['Charisma'] || fields['Charisme'] || '0')
    },
    combat: {
      armorClass: parseInt(fields['ArmorClass'] || fields['Classe d\'armure'] || '0'),
      hitPoints: parseInt(fields['HitPoints'] || fields['Points de vie'] || '0'),
      initiative: parseInt(fields['Initiative'] || '0'),
      speed: parseInt(fields['Speed'] || fields['Vitesse'] || '0')
    },
    character: {
      name: fields['CharacterName 2'] || fields['Nom du personnage'] || characterSheet.characterName || '',
      class: fields['ClassLevel'] || fields['Classe et niveau'] || '',
      race: fields['Race'] || fields['Race'] || '',
      background: fields['Background'] || fields['Historique'] || '',
      alignment: fields['Alignment'] || fields['Alignement'] || '',
      level: parseInt(fields['Level'] || fields['Niveau'] || '1'),
      experience: parseInt(fields['ExperiencePoints'] || fields['Points d\'expérience'] || '0')
    },
    abilities: {
      features: fields['Features'] || fields['Aptitudes'] || '',
      proficiencies: fields['Proficiencies'] || fields['Maîtrises'] || '',
      languages: fields['Languages'] || fields['Langues'] || ''
    },
    equipment: {
      items: fields['Equipment'] || fields['Équipement'] || '',
      weapons: fields['Weapons'] || fields['Armes'] || '',
      armor: fields['Armor'] || fields['Armure'] || ''
    },
    // Données brutes pour accès complet
    rawFields: fields
  };
}

module.exports = router; 