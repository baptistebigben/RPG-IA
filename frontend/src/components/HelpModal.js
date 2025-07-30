import React from 'react';

const HelpModal = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="help-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">📚 Aide & Guide utilisateur</h2>
          <button onClick={onClose} className="modal-close" title="Fermer">
            ×
          </button>
        </div>
        
        <div className="modal-content">
          <div className="help-section">
            <h3 className="help-section-title">🎮 Gestion des parties</h3>
            <ul className="help-list">
              <li><strong>Créer une partie :</strong> Saisissez un nom puis cliquez sur « Créer une partie ».</li>
              <li><strong>Rejoindre une partie :</strong> Cliquez sur « Rejoindre » dans la liste ou entrez l'ID d'une partie à rejoindre.</li>
              <li><strong>Renommer une partie :</strong> Seul le propriétaire ou l'admin peut renommer une partie (bouton « Renommer »).</li>
              <li><strong>Supprimer une partie :</strong> Seul l'admin peut supprimer une partie (bouton « Supprimer »).</li>
            </ul>
          </div>

          <div className="help-section">
            <h3 className="help-section-title">👥 Droits et permissions</h3>
            <ul className="help-list">
              <li><strong>Propriétaire :</strong> Le créateur de la partie est affiché à côté du nom. Il a des droits spéciaux sur sa partie.</li>
              <li><strong>Admin :</strong> Le pseudo <code>admin</code> a tous les droits (voir, renommer, supprimer toutes les parties).</li>
              <li><strong>Parties récentes :</strong> Les 5 dernières parties auxquelles vous avez accédé sont listées pour un accès rapide.</li>
            </ul>
          </div>

          <div className="help-section">
            <h3 className="help-section-title">💬 Commandes du chat</h3>
            <ul className="help-list">
              <li><code>/roll 2d6+1 & 1d20</code> : Lance les dés (voir détails dans l'aide du MJ).</li>
              <li><code>/start</code> : Lance l'aventure avec le MJ IA.</li>
              <li><code>/help</code> : Affiche l'aide des commandes disponibles.</li>
              <li><code>/resume</code> : Demande un résumé de la partie.</li>
              <li><code>/message ...</code> : Envoie un message privé au MJ IA.</li>
            </ul>
          </div>

          <div className="help-section">
            <h3 className="help-section-title">ℹ️ Informations générales</h3>
            <ul className="help-list">
              <li><strong>Sessions indépendantes :</strong> Chaque onglet est une session différente. Votre pseudo et vos droits sont propres à l'onglet.</li>
              <li><strong>Déconnexion :</strong> Le bouton « Déconnexion » efface la session de l'onglet.</li>
              <li><strong>Astuce :</strong> Si vous rencontrez un problème, rechargez la page ou reconnectez-vous.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal; 