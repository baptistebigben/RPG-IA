import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import ImageGenerator from './ImageGenerator';
import ColorPicker from './ColorPicker';

const ChatRoom = ({ 
  sessionId, 
  pseudo, 
  messages, 
  players, 
  currentPartie, 
  pseudoColor, 
  onSendMessage, 
  onLeavePartie, 
  onUpdateColor 
}) => {
  const [message, setMessage] = useState('');
  const [destinataires, setDestinataires] = useState('');
  const [interpretation, setInterpretation] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message) return;
    
    const dests = destinataires.split(',').map((d) => d.trim()).filter(Boolean);
    onSendMessage(message, dests.length > 0 ? dests : undefined);
    setMessage('');
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

  const handlePaste = async (e) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
    if (item) {
      e.preventDefault();
      const file = item.getAsFile();
      await uploadImage(file);
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const resp = await fetch('/upload', { method: 'POST', body: formData });
    const { url } = await resp.json();
    
    onSendMessage(`<img src="${url}" alt="image" style="max-width:300px;max-height:300px;border-radius:10px;" />`);
  };

  const handleConfirmCorrection = () => {
    if (interpretation) {
      fetch(`/sessions/${sessionId}/confirm-correctContext`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correctif: interpretation.correctif })
      });
      setInterpretation(null);
    }
  };

  if (!Array.isArray(players)) {
    return <div>Erreur : liste des joueurs corrompue</div>;
  }

  return (
    <div className="chat-container">
      <div className="main-layout">
        {/* Panel principal du chat */}
        <div className="chat-panel">
          {/* Zone des messages */}
          <div className="messages-area" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
            {Array.isArray(messages) ? messages
              .filter(m => m && typeof m === 'object' && typeof m.auteur === 'string' && 
                (typeof m.contenu === 'string' || (typeof m.contenu === 'string' && m.contenu.startsWith('<img '))))
              .map((m, idx) => (
                <div
                  key={typeof m.id === 'string' || typeof m.id === 'number' ? String(m.id) : idx}
                  className={
                    'message-bubble animate-fade-in ' +
                    (m.auteur === 'MJ' ? 'message-mj' : m.auteur === pseudo ? 'message-joueur' : m.auteur === 'Système' ? 'message-system' : '')
                  }
                >
                  <div className="message-header">
                    <b style={{ 
                      color: (() => {
                        if (m.auteur === pseudo) return pseudoColor;
                        
                        // Rechercher le joueur dans la liste
                        if (Array.isArray(players)) {
                          for (const player of players) {
                            if (typeof player === 'string' && player === m.auteur) {
                              return undefined; // Pas de couleur pour les strings
                            }
                            if (player && typeof player === 'object' && typeof player.pseudo === 'string' && player.pseudo === m.auteur) {
                              return typeof player.color === 'string' ? player.color : undefined;
                            }
                          }
                        }
                        return undefined;
                      })() 
                    }}>
                      {typeof m.auteur === 'string' ? m.auteur : '[corrompu]' }
                    </b>
                    {m.destinataires && (
                      <span className="badge-discord info" style={{ marginLeft: '8px', fontSize: '10px' }}>
                        Privé
                      </span>
                    )}
                  </div>
                  <div className="message-content">
                    {typeof m.contenu === 'string' && m.contenu.startsWith('<img ') ? (
                      <span dangerouslySetInnerHTML={{ __html: m.contenu }} />
                    ) : (
                      m.auteur === 'MJ' ? 
                        <ReactMarkdown>{typeof m.contenu === 'string' ? m.contenu : '[corrompu]'}</ReactMarkdown> : 
                        (typeof m.contenu === 'string' ? m.contenu : '[corrompu]')
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-sm text-muted italic">Aucun message</div>
              )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Formulaire de chat */}
          <form onSubmit={handleSend} className="chat-form">
            <input 
              type="text"
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              placeholder="Tapez votre message..." 
              className="chat-input" 
              onPaste={handlePaste}
            />
            <input 
              type="text"
              value={destinataires} 
              onChange={e => setDestinataires(e.target.value)} 
              placeholder="Destinataires (optionnel)" 
              className="dest-input" 
            />
            <input 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
            <button 
              type="button" 
              className="btn-discord outline"
              onClick={() => fileInputRef.current.click()}
            >
              📷
            </button>
            <button type="submit" className="btn-discord">
              Envoyer
            </button>
          </form>
        </div>
        
        {/* Panel latéral */}
        <div className="side-panel">
          {/* Bouton retour */}
          <button 
            onClick={onLeavePartie} 
            className="btn-discord danger w-full"
          >
            ← Retour
          </button>
          
          {/* Bouton générer image */}
          <button 
            onClick={() => setShowImageModal(true)} 
            className="btn-discord secondary w-full"
          >
            🎨 Générer image
          </button>

          {/* Modal générateur d'image */}
          {showImageModal && (
            <ImageGenerator 
              onClose={() => setShowImageModal(false)}
              onImageGenerated={(imageUrl) => {
                setShowImageModal(false);
                setMessage(`<img src='${imageUrl}' alt='image générée' style='max-width:300px;max-height:300px;border-radius:10px;' />`);
                setTimeout(() => {
                  document.querySelector('.chat-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }, 0);
              }}
            />
          )}

          {/* Informations de la partie */}
          <div className="card-discord">
            <div className="section-title">
              🎮 {currentPartie ? currentPartie.nom : 'Partie'}
            </div>
            <div className="text-sm text-secondary">
              ID: {currentPartie ? currentPartie.id : sessionId}
            </div>
          </div>

          {/* Liste des joueurs */}
          <div className="card-discord">
            <div className="section-title">
              👥 Joueurs connectés ({players.length})
            </div>
            <div className="players-list">
              {(() => {
                // Nettoyer et filtrer les joueurs
                const validPlayers = [];
                
                if (Array.isArray(players)) {
                  players.forEach(player => {
                    if (typeof player === 'string') {
                      validPlayers.push({ type: 'string', value: player });
                    } else if (player && typeof player === 'object' && typeof player.pseudo === 'string') {
                      validPlayers.push({ type: 'object', value: player });
                    }
                  });
                }
                
                if (validPlayers.length === 0) {
                  return <div className="text-sm text-muted italic">Aucun joueur connecté</div>;
                }
                
                return validPlayers.map((playerData, idx) => {
                  if (playerData.type === 'string') {
                    const playerName = playerData.value;
                    return (
                      <div key={`string-${playerName}-${idx}`} className="player-item">
                        <div 
                          className="player-avatar"
                          style={{ backgroundColor: playerName === pseudo ? pseudoColor : '#5865f2' }}
                        >
                          {playerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="player-name">
                          {playerName === pseudo ? 'Vous' : playerName}
                        </div>
                        <div className="player-status"></div>
                      </div>
                    );
                  }
                  
                  if (playerData.type === 'object') {
                    const player = playerData.value;
                    return (
                      <div key={`object-${player.pseudo}-${idx}`} className="player-item">
                        <div 
                          className="player-avatar"
                          style={{ backgroundColor: typeof player.color === 'string' ? player.color : '#5865f2' }}
                        >
                          {player.pseudo.charAt(0).toUpperCase()}
                        </div>
                        <div className="player-name">
                          {player.pseudo === pseudo ? 'Vous' : player.pseudo}
                        </div>
                        <div className="player-status"></div>
                      </div>
                    );
                  }
                  
                  return null;
                });
              })()}
            </div>
          </div>

          {/* Sélecteur de couleur */}
          <div className="card-discord">
            <div className="section-title">
              🎨 Votre couleur
            </div>
            <ColorPicker 
              currentColor={pseudoColor}
              onColorChange={onUpdateColor}
            />
          </div>

          {/* Commandes disponibles */}
          <div className="card-discord">
            <div className="section-title">
              ⚡ Commandes
            </div>
            <div className="commands-list">
              <div className="command-item">
                <span className="badge-discord primary command-badge">/roll</span>
                <div className="command-description">
                  Lance les dés (ex: <code>2d6+1 & 1d20</code>)
                </div>
              </div>
              <div className="command-item">
                <span className="badge-discord success command-badge">/start</span>
                <div className="command-description">
                  Lance l'aventure avec le MJ IA
                </div>
              </div>
              <div className="command-item">
                <span className="badge-discord warning command-badge">/help</span>
                <div className="command-description">
                  Affiche l'aide des commandes
                </div>
              </div>
              <div className="command-item">
                <span className="badge-discord info command-badge">/resume</span>
                <div className="command-description">
                  Demande un résumé de la partie
                </div>
              </div>
              <div className="command-item">
                <span className="badge-discord primary command-badge">/message</span>
                <div className="command-description">
                  Envoie un message privé au MJ
                </div>
              </div>
              <div className="command-item">
                <span className="badge-discord warning command-badge">/correct</span>
                <div className="command-description">
                  Propose une correction du contexte
                </div>
              </div>
            </div>
          </div>

          {/* Interprétation de correction */}
          {interpretation && (
            <div className="card-discord" style={{ background: 'rgba(250, 166, 26, 0.1)', borderColor: 'var(--color-warning)' }}>
              <div className="section-title">
                ⚠️ Interprétation
              </div>
              <div className="text-sm mb-3">
                {interpretation.interpretation}
              </div>
              <div className="flex gap-2">
                <button onClick={handleConfirmCorrection} className="btn-discord success">
                  Confirmer
                </button>
                <button onClick={() => setInterpretation(null)} className="btn-discord outline">
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatRoom; 