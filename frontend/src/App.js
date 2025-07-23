import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import './App.css';

const ENDPOINT = '';

function App() {
  const [pseudo, setPseudo] = useState('');
  const [userId, setUserId] = useState('');
  const [logged, setLogged] = useState(false);
  const [parties, setParties] = useState([]);
  const [partieId, setPartieId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [destinataires, setDestinataires] = useState('');
  const [interpretation, setInterpretation] = useState(null);
  const socketRef = useRef(null);
  const [joinId, setJoinId] = useState('');
  // Simuler une liste de joueurs connectés (à améliorer avec le backend si besoin)
  const [players, setPlayers] = useState([]);
  const [newPartieNom, setNewPartieNom] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [recentParties, setRecentParties] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('recentParties') || '[]');
    } catch {
      return [];
    }
  });
  const [showHelp, setShowHelp] = useState(false);
  const messagesEndRef = useRef(null);
  const PALETTE = ['#6d2e7a', '#bfa76f', '#e07a5f', '#3e2723', '#457b9d', '#43aa8b', '#f9c74f', '#f9844a', '#277da1', '#bc6c25'];
  // Couleur personnalisable via modale
  const [pseudoColor, setPseudoColor] = useState(() => sessionStorage.getItem('pseudoColor') || PALETTE[0]);
  const [showColorModal, setShowColorModal] = useState(false);
  // Couleur temporaire pour la modale
  const [tempColor, setTempColor] = useState(pseudoColor);
  const fileInputRef = useRef();
  // État pour la modale de génération d'image
  const [showImageModal, setShowImageModal] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  // Liste des versions de jeux de rôle disponibles
  const RPG_VERSIONS = [
    'Donjons & Dragons 5',
    'Deadlands: Reloaded',
    'L’Appel de Cthulhu 7e',
    'Pathfinder 2',
    'Chroniques Oubliées',
    'Cthulhu Hack',
    'Starfinder'  ];
  const [selectedVersion, setSelectedVersion] = useState('');
  // Onglet sélectionné (Serveurs/Personnages)
  const [tab, setTab] = useState('serveurs');

  // Fonction pour générer une image via HuggingFace
  const handleGenerateImage = async () => {
    setImageLoading(true);
    setImageUrl('');
    setImageError('');
    setImageLoaded(false);
    try {
      const randomNoise = Math.random().toString(36).substring(2, 8);
      const prompt = encodeURIComponent(imagePrompt + ' ' + randomNoise);
      const url = `https://image.pollinations.ai/prompt/${prompt}`;
      // Télécharge le blob de l'image générée
      const imgResp = await fetch(url);
      if (!imgResp.ok) throw new Error('Erreur lors du téléchargement de l\'image générée');
      const blob = await imgResp.blob();
      // Upload sur le backend
      const formData = new FormData();
      formData.append('image', blob, 'generee.png');
      const uploadResp = await fetch('/upload', { method: 'POST', body: formData });
      const { url: uploadedUrl } = await uploadResp.json();
      setImageUrl(uploadedUrl);
    } catch (e) {
      setImageUrl('');
      setImageError("Erreur lors de la génération de l'image : " + e.message);
    }
    setImageLoading(false);
  };

  // Connexion Socket.IO
  useEffect(() => {
    // Au chargement, tenter de restaurer le pseudo/userId depuis le sessionStorage (spécifique à l'onglet)
    const savedPseudo = sessionStorage.getItem('pseudo');
    const savedUserId = sessionStorage.getItem('userId');
    if (savedPseudo && savedUserId) {
      setPseudo(savedPseudo);
      setUserId(savedUserId);
      setLogged(true);
    }
  }, []);

  useEffect(() => {
    if (logged && partieId && pseudo) {
      const socket = io(ENDPOINT);
      socketRef.current = socket;
      socket.emit('joinRoom', { sessionId: partieId, pseudo });
      socket.on('playersUpdate', ({ players }) => {
        setPlayers(players);
        // Si la couleur du joueur a changé côté backend, on la met à jour localement aussi
        const me = players.find(p => typeof p === 'object' && p.pseudo === pseudo);
        if (me && me.color && me.color !== pseudoColor) {
          setPseudoColor(me.color);
          sessionStorage.setItem('pseudoColor', me.color);
        }
      });
      socket.on('message', (msg) => setMessages((m) => {
        if (msg.id && m.some(existing => existing.id === msg.id)) {
          return m;
        }
        return [...m, msg];
      }));
      socket.on('mjReply', (msg) => setMessages((m) => {
        if (msg.id && m.some(existing => existing.id === msg.id)) {
          return m;
        }
        return [...m, msg];
      }));
      socket.on('interpretation', ({ interpretation, correctif }) => {
        setInterpretation({ interpretation, correctif });
      });
      socket.on('resumeUpdated', ({ resume }) => {
        setMessages((m) => [...m, { auteur: 'Système', contenu: `Résumé mis à jour : ${resume}` }]);
      });
      return () => socket.disconnect();
    }
  }, [logged, partieId, pseudo]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, pseudo]);

  // Récupérer la liste des parties
  useEffect(() => {
    fetch(ENDPOINT + '/parties?pseudo=' + encodeURIComponent(pseudo || ''))
      .then((res) => res.json())
      .then(setParties);
  }, [pseudo, pseudoColor]);

  // Login simple
  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch(ENDPOINT + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo, userId })
    });
    if (res.ok) {
      const data = await res.json();
      setUserId(data.userId);
      setLogged(true);
      sessionStorage.setItem('pseudo', data.pseudo);
      sessionStorage.setItem('userId', data.userId);
    } else {
      alert('Pseudo déjà utilisé ou invalide');
    }
  };

  // Déconnexion
  const handleLogout = () => {
    setPseudo('');
    setUserId('');
    setLogged(false);
    setPartieId('');
    setSessionId('');
    setMessages([]);
    setPlayers([]);
    sessionStorage.removeItem('pseudo');
    sessionStorage.removeItem('userId');
  };

  // Créer une partie
  const handleCreatePartie = async () => {
    if (!selectedVersion) return;
    const nom = newPartieNom.trim() || `Partie de ${pseudo}`;
    const res = await fetch(ENDPOINT + '/parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, mjId: userId, pseudo, version: selectedVersion })
    });
    const partie = await res.json();
    setParties((p) => [...p, partie]);
    setNewPartieNom('');
    setSelectedVersion('');
    await handleJoin(partie.id);
  };

  // Renommer une partie
  const handleRenamePartie = async (id, e) => {
    if (e) e.preventDefault();
    const nom = renameValue.trim();
    if (!nom) return;
    const res = await fetch(`${ENDPOINT}/parties/${id}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, pseudo })
    });
    if (res.ok) {
      // Recharge la liste depuis le backend pour être sûr
      const partiesMaj = await fetch(ENDPOINT + '/parties?pseudo=' + encodeURIComponent(pseudo || '')).then(r => r.json());
      setParties(partiesMaj);
      setRenamingId(null);
      setRenameValue('');
    } else {
      const err = await res.json();
      alert(err.error || "Erreur lors du renommage de la partie.");
    }
  };

  // Rejoindre une partie
  const handleJoin = async (id) => {
    setPartieId(id);
    setSessionId(id); // sessionId = partieId ici
    // Récupère l'historique
    const res = await fetch(`${ENDPOINT}/sessions/${id}/messages`);
    const histo = await res.json();
    setMessages(histo);
    // Met à jour les parties récentes
    const partie = parties.find(p => p.id === id);
    if (partie) {
      let recents = recentParties.filter(p => p.id !== id);
      recents.unshift({ id: partie.id, nom: partie.nom });
      if (recents.length > 5) recents = recents.slice(0, 5);
      setRecentParties(recents);
      sessionStorage.setItem('recentParties', JSON.stringify(recents));
    }
  };

  // Envoyer un message (public ou direct)
  const handleSend = (e) => {
    e.preventDefault();
    if (!message) return;
    const dests = destinataires.split(',').map((d) => d.trim()).filter(Boolean);
    socketRef.current.emit('message', {
      sessionId,
      auteur: pseudo,
      contenu: message,
      destinataires: dests.length > 0 ? dests : undefined
    });
    setMessage('');
  };

  // Confirmer la correction
  const handleConfirmCorrection = () => {
    if (interpretation) {
      socketRef.current.emit('confirmCorrectContext', {
        sessionId,
        correctif: interpretation.correctif
      });
      setInterpretation(null);
    }
  };

  // Supprimer une partie
  const handleDeletePartie = async (id) => {
    const res = await fetch(`${ENDPOINT}/parties/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo })
    });
    if (res.ok) {
      const partiesMaj = await fetch(ENDPOINT + '/parties?pseudo=' + encodeURIComponent(pseudo || '')).then(r => r.json());
      setParties(partiesMaj);
      setDeleteConfirmId(null);
    } else {
      const err = await res.json();
      alert(err.error || "Erreur lors de la suppression de la partie.");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      await uploadImage(file);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await uploadImage(file);
    }
  };

  // Coller une image dans le champ de saisie du chat
  const handlePaste = async (e) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
    if (item) {
      e.preventDefault(); // Empêche le collage par défaut
      const file = item.getAsFile();
      await uploadImage(file);
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const resp = await fetch('/upload', { method: 'POST', body: formData });
    const { url } = await resp.json();
    // Envoie un message de chat contenant l’URL de l’image
    socketRef.current.emit('message', {
      sessionId,
      auteur: pseudo,
      contenu: `<img src="${url}" alt="image" style="max-width:300px;max-height:300px;border-radius:10px;" />`
    });
  };

  // Suppression de l'écouteur global du collage
  // useEffect(() => {
  //   window.addEventListener('paste', handlePaste);
  //   return () => window.removeEventListener('paste', handlePaste);
  // }, []);

  // Quand on change la couleur, on la sauvegarde
  const handleColorChange = (e) => {
    setTempColor(e.target.value);
  };

  const handleColorOk = () => {
    setPseudoColor(tempColor);
    sessionStorage.setItem('pseudoColor', tempColor);
    setShowColorModal(false);
  };

  const handleColorCancel = () => {
    setTempColor(pseudoColor); // reset la sélection temporaire
    setShowColorModal(false);
  };

  // Envoie la couleur au backend
  useEffect(() => {
    if (logged && partieId && pseudoColor) {
      if (socketRef.current) {
        socketRef.current.emit('updateColor', { sessionId: partieId, pseudo, color: pseudoColor });
      }
    }
  }, [pseudoColor, logged, partieId]);

  // Ouvre la modale et initialise la couleur temporaire
  const openColorModal = () => {
    setTempColor(pseudoColor);
    setShowColorModal(true);
  };

  if (!logged) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Connexion</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input value={pseudo} onChange={e => setPseudo(e.target.value)} placeholder="Pseudo" />
          <button type="submit">Se connecter</button>
        </form>
      </div>
    );
  }

  if (!partieId) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button onClick={handleLogout} style={{ background: '#ffeaea', color: '#a00', border: '2px solid #a00', borderRadius: 8, fontWeight: 'bold', marginRight: 8 }}>Déconnexion</button>
          <button onClick={() => setShowHelp(true)} title="Aide" style={{ background: '#f3e5f5', color: '#6d2e7a', border: '2px solid #6d2e7a', borderRadius: '50%', width: 32, height: 32, fontWeight: 'bold', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</button>
        </div>
        {/* Onglets */}
        <div style={{ display: 'flex', gap: 0, margin: '24px 0 18px 0', borderBottom: '2px solid #bfa76f', width: '100%' }}>
          <button
            onClick={() => setTab('serveurs')}
            style={{
              background: tab === 'serveurs' ? '#f3e5f5' : 'transparent',
              color: tab === 'serveurs' ? '#6d2e7a' : '#bfa76f',
              border: 'none',
              borderBottom: tab === 'serveurs' ? '4px solid #bfa76f' : 'none',
              fontWeight: tab === 'serveurs' ? 'bold' : 'normal',
              fontSize: 20,
              padding: '10px 32px',
              cursor: 'pointer',
              outline: 'none',
              borderRadius: '12px 12px 0 0',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            Serveurs
          </button>
          <button
            onClick={() => setTab('personnages')}
            style={{
              background: tab === 'personnages' ? '#f3e5f5' : 'transparent',
              color: tab === 'personnages' ? '#6d2e7a' : '#bfa76f',
              border: 'none',
              borderBottom: tab === 'personnages' ? '4px solid #bfa76f' : 'none',
              fontWeight: tab === 'personnages' ? 'bold' : 'normal',
              fontSize: 20,
              padding: '10px 32px',
              cursor: 'pointer',
              outline: 'none',
              borderRadius: '12px 12px 0 0',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            Personnages
          </button>
        </div>
        {tab === 'serveurs' && (
          <div>
            <h2>Bienvenue, {pseudo}</h2>
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
                style={{ width: 200, padding: 6, borderRadius: 6, border: '1.5px solid #bfa76f', background: '#fff8e1', fontSize: '1em' }}
              >
                <option value="" disabled>Choisir la version du jeu de rôle...</option>
                {RPG_VERSIONS.filter(v => v).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <button onClick={handleCreatePartie} disabled={!selectedVersion} style={{ opacity: !selectedVersion ? 0.5 : 1, cursor: !selectedVersion ? 'not-allowed' : 'pointer' }}>Créer une partie</button>
            </div>
            <div style={{ margin: '20px 0' }}>
              <input
                value={joinId}
                onChange={e => setJoinId(e.target.value)}
                placeholder="ID de partie à rejoindre"
                style={{ width: 250, marginRight: 5 }}
              />
              <button onClick={() => handleJoin(joinId)} disabled={!joinId}>Rejoindre par ID</button>
            </div>
            <h3>Parties récentes</h3>
            <table style={{ width: '100%', marginBottom: 18, background: '#f5f5dc', borderRadius: 8 }}>
              <thead><tr><th>Nom</th><th>ID</th><th>Action</th></tr></thead>
              <tbody>
                {recentParties.length === 0 && <tr><td colSpan={3} style={{ color: '#888' }}>Aucune partie récente</td></tr>}
                {recentParties.map((p, idx) => (
                  <tr key={typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : idx}>
                    <td>{typeof p.nom === 'string' ? p.nom : '[corrompu]'}</td>
                    <td style={{ fontSize: '0.9em', color: '#888' }}>{typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : '[corrompu]'}</td>
                    <td><button onClick={() => handleJoin(typeof p.id === 'string' || typeof p.id === 'number' ? p.id : '')}>Rejoindre</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Parties existantes</h3>
            <table style={{ width: '100%', background: '#f3e5f5', borderRadius: 8 }}>
              <thead><tr><th>Nom</th><th>ID</th><th>MJ</th><th>Joueurs</th><th>Actions</th></tr></thead>
              <tbody>
                {parties.length === 0 && <tr><td colSpan={5} style={{ color: '#888' }}>Aucune partie</td></tr>}
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
                          <button type="button" onClick={() => { setRenamingId(null); setRenameValue(''); }}>Annuler</button>
                        </form>
                      ) : (
                        <>
                          <b>{typeof p.nom === 'string' ? p.nom : '[corrompu]'}</b>
                          {p.proprietaire && (
                            <span style={{ color: '#888', fontSize: '0.9em', marginLeft: 6 }}>(propriétaire : {typeof p.proprietaire === 'string' ? p.proprietaire : '[corrompu]'})</span>
                          )}
                        </>
                      )}
                    </td>
                    <td style={{ fontSize: '0.9em', color: '#888' }}>{typeof p.id === 'string' || typeof p.id === 'number' ? String(p.id) : '[corrompu]'}</td>
                    <td>{typeof p.mjId === 'string' ? p.mjId : '[corrompu]'}</td>
                    <td>{Array.isArray(p.joueurs) ? p.joueurs.length : '[corrompu]'}</td>
                    <td>
                      <button onClick={() => handleJoin(typeof p.id === 'string' || typeof p.id === 'number' ? p.id : '')}>Rejoindre</button>
                      {(pseudo === 'admin' || pseudo === p.proprietaire) && (
                        <button onClick={() => { setRenamingId(p.id); setRenameValue(typeof p.nom === 'string' ? p.nom : ''); }} style={{ marginLeft: 5 }}>Renommer</button>
                      )}
                      {pseudo === 'admin' && (
                        <>
                          <button onClick={() => setDeleteConfirmId(p.id)} style={{ marginLeft: 8, color: '#fff', background: '#a00', border: 'none', borderRadius: 5, padding: '2px 8px', fontWeight: 'bold' }}>Supprimer</button>
                          {deleteConfirmId === p.id && (
                            <span style={{ marginLeft: 10, background: '#fff8e1', border: '1px solid #a00', borderRadius: 6, padding: '4px 10px' }}>
                              Confirmer ?
                              <button onClick={() => handleDeletePartie(p.id)} style={{ marginLeft: 5, color: '#fff', background: '#a00', border: 'none', borderRadius: 5, padding: '2px 8px', fontWeight: 'bold' }}>Oui</button>
                              <button onClick={() => setDeleteConfirmId(null)} style={{ marginLeft: 5 }}>Non</button>
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'personnages' && (
          <div>
            <h2>Gestion des personnages</h2>
            {/* Sélection du jeu de rôle */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ marginRight: 8 }}>Jeu de rôle :</label>
              <select
                value={selectedVersion}
                onChange={e => setSelectedVersion(e.target.value)}
                style={{ width: 220, padding: 6, borderRadius: 6, border: '1.5px solid #bfa76f', background: '#fff8e1', fontSize: '1em' }}
              >
                <option value="" disabled>Choisir...</option>
                {RPG_VERSIONS.filter(v => v).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            {/* Gestion des personnages pour la version sélectionnée */}
            {selectedVersion === 'Donjons & Dragons 5' && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, width: '100%' }}>
                {/* Colonne droite : titre + PDF */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', height: 32, marginBottom: 0 }}>
                    <h3 style={{ margin: 0, fontWeight: 'bold', fontSize: '1.5em' }}>Fiche officielle D&D 5 (PDF éditable)</h3>
                  </div>
                  <div style={{ width: '900px', maxWidth: '100%', margin: '0 auto', marginTop: 0 }}>
                    <iframe
                      src="https://donjonetdragon.fr/wp-content/uploads/2022/02/feuillepersonnagednd5.pdf"
                      title="Fiche D&D 5"
                      width="100%"
                      height="900px"
                      style={{ border: '2px solid #bfa76f', borderRadius: 12, background: '#232946' }}
                    />
                  </div>
                  <div style={{color:'#888', fontSize:'0.97em', marginBottom:16, marginTop:8, textAlign:'center'}}>
                    Les champs du PDF sont éditables directement dans la fiche ci-dessus. Pense à enregistrer/"imprimer en PDF" après modification pour conserver ta fiche remplie.
                  </div>
                </div>
              </div>
            )}
            {selectedVersion && selectedVersion !== 'Donjons & Dragons 5' && (
              <div style={{ color: '#888', marginTop: 24 }}>
                (Gestion des personnages pour "{selectedVersion}" à venir)
              </div>
            )}
            {!selectedVersion && (
              <div style={{ color: '#888', marginTop: 24 }}>
                (Sélectionnez un jeu de rôle pour gérer vos personnages)
              </div>
            )}
          </div>
        )}
        {showHelp && (
          <div style={{ position: 'fixed', top: 60, right: 40, zIndex: 1000, background: '#fff8e1', border: '2px solid #6d2e7a', borderRadius: 12, boxShadow: '2px 2px 12px #8888', padding: 24, maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: 20, color: '#6d2e7a' }}>Aide & Guide utilisateur</b>
              <button onClick={() => setShowHelp(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#a00', cursor: 'pointer' }} title="Fermer">×</button>
            </div>
            <div style={{ marginTop: 10, fontSize: 15, color: '#3e2723', lineHeight: 1.6 }}>
              <ul>
                <li><b>Créer une partie :</b> Saisissez un nom puis cliquez sur « Créer une partie ».</li>
                <li><b>Rejoindre une partie :</b> Cliquez sur « Rejoindre » dans la liste ou entrez l’ID d’une partie à rejoindre.</li>
                <li><b>Renommer une partie :</b> Seul le propriétaire ou l’admin peut renommer une partie (bouton « Renommer »).</li>
                <li><b>Supprimer une partie :</b> Seul l’admin peut supprimer une partie (bouton « Supprimer »).</li>
                <li><b>Propriétaire :</b> Le créateur de la partie est affiché à côté du nom. Il a des droits spéciaux sur sa partie.</li>
                <li><b>Admin :</b> Le pseudo <b>admin</b> a tous les droits (voir, renommer, supprimer toutes les parties).</li>
                <li><b>Parties récentes :</b> Les 5 dernières parties auxquelles vous avez accédé sont listées pour un accès rapide.</li>
                <li><b>Sessions indépendantes :</b> Chaque onglet est une session différente. Votre pseudo et vos droits sont propres à l’onglet.</li>
                <li><b>Commandes du chat :</b>
                  <ul>
                    <li><b>/roll 2d6+1 & 1d20</b> : Lance les dés (voir détails dans l’aide du MJ).</li>
                    <li><b>/start</b> : Lance l’aventure avec le MJ IA.</li>
                    <li><b>/help</b> : Affiche l’aide des commandes disponibles.</li>
                    <li><b>/resume</b> : Demande un résumé de la partie.</li>
                    <li><b>/message ...</b> : Envoie un message privé au MJ IA.</li>
                  </ul>
                </li>
                <li><b>Déconnexion :</b> Le bouton « Déconnexion » efface la session de l’onglet.</li>
                <li><b>Astuce :</b> Si vous rencontrez un problème, rechargez la page ou reconnectez-vous.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Trouver la partie courante pour afficher son nom
  const currentPartie = parties.find(p => p.id === partieId);

  // Fonction pour quitter la partie et revenir au hub
  const handleLeavePartie = () => {
    setPartieId('');
    setSessionId('');
    setMessages([]);
    setPlayers([]);
  };

  // DEBUG : afficher la structure reçue
  console.log('players:', players);
  console.log('players type:', typeof players, Array.isArray(players), players);

  if (!Array.isArray(players)) {
    // Si players n'est pas un tableau, on évite tout rendu
    return <div>Erreur : liste des joueurs corrompue</div>;
  }

  if (players && Array.isArray(players)) {
    for (const p of players) {
      if (typeof p === 'object' && !Array.isArray(p)) {
        for (const k in p) {
          if (typeof p[k] === 'object') {
            console.error('Objet imbriqué dans players !', p, p[k]);
          }
        }
      }
    }
  }

  return (
    <div className="chat-container">
      <div className="main-layout">
        <div className="chat-panel">
          <div className="messages-area" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
            {messages.filter(m => m && typeof m === 'object' && typeof m.auteur === 'string' && (typeof m.contenu === 'string' || (typeof m.contenu === 'string' && m.contenu.startsWith('<img ')))).map((m, idx) => (
              <div
                key={typeof m.id === 'string' || typeof m.id === 'number' ? String(m.id) : idx}
                className={
                  'message-bubble ' +
                  (m.auteur === 'MJ' ? 'message-mj' : m.auteur === pseudo ? 'message-joueur' : m.auteur === 'Système' ? 'message-system' : '')
                }
              >
                <b style={{ color: (() => {
                  if (m.auteur === pseudo) return pseudoColor;
                  const found = Array.isArray(players) && players.find(p => (typeof p === 'object' && typeof p.pseudo === 'string' ? p.pseudo === m.auteur : p === m.auteur));
                  return found && typeof found === 'object' ? found.color : undefined;
                })() }}>{typeof m.auteur === 'string' ? m.auteur : '[corrompu]' } :</b>{' '}
                {/* Affichage sécurisé de l'image ou du texte */}
                {typeof m.contenu === 'string' && m.contenu.startsWith('<img ') ? (
                  <span dangerouslySetInnerHTML={{ __html: m.contenu }} />
                ) : (
                  m.auteur === 'MJ' ? <ReactMarkdown>{typeof m.contenu === 'string' ? m.contenu : '[corrompu]'}</ReactMarkdown> : (typeof m.contenu === 'string' ? m.contenu : '[corrompu]')
                )}
                {m.destinataires && <span style={{ fontStyle: 'italic', color: '#888' }}> (privé)</span>}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSend} className="chat-form">
            <input value={message} onChange={e => setMessage(e.target.value)} placeholder="/message Je pénètre dans la taverne..." className="chat-input" 
              onPaste={handlePaste} // Ajout de la gestion du collage ici
            />
            <input value={destinataires} onChange={e => setDestinataires(e.target.value)} placeholder="Destinataires (ex: joueur2,MJ)" className="dest-input" />
            <input type="file" accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileUpload} />
            <button type="button" onClick={() => fileInputRef.current.click()}>📷</button>
            <button type="submit">Envoyer</button>
          </form>
        </div>
        <div className="side-panel">
          <button onClick={handleLeavePartie} className="side-retour">⟵ Retour</button>
          <button onClick={() => setShowImageModal(true)} style={{marginBottom: 12, marginLeft: 0, width: '100%', background: 'linear-gradient(90deg, #3d2c5a 0%, #bfa76f 100%)', color: '#fff', fontWeight: 'bold', borderRadius: 8, fontSize: 16, padding: '8px 0'}}>Générer image</button>
          {showImageModal && (
            <div style={{
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000a', zIndex: 2000,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{ background: '#232946', borderRadius: 16, padding: 32, minWidth: 340, boxShadow: '0 4px 32px #000a', color: '#fff', position: 'relative' }}>
                <button onClick={() => setShowImageModal(false)} style={{ position: 'absolute', top: 8, right: 12, background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>×</button>
                <h3 style={{marginTop:0}}>Générer une image</h3>
                <input value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="Décris l'image à générer..." style={{width:'100%', padding:8, borderRadius:6, border:'1px solid #bfa76f', marginBottom:12, fontSize:16}} />
                <button onClick={handleGenerateImage} style={{marginBottom:16, width:'100%', background: 'linear-gradient(90deg, #3d2c5a 0%, #bfa76f 100%)', color: '#fff', fontWeight: 'bold', borderRadius: 8, fontSize: 16, padding: '8px 0'}}>Générer</button>
                {imageLoading && !imageLoaded && <div style={{color:'#bfa76f', margin:'12px 0'}}>Génération en cours...</div>}
                {imageError && <div style={{color:'#ff6b6b', margin:'12px 0', fontWeight:'bold'}}>{imageError}</div>}
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="générée"
                    style={{maxWidth:400, maxHeight:300, borderRadius:10, marginTop:8, display: imageLoaded ? 'block' : 'none'}}
                    onLoad={() => { setImageLoaded(true); setImageLoading(false); }}
                  />
                )}
                {imageUrl && (
                  <button onClick={() => {
                    setShowImageModal(false);
                    setMessage(`<img src='${imageUrl}' alt='image générée' style='max-width:300px;max-height:300px;border-radius:10px;' />`);
                    setTimeout(() => {
                      document.querySelector('.chat-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }, 0);
                  }} style={{marginTop:12, width:'100%', background: 'linear-gradient(90deg, #3d2c5a 0%, #bfa76f 100%)', color: '#fff', fontWeight: 'bold', borderRadius: 8, fontSize: 16, padding: '8px 0'}}>Ajouter au chat</button>
                )}
              </div>
            </div>
          )}
          <div style={{
            background: '#2d2c44',
            borderRadius: 12,
            padding: '12px 18px',
            marginBottom: 18,
            color: '#e0cfa9',
            fontWeight: 'bold',
            fontSize: '1.13em',
            boxShadow: '0 2px 8px #000a',
            border: '1.5px solid #bfa76f',
            textAlign: 'left'
          }}>
            <div style={{fontSize: '1.01em', fontWeight: 600}}>
              {currentPartie ? currentPartie.nom : 'Partie'}
              {currentPartie ? <span style={{fontWeight:400, color:'#bfa76f'}}> ({currentPartie.id})</span> : partieId ? <span style={{fontWeight:400, color:'#bfa76f'}}> ({partieId})</span> : ''}
            </div>
          </div>
          <div id="players-box" style={{ fontSize: '0.97em' }}>
            <b>Joueurs connectés :</b>
            <div className="players-list">
              {players.length > 0 ? (
                players.flat().filter(p => (typeof p === 'string') || (p && typeof p === 'object' && typeof p.pseudo === 'string')).map((p, idx) => {
                  if (typeof p === 'string') {
                    return (
                      <span key={p + idx} style={{
                        color: p === pseudo ? pseudoColor : undefined,
                        fontWeight: p === pseudo ? 'bold' : undefined,
                        display: 'block', marginBottom: 6
                      }}>{p}</span>
                    );
                  }
                  if (
                    p && typeof p === 'object' && !Array.isArray(p) && typeof p.pseudo === 'string'
                  ) {
                    return (
                      <span key={p.pseudo + idx} style={{
                        color: typeof p.color === 'string' ? p.color : undefined,
                        fontWeight: p.pseudo === pseudo ? 'bold' : undefined,
                        display: 'block', marginBottom: 6
                      }}>{p.pseudo}</span>
                    );
                  }
                  // Cas inattendu : on n'affiche rien
                  return null;
                })
              ) : (
                <span style={{ color: '#888' }}>(Aucun joueur connecté)</span>
              )}
            </div>
          </div>
          <div style={{marginBottom:18, width:'100%', fontSize: '0.97em'}}>
            <b style={{fontSize:'1em'}}>Couleur du pseudo :</b>
            <div className="pseudo-color-palette" style={{marginTop:6}}>
              <div
                className="pseudo-color-dot selected"
                style={{ background: pseudoColor, cursor: 'pointer' }}
                title={pseudoColor}
                onClick={openColorModal}
              />
              {showColorModal && (
                <div style={{
                  position: 'absolute',
                  background: '#232946',
                  border: '2px solid #bfa76f',
                  borderRadius: 10,
                  padding: 16,
                  zIndex: 1000,
                  marginTop: 8
                }}>
                  <label style={{ color: '#fff', marginRight: 8 }}>Choisis ta couleur :</label>
                  <input type="color" value={tempColor} onChange={handleColorChange} style={{ width: 40, height: 40, border: 'none', background: 'none' }} />
                  <button onClick={handleColorOk} style={{ marginLeft: 12 }}>OK</button>
                  <button onClick={handleColorCancel} style={{ marginLeft: 8 }}>Fermer</button>
                </div>
              )}
            </div>
          </div>
          <div id="resume-box" style={{ fontSize: '0.97em' }}>
            <b>Commandes disponibles :</b>
            <ul style={{marginTop:8, marginBottom:0, paddingLeft:18, color:'#f3e8ff', fontSize:'1em'}}>
              <li><b>/roll 2d6+1 & 1d20</b> : Lance les dés (exemple : 2 dés à 6 faces +1, puis 1 dé à 20 faces).</li>
              <li><b>/start</b> : Lance l'aventure avec le MJ IA.</li>
              <li><b>/help</b> : Affiche l'aide des commandes disponibles.</li>
              <li><b>/resume</b> : Demande un résumé de la partie.</li>
              <li><b>/message ...</b> : Envoie un message privé au MJ IA.</li>
              <li><b>/correctContext ...</b> : Propose une correction du contexte de la partie.</li>
              <li><b>/correctStory ...</b> : Propose une correction de l'histoire en cours.</li>
            </ul>
          </div>
          {interpretation && (
            <div style={{ background: '#ffe', padding: 10, marginBottom: 10, fontSize: '0.97em' }}>
              <b>Interprétation de la correction :</b> {interpretation.interpretation}
              <button onClick={handleConfirmCorrection} style={{ marginLeft: 10 }}>Confirmer</button>
              <button onClick={() => setInterpretation(null)} style={{ marginLeft: 5 }}>Annuler</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

// Composant pour gérer les personnages D&D 5 (stockage localStorage)
function PersonnagesDnD5({ pseudo }) {
  const STORAGE_KEY = `personnages_dd5_${pseudo}`;
  const [personnages, setPersonnages] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [editIndex, setEditIndex] = React.useState(null);
  const [creationNom, setCreationNom] = React.useState('');
  // Champs de fiche D&D 5 simplifiée
  const emptyFiche = { nom: '', classe: '', race: '', niveau: 1, background: '', joueur: pseudo, force: '', dex: '', con: '', int: '', sag: '', cha: '' };
  const [fiche, setFiche] = React.useState(emptyFiche);

  // Sauvegarde dans le localStorage
  const savePersonnages = (persos) => {
    setPersonnages(persos);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persos));
  };

  // Création d'un personnage
  const handleCreate = (e) => {
    e.preventDefault();
    if (!creationNom.trim()) return;
    const newFiche = { ...emptyFiche, nom: creationNom.trim() };
    savePersonnages([...personnages, newFiche]);
    setEditIndex(personnages.length);
    setFiche(newFiche);
    setCreationNom('');
  };

  // Edition d'un personnage
  const handleEdit = (idx) => {
    setEditIndex(idx);
    setFiche(personnages[idx]);
  };

  // Sauvegarde de la fiche éditée
  const handleSaveFiche = (e) => {
    e.preventDefault();
    const persos = [...personnages];
    persos[editIndex] = fiche;
    savePersonnages(persos);
    setEditIndex(null);
  };

  // Gestion des champs de la fiche
  const handleFicheChange = (e) => {
    const { name, value } = e.target;
    setFiche(f => ({ ...f, [name]: value }));
  };

  // Annuler édition
  const handleCancel = () => {
    setEditIndex(null);
  };

  // Affichage
  if (editIndex !== null) {
    return (
      <form onSubmit={handleSaveFiche} style={{ background: '#f5f5dc', borderRadius: 12, padding: 24, maxWidth: 480, margin: '0 auto' }}>
        <h3>Fiche de personnage D&D 5</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label>Nom<br /><input name="nom" value={fiche.nom} onChange={handleFicheChange} required style={{ width: '100%' }} /></label><br />
            <label>Classe<br /><input name="classe" value={fiche.classe} onChange={handleFicheChange} style={{ width: '100%' }} /></label><br />
            <label>Race<br /><input name="race" value={fiche.race} onChange={handleFicheChange} style={{ width: '100%' }} /></label><br />
            <label>Niveau<br /><input name="niveau" type="number" min="1" value={fiche.niveau} onChange={handleFicheChange} style={{ width: 60 }} /></label><br />
            <label>Background<br /><input name="background" value={fiche.background} onChange={handleFicheChange} style={{ width: '100%' }} /></label><br />
            <label>Joueur<br /><input name="joueur" value={fiche.joueur} onChange={handleFicheChange} style={{ width: '100%' }} /></label><br />
          </div>
          <div style={{ flex: 1 }}>
            <label>Force<br /><input name="force" value={fiche.force} onChange={handleFicheChange} style={{ width: 60 }} /></label><br />
            <label>Dextérité<br /><input name="dex" value={fiche.dex} onChange={handleFicheChange} style={{ width: 60 }} /></label><br />
            <label>Constitution<br /><input name="con" value={fiche.con} onChange={handleFicheChange} style={{ width: 60 }} /></label><br />
            <label>Intelligence<br /><input name="int" value={fiche.int} onChange={handleFicheChange} style={{ width: 60 }} /></label><br />
            <label>Sagesse<br /><input name="sag" value={fiche.sag} onChange={handleFicheChange} style={{ width: 60 }} /></label><br />
            <label>Charisme<br /><input name="cha" value={fiche.cha} onChange={handleFicheChange} style={{ width: 60 }} /></label><br />
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <button type="submit" style={{ marginRight: 10 }}>Enregistrer</button>
          <button type="button" onClick={handleCancel}>Annuler</button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <h4>Mes personnages D&D 5</h4>
      {personnages.length === 0 && (
        <form onSubmit={handleCreate} style={{ marginTop: 24 }}>
          <label>Nom du personnage : <input value={creationNom} onChange={e => setCreationNom(e.target.value)} required /></label>
          <button type="submit" style={{ marginLeft: 10 }}>Créer</button>
        </form>
      )}
      {personnages.length > 0 && (
        <table style={{ width: '100%', background: '#fff8e1', borderRadius: 8, marginTop: 12 }}>
          <thead><tr><th>Nom</th><th>Classe</th><th>Race</th><th>Niveau</th><th>Action</th></tr></thead>
          <tbody>
            {personnages.map((p, idx) => (
              <tr key={p.nom + idx}>
                <td>{p.nom}</td>
                <td>{p.classe}</td>
                <td>{p.race}</td>
                <td>{p.niveau}</td>
                <td><button onClick={() => handleEdit(idx)}>Voir/Éditer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
