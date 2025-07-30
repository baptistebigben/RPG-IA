import React, { useState } from 'react';

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
          <div className="card-discord">
            <div className="section-title">🎭 Fiche de Personnage</div>
            <div className="character-form">
              <div className="form-group">
                <label className="form-label">Nom du personnage</label>
                <input 
                  type="text" 
                  placeholder="Entrez le nom de votre personnage"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Classe</label>
                <select className="form-select">
                  <option value="">Choisissez une classe</option>
                  <option value="guerrier">Guerrier</option>
                  <option value="mage">Mage</option>
                  <option value="voleur">Voleur</option>
                  <option value="clerc">Clerc</option>
                  <option value="ranger">Ranger</option>
                  <option value="barde">Barde</option>
                  <option value="paladin">Paladin</option>
                  <option value="druide">Druide</option>
                  <option value="moine">Moine</option>
                  <option value="sorcier">Sorcier</option>
                  <option value="ensorceleur">Ensorceleur</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Race</label>
                <select className="form-select">
                  <option value="">Choisissez une race</option>
                  <option value="humain">Humain</option>
                  <option value="elfe">Elfe</option>
                  <option value="nain">Nain</option>
                  <option value="halfelin">Halfelin</option>
                  <option value="demi-orc">Demi-orc</option>
                  <option value="tieffelin">Tieffelin</option>
                  <option value="dragonborn">Dragonborn</option>
                  <option value="gnome">Gnome</option>
                  <option value="demi-elfe">Demi-elfe</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Niveau</label>
                <input 
                  type="number" 
                  min="1" 
                  max="20" 
                  defaultValue="1"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  placeholder="Décrivez votre personnage, son histoire, son apparence..."
                  rows="6"
                  className="form-textarea"
                />
              </div>

              <button className="btn-discord w-full">
                💾 Sauvegarder le personnage
              </button>
            </div>
          </div>

          <div className="card-discord">
            <div className="section-title">📋 Personnages sauvegardés</div>
            <div className="empty-state">
              Aucun personnage sauvegardé pour le moment.
              <br />
              <small>Créez votre premier personnage ci-dessus !</small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerList; 