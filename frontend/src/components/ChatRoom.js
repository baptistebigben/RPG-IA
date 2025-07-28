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
      // Appel à l'API pour confirmer la correction
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
        <div className="chat-panel">
          <div className="messages-area" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
            {messages
              .filter(m => m && typeof m === 'object' && typeof m.auteur === 'string' && 
                (typeof m.contenu === 'string' || (typeof m.contenu === 'string' && m.contenu.startsWith('<img '))))
              .map((m, idx) => (
                <div
                  key={typeof m.id === 'string' || typeof m.id === 'number' ? String(m.id) : idx}
                  className={
                    'message-bubble ' +
                    (m.auteur === 'MJ' ? 'message-mj' : m.auteur === pseudo ? 'message-joueur' : m.auteur === 'Système' ? 'message-system' : '')
                  }
                >
                  <b style={{ 
                    color: (() => {
                      if (m.auteur === pseudo) return pseudoColor;
                      const found = Array.isArray(players) && players.find(p => 
                        (typeof p === 'object' && typeof p.pseudo === 'string' ? p.pseudo === m.auteur : p === m.auteur)
                      );
                      return found && typeof found === 'object' ? found.color : undefined;
                    })() 
                  }}>
                    {typeof m.auteur === 'string' ? m.auteur : '[corrompu]' } :
                  </b>{' '}
                  {typeof m.contenu === 'string' && m.contenu.startsWith('<img ') ? (
                    <span dangerouslySetInnerHTML={{ __html: m.contenu }} />
                  ) : (
                    m.auteur === 'MJ' ? 
                      <ReactMarkdown>{typeof m.contenu === 'string' ? m.contenu : '[corrompu]'}</ReactMarkdown> : 
                      (typeof m.contenu === 'string' ? m.contenu : '[corrompu]')
                  )}
                  {m.destinataires && <span style={{ fontStyle: 'italic', color: '#888' }}> (privé)</span>}
                </div>
              ))}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSend} className="chat-form">
            <input 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              placeholder="/message Je pénètre dans la taverne..." 
              className="chat-input" 
              onPaste={handlePaste}
            />
            <input 
              value={destinataires} 
              onChange={e => setDestinataires(e.target.value)} 
              placeholder="Destinataires (ex: joueur2,MJ)" 
              className="dest-input" 
            />
            <input 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
            <button type="button" onClick={() => fileInputRef.current.click()}>📷</button>
            <button type="submit">Envoyer</button>
          </form>
        </div>
        
        <div className="side-panel">
          <button onClick={onLeavePartie} className="side-retour">⟵ Retour</button>
          
          <button 
            onClick={() => setShowImageModal(true)} 
            style={{
              marginBottom: 12, 
              marginLeft: 0, 
              width: '100%', 
              background: 'linear-gradient(90deg, #3d2c5a 0%, #bfa76f 100%)', 
              color: '#fff', 
              fontWeight: 'bold', 
              borderRadius: 8, 
              fontSize: 16, 
              padding: '8px 0'
            }}
          >
            Générer image
          </button>

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
              {currentPartie ? 
                <span style={{fontWeight:400, color:'#bfa76f'}}> ({currentPartie.id})</span> : 
                sessionId ? <span style={{fontWeight:400, color:'#bfa76f'}}> ({sessionId})</span> : ''
              }
            </div>
          </div>

          <div id="players-box" style={{ fontSize: '0.97em' }}>
            <b>Joueurs connectés :</b>
            <div className="players-list">
              {players.length > 0 ? (
                players.flat().filter(p => 
                  (typeof p === 'string') || (p && typeof p === 'object' && typeof p.pseudo === 'string')
                ).map((p, idx) => {
                  if (typeof p === 'string') {
                    return (
                      <span key={p + idx} style={{
                        color: p === pseudo ? pseudoColor : undefined,
                        fontWeight: p === pseudo ? 'bold' : undefined,
                        display: 'block', 
                        marginBottom: 6
                      }}>
                        {p}
                      </span>
                    );
                  }
                  if (p && typeof p === 'object' && !Array.isArray(p) && typeof p.pseudo === 'string') {
                    return (
                      <span key={p.pseudo + idx} style={{
                        color: typeof p.color === 'string' ? p.color : undefined,
                        fontWeight: p.pseudo === pseudo ? 'bold' : undefined,
                        display: 'block', 
                        marginBottom: 6
                      }}>
                        {p.pseudo}
                      </span>
                    );
                  }
                  return null;
                })
              ) : (
                <span style={{ color: '#888' }}>(Aucun joueur connecté)</span>
              )}
            </div>
          </div>

          <ColorPicker 
            currentColor={pseudoColor}
            onColorChange={onUpdateColor}
          />

          <div id="resume-box" style={{ fontSize: '0.97em' }}>
            <b>Commandes disponibles :</b>
            <ul style={{marginTop:8, marginBottom:0, paddingLeft:18, color:'#f3e8ff', fontSize:'1em'}}>
              <li><b>/roll 2d6+1 & 1d20</b> : Lance les dés (exemple : 2 dés à 6 faces +1, puis 1 dé à 20 faces).</li>
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
};

export default ChatRoom; 