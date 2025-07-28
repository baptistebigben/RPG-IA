import React from 'react';

const HelpModal = ({ onClose }) => {
  return (
    <div style={{ 
      position: 'fixed', 
      top: 60, 
      right: 40, 
      zIndex: 1000, 
      background: '#fff8e1', 
      border: '2px solid #6d2e7a', 
      borderRadius: 12, 
      boxShadow: '2px 2px 12px #8888', 
      padding: 24, 
      maxWidth: 480 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b style={{ fontSize: 20, color: '#6d2e7a' }}>Aide & Guide utilisateur</b>
        <button 
          onClick={onClose} 
          style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: 22, 
            color: '#a00', 
            cursor: 'pointer' 
          }} 
          title="Fermer"
        >
          ×
        </button>
      </div>
      <div style={{ marginTop: 10, fontSize: 15, color: '#3e2723', lineHeight: 1.6 }}>
        <ul>
          <li><b>Créer une partie :</b> Saisissez un nom puis cliquez sur « Créer une partie ».</li>
          <li><b>Rejoindre une partie :</b> Cliquez sur « Rejoindre » dans la liste ou entrez l'ID d'une partie à rejoindre.</li>
          <li><b>Renommer une partie :</b> Seul le propriétaire ou l'admin peut renommer une partie (bouton « Renommer »).</li>
          <li><b>Supprimer une partie :</b> Seul l'admin peut supprimer une partie (bouton « Supprimer »).</li>
          <li><b>Propriétaire :</b> Le créateur de la partie est affiché à côté du nom. Il a des droits spéciaux sur sa partie.</li>
          <li><b>Admin :</b> Le pseudo <b>admin</b> a tous les droits (voir, renommer, supprimer toutes les parties).</li>
          <li><b>Parties récentes :</b> Les 5 dernières parties auxquelles vous avez accédé sont listées pour un accès rapide.</li>
          <li><b>Sessions indépendantes :</b> Chaque onglet est une session différente. Votre pseudo et vos droits sont propres à l'onglet.</li>
          <li><b>Commandes du chat :</b>
            <ul>
              <li><b>/roll 2d6+1 & 1d20</b> : Lance les dés (voir détails dans l'aide du MJ).</li>
              <li><b>/start</b> : Lance l'aventure avec le MJ IA.</li>
              <li><b>/help</b> : Affiche l'aide des commandes disponibles.</li>
              <li><b>/resume</b> : Demande un résumé de la partie.</li>
              <li><b>/message ...</b> : Envoie un message privé au MJ IA.</li>
            </ul>
          </li>
          <li><b>Déconnexion :</b> Le bouton « Déconnexion » efface la session de l'onglet.</li>
          <li><b>Astuce :</b> Si vous rencontrez un problème, rechargez la page ou reconnectez-vous.</li>
        </ul>
      </div>
    </div>
  );
};

export default HelpModal; 