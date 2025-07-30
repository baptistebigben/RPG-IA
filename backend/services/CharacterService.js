const dbManager = require('../config/database');

class CharacterService {
  constructor() {
    this.db = dbManager.getDatabase();
  }

  // Créer un nouveau personnage
  async createCharacter(userId, gameName, characterName) {
    const now = Date.now();
    
    try {
      const result = this.db.prepare(`
        INSERT INTO characters (userId, gameName, characterName, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, gameName, characterName, now, now);
      
      return {
        success: true,
        character: {
          id: result.lastInsertRowid,
          userId,
          gameName,
          characterName,
          createdAt: now,
          updatedAt: now
        }
      };
    } catch (error) {
      console.error('Erreur lors de la création du personnage:', error);
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return { success: false, error: 'Un personnage avec ce nom existe déjà' };
      }
      return { success: false, error: 'Erreur lors de la création du personnage' };
    }
  }

  // Obtenir tous les personnages d'un utilisateur pour un jeu
  async getUserCharacters(userId, gameName) {
    try {
      const results = this.db.prepare(`
        SELECT * FROM characters 
        WHERE userId = ? AND gameName = ?
        ORDER BY updatedAt DESC
      `).all(userId, gameName);

      return {
        success: true,
        characters: results
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des personnages:', error);
      return { success: false, error: 'Erreur lors de la récupération des personnages' };
    }
  }

  // Supprimer un personnage
  async deleteCharacter(userId, gameName, characterId) {
    try {
      // Supprimer d'abord les fiches de personnage associées
      this.db.prepare(`
        DELETE FROM character_sheets 
        WHERE userId = ? AND gameName = ? AND characterId = ?
      `).run(userId, gameName, characterId);

      // Puis supprimer le personnage
      const result = this.db.prepare(`
        DELETE FROM characters 
        WHERE userId = ? AND gameName = ? AND id = ?
      `).run(userId, gameName, characterId);

      if (result.changes > 0) {
        return { success: true, message: 'Personnage supprimé avec succès' };
      } else {
        return { success: false, error: 'Personnage non trouvé' };
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du personnage:', error);
      return { success: false, error: 'Erreur lors de la suppression du personnage' };
    }
  }

  // Obtenir un personnage par ID
  async getCharacter(userId, gameName, characterId) {
    try {
      const result = this.db.prepare(`
        SELECT * FROM characters 
        WHERE userId = ? AND gameName = ? AND id = ?
      `).get(userId, gameName, characterId);

      if (result) {
        return { success: true, character: result };
      } else {
        return { success: false, error: 'Personnage non trouvé' };
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du personnage:', error);
      return { success: false, error: 'Erreur lors de la récupération du personnage' };
    }
  }
}

module.exports = new CharacterService(); 