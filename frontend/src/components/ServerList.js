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
  const [activeTab, setActiveTab] = useState('servers'); // 'servers' ou 'character'
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
    // Appel à l'API pour créer la partie
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
      // Recharger la liste
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
      // Recharger la liste
      window.location.reload();
    } else {
      const err = await res.json();
      alert(err.error || "Erreur lors de la suppression de la partie.");
    }
  };

  const handleJoin = (id) => {
    onJoin(id);
    // Mettre à jour les parties récentes
    const partie = parties.find(p => p.id === id);
    if (partie) {
      let recents = recentParties.filter(p => p.id !== id);
      recents.unshift({ id: partie.id, nom: partie.nom });
      if (recents.length > 5) recents = recents.slice(0, 5);
      setRecentParties(recents);
      sessionStorage.setItem('recentParties', JSON.stringify(recents));
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <button 
          onClick={onLogout} 
          style={{ 
            background: '#ffeaea', 
            color: '#a00', 
            border: '2px solid #a00', 
            borderRadius: 8, 
            fontWeight: 'bold', 
            marginRight: 8 
          }}
        >
          Déconnexion
        </button>
        <button 
          onClick={onShowHelp} 
          title="Aide" 
          style={{ 
            background: '#f3e5f5', 
            color: '#6d2e7a', 
            border: '2px solid #6d2e7a', 
            borderRadius: '50%', 
            width: 32, 
            height: 32, 
            fontWeight: 'bold', 
            fontSize: 20, 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          ?
        </button>
      </div>

      <h2>Bienvenue, {pseudo}</h2>
      
      {/* Onglets */}
      <div style={{ 
        display: 'flex', 
        marginBottom: 20, 
        borderBottom: '2px solid #3d2c5a',
        borderRadius: '8px 8px 0 0'
      }}>
        <button 
          onClick={() => setActiveTab('servers')}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: activeTab === 'servers' ? '#3d2c5a' : '#2d2c44',
            color: '#e0cfa9',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'servers' ? 'bold' : 'normal',
            fontSize: '16px'
          }}
        >
          🎮 Serveurs
        </button>
        <button 
          onClick={() => setActiveTab('character')}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: activeTab === 'character' ? '#3d2c5a' : '#2d2c44',
            color: '#e0cfa9',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'character' ? 'bold' : 'normal',
            fontSize: '16px'
          }}
        >
          👤 Personnage
        </button>
      </div>

      {/* Contenu de l'onglet Serveurs */}
      {activeTab === 'servers' && (
        <>
          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              value={newPartieNom}
              onChange={e => setNewPartieNom(e.target.value)}
              placeholder="Nom de la partie"
              style={{ width: 220, marginRight: 5 }}
            />
            <select
              value={selectedVersion}
              onChange={e => setSelectedVersion(e.target.value)}
              style={{ 
                width: 200, 
                padding: 6, 
                borderRadius: 6, 
                border: '1.5px solid #bfa76f', 
                background: '#fff8e1', 
                fontSize: '1em' 
              }}
            >
              <option value="" disabled>Choisir la version du jeu de rôle...</option>
              {RPG_VERSIONS.filter(v => v).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <button 
              onClick={handleCreatePartie} 
              disabled={!selectedVersion} 
              style={{ 
                opacity: !selectedVersion ? 0.5 : 1, 
                cursor: !selectedVersion ? 'not-allowed' : 'pointer' 
              }}
            >
              Créer une partie
            </button>
          </div>

          <div style={{ margin: '20px 0' }}>
            <input
              value={joinId}
              onChange={e => setJoinId(e.target.value)}
              placeholder="ID de partie à rejoindre"
              style={{ width: 250, marginRight: 5 }}
            />
            <button onClick={() => handleJoin(joinId)} disabled={!joinId}>
              Rejoindre par ID
            </button>
          </div>

          <h3>Parties récentes</h3>
          <table style={{ width: '100%', marginBottom: 18, background: '#f5f5dc', borderRadius: 8 }}>
            <thead><tr><th>Nom</th><th>ID</th><th>Action</th></tr></thead>
            <tbody>
              {recentParties.length === 0 && (
                <tr><td colSpan={3} style={{ color: '#888' }}>Aucune partie récente</td></tr>
              )}
              {recentParties.map((p, idx) => (
                <tr key={typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : idx}>
                  <td>{typeof p.nom === 'string' ? p.nom : '[corrompu]'}</td>
                  <td style={{ fontSize: '0.9em', color: '#888' }}>
                    {typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : '[corrompu]'}
                  </td>
                  <td>
                    <button onClick={() => handleJoin(typeof p.id === 'string' || typeof p.id === 'number' ? p.id : '')}>
                      Rejoindre
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Parties existantes</h3>
          <table style={{ width: '100%', background: '#f3e5f5', borderRadius: 8 }}>
            <thead><tr><th>Nom</th><th>ID</th><th>MJ</th><th>Joueurs</th><th>Actions</th></tr></thead>
            <tbody>
              {parties.length === 0 && (
                <tr><td colSpan={5} style={{ color: '#888' }}>Aucune partie</td></tr>
              )}
              {parties.map((p, idx) => (
                <tr key={typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : idx}>
                  <td>
                    {renamingId === p.id ? (
                      <form onSubmit={e => handleRenamePartie(p.id, e)} style={{ display: 'inline' }}>
                        <input
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          style={{ width: 120, marginRight: 5 }}
                        />
                        <button type="submit" style={{ marginRight: 5 }}>Valider</button>
                        <button type="button" onClick={() => { setRenamingId(null); setRenameValue(''); }}>
                          Annuler
                        </button>
                      </form>
                    ) : (
                      <>
                        <b>{typeof p.nom === 'string' ? p.nom : '[corrompu]'}</b>
                        {p.proprietaire && (
                          <span style={{ color: '#888', fontSize: '0.9em', marginLeft: 6 }}>
                            (propriétaire : {typeof p.proprietaire === 'string' ? p.proprietaire : '[corrompu]'})
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  <td style={{ fontSize: '0.9em', color: '#888' }}>
                    {typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : '[corrompu]'}
                  </td>
                  <td>{typeof p.mjId === 'string' ? p.mjId : '[corrompu]'}</td>
                  <td>{Array.isArray(p.joueurs) ? p.joueurs.length : '[corrompu]'}</td>
                  <td>
                    <button onClick={() => handleJoin(typeof p.id === 'string' || typeof p.id === 'number' ? p.id : '')}>
                      Rejoindre
                    </button>
                    {(pseudo === 'admin' || pseudo === p.proprietaire) && (
                      <button 
                        onClick={() => { 
                          setRenamingId(p.id); 
                          setRenameValue(typeof p.nom === 'string' ? p.nom : ''); 
                        }} 
                        style={{ marginLeft: 5 }}
                      >
                        Renommer
                      </button>
                    )}
                    {pseudo === 'admin' && (
                      <>
                        <button 
                          onClick={() => setDeleteConfirmId(p.id)} 
                          style={{ 
                            marginLeft: 8, 
                            color: '#fff', 
                            background: '#a00', 
                            border: 'none', 
                            borderRadius: 5, 
                            padding: '2px 8px', 
                            fontWeight: 'bold' 
                          }}
                        >
                          Supprimer
                        </button>
                        {deleteConfirmId === p.id && (
                          <span style={{ 
                            marginLeft: 10, 
                            background: '#fff8e1', 
                            border: '1px solid #a00', 
                            borderRadius: 6, 
                            padding: '4px 10px' 
                          }}>
                            Confirmer ?
                            <button 
                              onClick={() => handleDeletePartie(p.id)} 
                              style={{ 
                                marginLeft: 5, 
                                color: '#fff', 
                                background: '#a00', 
                                border: 'none', 
                                borderRadius: 5, 
                                padding: '2px 8px', 
                                fontWeight: 'bold' 
                              }}
                            >
                              Oui
                            </button>
                            <button onClick={() => setDeleteConfirmId(null)} style={{ marginLeft: 5 }}>
                              Non
                            </button>
                          </span>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Contenu de l'onglet Personnage */}
      {activeTab === 'character' && (
        <div style={{ padding: '20px 0' }}>
          <div style={{
            background: '#2d2c44',
            borderRadius: 12,
            padding: '20px',
            marginBottom: 20,
            color: '#e0cfa9',
            border: '1.5px solid #bfa76f'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#bfa76f' }}>🎭 Fiche de Personnage</h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Nom du personnage :</label>
              <input 
                type="text" 
                placeholder="Entrez le nom de votre personnage"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #bfa76f',
                  background: '#1a1a2e',
                  color: '#e0cfa9',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Classe :</label>
              <select 
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #bfa76f',
                  background: '#1a1a2e',
                  color: '#e0cfa9',
                  fontSize: '14px'
                }}
              >
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

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Race :</label>
              <select 
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #bfa76f',
                  background: '#1a1a2e',
                  color: '#e0cfa9',
                  fontSize: '14px'
                }}
              >
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

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Niveau :</label>
              <input 
                type="number" 
                min="1" 
                max="20" 
                defaultValue="1"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #bfa76f',
                  background: '#1a1a2e',
                  color: '#e0cfa9',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Description :</label>
              <textarea 
                placeholder="Décrivez votre personnage, son histoire, son apparence..."
                rows="6"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #bfa76f',
                  background: '#1a1a2e',
                  color: '#e0cfa9',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <button 
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(90deg, #3d2c5a 0%, #bfa76f 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              💾 Sauvegarder le personnage
            </button>
          </div>

          <div style={{
            background: '#2d2c44',
            borderRadius: 12,
            padding: '20px',
            color: '#e0cfa9',
            border: '1.5px solid #bfa76f'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#bfa76f' }}>📋 Personnages sauvegardés</h3>
            <div style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
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