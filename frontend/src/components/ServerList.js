import React, { useState, useEffect } from 'react';
import CharacterSheetPDF from './CharacterSheetPDF';
import CharacterSheetPDFAdvanced from './CharacterSheetPDFAdvanced';

const ServerList = ({ 
  parties, 
  pseudo, 
  onJoin, 
  onRename, 
  onDelete, 
  onLogout, 
  onShowHelp 
}) => {
  const [newPartieNom, setNewPartieNom] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [joinId, setJoinId] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [activeTab, setActiveTab] = useState('servers');
  const [selectedGame, setSelectedGame] = useState('Donjons & Dragons 5');
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showCreateCharacter, setShowCreateCharacter] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [characters, setCharacters] = useState({});
  const [characterData, setCharacterData] = useState(null);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  
  // Charger les personnages au montage du composant
  useEffect(() => {
    if (selectedGame) {
      loadCharactersForGame(selectedGame);
    }
  }, []);

  const [recentParties, setRecentParties] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('recentParties') || '[]');
    } catch {
      return [];
    }
  });

  const RPG_VERSIONS = [
    'Donjons & Dragons 5',
    'Deadlands: Reloaded',
    'L\'Appel de Cthulhu 7e',
    'Pathfinder 2',
    'Chroniques Oubliées',
    'Cthulhu Hack',
    'Starfinder'
  ];

  const handleCreatePartie = async () => {
    if (!selectedVersion) return;
    const nom = newPartieNom.trim() || `Partie de ${pseudo}`;
    const res = await fetch('/parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, mjId: 'temp', pseudo, version: selectedVersion })
    });
    const partie = await res.json();
    onJoin(partie.id);
    setNewPartieNom('');
    setSelectedVersion('');
  };

  const handleRenamePartie = async (id, e) => {
    if (e) e.preventDefault();
    const nom = renameValue.trim();
    if (!nom) return;
    
    const res = await fetch(`/parties/${id}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, pseudo })
    });
    
    if (res.ok) {
      setRenamingId(null);
      setRenameValue('');
      window.location.reload();
    } else {
      const err = await res.json();
      alert(err.error || "Erreur lors du renommage de la partie.");
    }
  };

  const handleDeletePartie = async (id) => {
    const res = await fetch(`/parties/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo })
    });
    
    if (res.ok) {
      setDeleteConfirmId(null);
      window.location.reload();
    } else {
      const err = await res.json();
      alert(err.error || "Erreur lors de la suppression de la partie.");
    }
  };

  const handleJoin = (id) => {
    onJoin(id);
    const partie = parties.find(p => p && p.id === id);
    if (partie && typeof partie.id === 'string' && typeof partie.nom === 'string') {
      let recents = recentParties.filter(p => p && p.id !== id);
      recents.unshift({ id: partie.id, nom: partie.nom });
      if (recents.length > 5) recents = recents.slice(0, 5);
      setRecentParties(recents);
      sessionStorage.setItem('recentParties', JSON.stringify(recents));
    }
  };

  const handleGameSelect = async (gameName) => {
    setSelectedGame(gameName);
    setSelectedCharacter(null);
    setShowCreateCharacter(false);
    await loadCharactersForGame(gameName);
  };

  const handleCharacterSelect = (character) => {
    setSelectedCharacter(character);
    setShowCreateCharacter(false);
  };

  const handleCreateNewCharacter = () => {
    setShowCreateCharacter(true);
    setSelectedCharacter(null);
    setNewCharacterName('');
  };

  const loadCharactersForGame = async (gameName) => {
    setLoadingCharacters(true);
    try {
      const response = await fetch(`/characters/user/${pseudo}/${encodeURIComponent(gameName)}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCharacters(prev => ({
            ...prev,
            [gameName]: result.characters
          }));
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des personnages:', error);
    } finally {
      setLoadingCharacters(false);
    }
  };

  const handleCreateCharacter = async () => {
    if (!newCharacterName.trim()) return;
    
    try {
      const response = await fetch('/characters/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: pseudo,
          gameName: selectedGame,
          characterName: newCharacterName.trim()
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Ajouter le nouveau personnage à la liste
          setCharacters(prev => ({
            ...prev,
            [selectedGame]: [...(prev[selectedGame] || []), result.character]
          }));
          
          // Sélectionner automatiquement le nouveau personnage
          setSelectedCharacter(result.character);
          setShowCreateCharacter(false);
          setNewCharacterName('');
        } else {
          alert(result.error || 'Erreur lors de la création du personnage');
        }
      } else {
        alert('Erreur lors de la création du personnage');
      }
    } catch (error) {
      console.error('Erreur lors de la création du personnage:', error);
      alert('Erreur lors de la création du personnage');
    }
  };

  // Fonction pour obtenir les personnages d'un jeu
  const getCharactersForGame = (gameName) => {
    return characters[gameName] || [];
  };

  const handleDeleteCharacter = async (characterId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce personnage ?')) return;
    
    try {
      const response = await fetch(`/characters/delete/${pseudo}/${encodeURIComponent(selectedGame)}/${characterId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Retirer le personnage de la liste
        setCharacters(prev => ({
          ...prev,
          [selectedGame]: prev[selectedGame].filter(c => c.id !== characterId)
        }));
        
        // Désélectionner si c'était le personnage sélectionné
        if (selectedCharacter && selectedCharacter.id === characterId) {
          setSelectedCharacter(null);
        }
      } else {
        alert('Erreur lors de la suppression du personnage');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du personnage:', error);
      alert('Erreur lors de la suppression du personnage');
    }
  };

  return (
    <div className="server-list-container">
      {/* Header avec boutons */}
      <div className="server-header">
        <h1 className="server-title">Bienvenue, {pseudo}</h1>
        <div className="server-actions">
          <button onClick={onLogout} className="btn-discord danger">
            Déconnexion
          </button>
          <button onClick={onShowHelp} className="btn-discord outline" title="Aide">
            ?
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="server-tabs">
        <button 
          onClick={() => setActiveTab('servers')}
          className={`tab-button ${activeTab === 'servers' ? 'active' : ''}`}
        >
          🎮 Serveurs
        </button>
        <button 
          onClick={() => setActiveTab('character')}
          className={`tab-button ${activeTab === 'character' ? 'active' : ''}`}
        >
          👤 Personnage
        </button>
      </div>

      {/* Contenu de l'onglet Serveurs */}
      {activeTab === 'servers' && (
                 <div className="server-content">
           {/* Conteneur pour les formulaires côte à côte */}
           <div className="party-forms-container">
             {/* Créer une partie */}
             <div className="card-discord">
               <div className="section-title">➕ Créer une nouvelle partie</div>
               <div className="create-party-form">
                 <input
                   value={newPartieNom}
                   onChange={e => setNewPartieNom(e.target.value)}
                   placeholder="Nom de la partie"
                   className="form-input"
                 />
                 <select
                   value={selectedVersion}
                   onChange={e => setSelectedVersion(e.target.value)}
                   className="form-select"
                 >
                   <option value="">Choisir la version du jeu de rôle...</option>
                   {RPG_VERSIONS.map(v => (
                     <option key={v} value={v}>{v}</option>
                   ))}
                 </select>
                 <button 
                   onClick={handleCreatePartie} 
                   disabled={!selectedVersion}
                   className={`btn-discord ${!selectedVersion ? 'disabled' : ''}`}
                 >
                   Créer une partie
                 </button>
               </div>
             </div>

             {/* Rejoindre par ID */}
             <div className="card-discord">
               <div className="section-title">🔗 Rejoindre une partie</div>
               <div className="join-party-form">
                 <input
                   value={joinId}
                   onChange={e => setJoinId(e.target.value)}
                   placeholder="ID de partie à rejoindre"
                   className="form-input"
                 />
                 <button 
                   onClick={() => handleJoin(joinId)} 
                   disabled={!joinId}
                   className={`btn-discord ${!joinId ? 'disabled' : ''}`}
                 >
                   Rejoindre
                 </button>
               </div>
             </div>
           </div>

          {/* Parties récentes */}
          <div className="card-discord">
            <div className="section-title">⏰ Parties récentes</div>
            <div className="parties-table">
              {!Array.isArray(recentParties) || recentParties.length === 0 ? (
                <div className="empty-state">
                  Aucune partie récente
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>ID</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentParties.filter(p => p && typeof p === 'object').map((p, idx) => (
                                             <tr key={typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : idx}>
                         <td>{typeof p.nom === 'string' ? p.nom : '[corrompu]'}</td>
                         <td className="party-id">{typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : '[corrompu]'}</td>
                                                 <td>
                           <button 
                             onClick={() => {
                               const id = typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : null;
                               if (id) handleJoin(id);
                             }}
                             className="btn-discord success"
                           >
                             Rejoindre
                           </button>
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Parties existantes */}
          <div className="card-discord">
            <div className="section-title">🎯 Parties existantes</div>
            <div className="parties-table">
              {!Array.isArray(parties) || parties.length === 0 ? (
                <div className="empty-state">
                  Aucune partie disponible
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>ID</th>
                      <th>MJ</th>
                      <th>Joueurs</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parties.filter(p => p && typeof p === 'object').map((p, idx) => (
                                             <tr key={typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : idx}>
                        <td>
                                                     {renamingId === (typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : null) ? (
                             <form onSubmit={e => {
                               const id = typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : null;
                               if (id) handleRenamePartie(id, e);
                             }} className="rename-form">
                              <input
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                className="form-input"
                                autoFocus
                              />
                              <button type="submit" className="btn-discord success">✓</button>
                              <button 
                                type="button" 
                                onClick={() => { setRenamingId(null); setRenameValue(''); }}
                                className="btn-discord outline"
                              >
                                ✕
                              </button>
                            </form>
                          ) : (
                            <div className="party-name">
                              <strong>{typeof p.nom === 'string' ? p.nom : '[corrompu]'}</strong>
                              {p.proprietaire && typeof p.proprietaire === 'string' && (
                                <span className="owner-badge">
                                  Propriétaire: {p.proprietaire}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="party-id">{typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : '[corrompu]'}</td>
                        <td>{typeof p.mjId === 'string' ? p.mjId : '[corrompu]'}</td>
                        <td>{(() => {
                          if (!Array.isArray(p.joueurs)) return '[corrompu]';
                          
                          // Compter seulement les joueurs valides
                          let count = 0;
                          p.joueurs.forEach(player => {
                            if (typeof player === 'string' || (player && typeof player === 'object' && typeof player.pseudo === 'string')) {
                              count++;
                            }
                          });
                          return count;
                        })()}</td>
                        <td>
                                                     <div className="party-actions">
                             <button 
                               onClick={() => {
                                 const id = typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : null;
                                 if (id) handleJoin(id);
                               }}
                               className="btn-discord success"
                             >
                               Rejoindre
                             </button>
                                                         {(pseudo === 'admin' || (typeof p.proprietaire === 'string' && pseudo === p.proprietaire)) && (
                               <button 
                                 onClick={() => { 
                                   const id = typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : null;
                                   const nom = typeof p.nom === 'string' ? p.nom : '';
                                   if (id) {
                                     setRenamingId(id); 
                                     setRenameValue(nom); 
                                   }
                                 }}
                                 className="btn-discord outline"
                               >
                                 Renommer
                               </button>
                             )}
                             {pseudo === 'admin' && (
                               <button 
                                 onClick={() => {
                                   const id = typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : null;
                                   if (id) setDeleteConfirmId(id);
                                 }}
                                 className="btn-discord danger"
                               >
                                 Supprimer
                               </button>
                             )}
                          </div>
                                                     {deleteConfirmId === (typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : null) && (
                            <div className="delete-confirmation">
                              <span>Confirmer ?</span>
                                                             <button 
                                 onClick={() => {
                                   const id = typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : null;
                                   if (id) handleDeletePartie(id);
                                 }}
                                 className="btn-discord danger"
                               >
                                 Oui
                               </button>
                              <button 
                                onClick={() => setDeleteConfirmId(null)}
                                className="btn-discord outline"
                              >
                                Non
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contenu de l'onglet Personnage */}
      {activeTab === 'character' && (
        <div className="character-content">
          <div className="character-sheet-container">
            {/* Sélection du jeu de rôle (20%) */}
            <div className="game-selection-panel">
              <div className="section-title">🎲 Jeux de rôle</div>
              <div className="game-list">
                {RPG_VERSIONS.map((game, index) => {
                  const gameIcons = ['⚔️', '🌵', '🐙', '⚡', '🏰', '🔮', '🚀'];
                  const isActive = selectedGame === game;
                  
                  return (
                    <div 
                      key={game}
                      className={`game-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleGameSelect(game)}
                    >
                      <div className="game-icon">{gameIcons[index] || '🎲'}</div>
                      <div className="game-info">
                        <div className="game-name">{game}</div>
                        <div className="game-status">
                          {isActive ? 'Actif' : 'Disponible'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

                         {/* Fiche de personnage (80%) */}
             <div className="character-sheet-panel">
               <div className="section-title">🎭 Fiche de Personnage</div>
               
               {/* Barre de sélection de personnage */}
               <div className="character-selection-bar">
                 <div className="character-selector">
                   {loadingCharacters ? (
                     <div className="loading-indicator">⏳ Chargement des personnages...</div>
                   ) : (
                     <>
                       <select 
                         value={selectedCharacter ? selectedCharacter.id : ''}
                         onChange={(e) => {
                           const characterId = parseInt(e.target.value);
                           const characters = getCharactersForGame(selectedGame);
                           const character = characters.find(c => c.id === characterId);
                           handleCharacterSelect(character || null);
                         }}
                         className="character-select"
                       >
                         <option value="">Sélectionner un personnage...</option>
                         {getCharactersForGame(selectedGame).map(character => (
                           <option key={character.id} value={character.id}>
                             {character.characterName}
                           </option>
                         ))}
                       </select>
                       
                       {selectedCharacter && (
                         <button 
                           onClick={() => handleDeleteCharacter(selectedCharacter.id)}
                           className="btn-discord danger small"
                           title="Supprimer ce personnage"
                         >
                           🗑️
                         </button>
                       )}
                     </>
                   )}
                 </div>
                 
                 <div className="character-actions">
                   <button 
                     onClick={handleCreateNewCharacter}
                     className="btn-discord success"
                     disabled={loadingCharacters}
                   >
                     ➕ Nouveau personnage
                   </button>
                 </div>
               </div>

               <div className="character-sheet-content">
                                   {showCreateCharacter ? (
                    <div className="create-character-form">
                      <div className="form-group">
                        <label className="form-label">Nom du personnage</label>
                        <input 
                          type="text" 
                          value={newCharacterName}
                          onChange={(e) => setNewCharacterName(e.target.value)}
                          placeholder="Entrez le nom de votre personnage"
                          className="form-input"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleCreateCharacter();
                            }
                          }}
                        />
                      </div>
                      <div className="form-actions">
                        <button 
                          onClick={handleCreateCharacter}
                          disabled={!newCharacterName.trim()}
                          className={`btn-discord success ${!newCharacterName.trim() ? 'disabled' : ''}`}
                        >
                          💾 Créer le personnage
                        </button>
                        <button 
                          onClick={() => setShowCreateCharacter(false)}
                          className="btn-discord outline"
                        >
                          ✕ Annuler
                        </button>
                      </div>
                    </div>
                                   ) : selectedCharacter ? (
                                         <CharacterSheetPDFAdvanced 
                       character={selectedCharacter} 
                       gameName={selectedGame} 
                       pseudo={pseudo}
                       onDataChange={setCharacterData}
                     />
                 ) : (
                   <div className="character-sheet-placeholder">
                     <div className="placeholder-icon">📝</div>
                     <div className="placeholder-text">
                       Jeu sélectionné : <strong>{selectedGame}</strong>
                       <br />
                       <br />
                       Sélectionnez un personnage existant ou créez-en un nouveau
                     </div>
                   </div>
                 )}
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerList; 