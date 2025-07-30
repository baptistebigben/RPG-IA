const dbManager = require('../config/database');

class CharacterSheetService {
  constructor() {
    this.db = dbManager.getDatabase();
  }

  // Sauvegarder une fiche de personnage
  async saveCharacterSheet(userId, gameName, characterName, characterId, pdfFields) {
    const now = Date.now();
    
    console.log('💾 Service: Sauvegarde demandée pour:', {
      userId,
      gameName,
      characterName,
      characterId,
      pdfFieldsCount: Object.keys(pdfFields).length
    });
    
    try {
      // Vérifier si la fiche existe déjà
      const existing = this.db.prepare(`
        SELECT id FROM character_sheets 
        WHERE userId = ? AND gameName = ? AND characterId = ?
      `).get(userId, gameName, characterId);

      console.log('💾 Service: Fiche existante trouvée:', !!existing);

      if (existing) {
        // Mettre à jour la fiche existante
        const updateResult = this.db.prepare(`
          UPDATE character_sheets 
          SET characterName = ?, pdfFields = ?, updatedAt = ?
          WHERE userId = ? AND gameName = ? AND characterId = ?
        `).run(characterName, JSON.stringify(pdfFields), now, userId, gameName, characterId);
        
        console.log('💾 Service: Mise à jour effectuée, changements:', updateResult.changes);
        return { success: true, message: 'Fiche mise à jour avec succès' };
      } else {
        // Créer une nouvelle fiche
        const insertResult = this.db.prepare(`
          INSERT INTO character_sheets (userId, gameName, characterName, characterId, pdfFields, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(userId, gameName, characterName, characterId, JSON.stringify(pdfFields), now, now);
        
        console.log('💾 Service: Nouvelle fiche créée, ID:', insertResult.lastInsertRowid);
        return { success: true, message: 'Fiche créée avec succès' };
      }
    } catch (error) {
      console.error('💾 Service: Erreur lors de la sauvegarde de la fiche:', error);
      return { success: false, error: 'Erreur lors de la sauvegarde: ' + error.message };
    }
  }

  // Charger une fiche de personnage
  async loadCharacterSheet(userId, gameName, characterId) {
    try {
      const result = this.db.prepare(`
        SELECT * FROM character_sheets 
        WHERE userId = ? AND gameName = ? AND characterId = ?
      `).get(userId, gameName, characterId);

      if (result) {
        return {
          success: true,
          data: {
            ...result,
            pdfFields: JSON.parse(result.pdfFields)
          }
        };
      } else {
        return { success: false, error: 'Fiche non trouvée' };
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la fiche:', error);
      return { success: false, error: 'Erreur lors du chargement' };
    }
  }

  // Obtenir toutes les fiches d'un utilisateur pour un jeu
  async getUserCharacterSheets(userId, gameName) {
    try {
      const results = this.db.prepare(`
        SELECT * FROM character_sheets 
        WHERE userId = ? AND gameName = ?
        ORDER BY updatedAt DESC
      `).all(userId, gameName);

      return {
        success: true,
        data: results.map(result => ({
          ...result,
          pdfFields: JSON.parse(result.pdfFields)
        }))
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des fiches:', error);
      return { success: false, error: 'Erreur lors de la récupération' };
    }
  }

  // Supprimer une fiche de personnage
  async deleteCharacterSheet(userId, gameName, characterId) {
    try {
      const result = this.db.prepare(`
        DELETE FROM character_sheets 
        WHERE userId = ? AND gameName = ? AND characterId = ?
      `).run(userId, gameName, characterId);

      if (result.changes > 0) {
        return { success: true, message: 'Fiche supprimée avec succès' };
      } else {
        return { success: false, error: 'Fiche non trouvée' };
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la fiche:', error);
      return { success: false, error: 'Erreur lors de la suppression' };
    }
  }

  // Obtenir toutes les fiches de personnages (pour le MJ IA)
  async getAllCharacterSheets() {
    try {
      const results = this.db.prepare(`
        SELECT * FROM character_sheets 
        ORDER BY updatedAt DESC
      `).all();

      return results.map(result => ({
        ...result,
        pdfFields: JSON.parse(result.pdfFields)
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération de toutes les fiches:', error);
      return [];
    }
  }
}

module.exports = new CharacterSheetService(); 