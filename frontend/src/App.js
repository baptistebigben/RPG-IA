import React, { useState, useEffect, useCallback } from 'react';
import LoginForm from './components/LoginForm';
import ServerList from './components/ServerList';
import ChatRoom from './components/ChatRoom';
import HelpModal from './components/HelpModal';
import useSocket from './hooks/useSocket';
import { api } from './services/api';
import './App.css';

const PALETTE = ['#6d2e7a', '#bfa76f', '#e07a5f', '#3e2723', '#457b9d', '#43aa8b', '#f9c74f', '#f9844a', '#277da1', '#bc6c25'];

function App() {
  // État de l'application
  const [pseudo, setPseudo] = useState('');
  const [userId, setUserId] = useState('');
  const [logged, setLogged] = useState(false);
  const [parties, setParties] = useState([]);
  const [partieId, setPartieId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [players, setPlayers] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const [pseudoColor, setPseudoColor] = useState(() => 
    sessionStorage.getItem('pseudoColor') || PALETTE[0]
  );

  // Callbacks pour les événements WebSocket
  const handleMessage = useCallback((msg) => {
    console.log('📨 Message reçu via WebSocket:', msg);
    setMessages((m) => {
      if (msg.id && m.some(existing => existing.id === msg.id)) {
        console.log('🔄 Message déjà présent, ignoré');
        return m;
      }
      console.log('✅ Nouveau message ajouté à l\'état');
      return [...m, msg];
    });
  }, []);

  const handleMjReply = useCallback((msg) => {
    console.log('🤖 Réponse MJ reçue via WebSocket:', msg);
    setMessages((m) => {
      if (msg.id && m.some(existing => existing.id === msg.id)) {
        console.log('🔄 Réponse MJ déjà présente, ignorée');
        return m;
      }
      console.log('✅ Nouvelle réponse MJ ajoutée à l\'état');
      return [...m, msg];
    });
  }, []);

  const handlePlayersUpdate = useCallback(({ players }) => {
    setPlayers(players);
    // Si la couleur du joueur a changé côté backend, on la met à jour localement aussi
    const me = players.find(p => typeof p === 'object' && p.pseudo === pseudo);
    if (me && me.color && me.color !== pseudoColor) {
      setPseudoColor(me.color);
      sessionStorage.setItem('pseudoColor', me.color);
    }
  }, [pseudo, pseudoColor]);

  const handleInterpretation = useCallback(({ interpretation, correctif }) => {
    // Gérer l'interprétation de correction de contexte
    console.log('Interprétation reçue:', interpretation, correctif);
  }, []);

  const handleResumeUpdated = useCallback(({ resume }) => {
    setMessages((m) => [...m, { auteur: 'Système', contenu: `Résumé mis à jour : ${resume}` }]);
  }, []);

  // Hook WebSocket
  const { sendMessage, updateColor } = useSocket(
    logged, 
    partieId, 
    pseudo, 
    handleMessage, 
    handleMjReply, 
    handlePlayersUpdate, 
    handleInterpretation, 
    handleResumeUpdated
  );

  // Initialisation au chargement
  useEffect(() => {
    const savedPseudo = sessionStorage.getItem('pseudo');
    const savedUserId = sessionStorage.getItem('userId');
    if (savedPseudo && savedUserId) {
      setPseudo(savedPseudo);
      setUserId(savedUserId);
      setLogged(true);
    }
  }, []);

  // Récupérer la liste des parties
  useEffect(() => {
    if (logged) {
      api.getParties(pseudo).then(setParties);
    }
  }, [logged, pseudo, pseudoColor]);

  // Gestionnaires d'événements
  const handleLogin = async (pseudoInput, userIdInput) => {
    try {
      const data = await api.login(pseudoInput, userIdInput);
      setUserId(data.userId);
      setPseudo(data.pseudo);
      setLogged(true);
      sessionStorage.setItem('pseudo', data.pseudo);
      sessionStorage.setItem('userId', data.userId);
    } catch (error) {
      alert(error.message);
    }
  };

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

  const handleJoin = async (id) => {
    setPartieId(id);
    setSessionId(id);
    
    // Récupère l'historique
    try {
      const histo = await api.getMessages(id);
      setMessages(histo);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
    }
  };

  const handleSendMessage = (message, destinataires) => {
    // Envoyer le message via WebSocket seulement
    // Le message sera ajouté à l'état local quand il sera reçu via WebSocket
    sendMessage(sessionId, pseudo, message, destinataires);
  };

  const handleLeavePartie = () => {
    setPartieId('');
    setSessionId('');
    setMessages([]);
    setPlayers([]);
  };

  const handleUpdateColor = (newColor) => {
    setPseudoColor(newColor);
    sessionStorage.setItem('pseudoColor', newColor);
    updateColor(sessionId, pseudo, newColor);
  };

  // Trouver la partie courante pour afficher son nom
  const currentPartie = parties.find(p => p.id === partieId);

  // Rendu conditionnel
  if (!logged) {
    return <LoginForm onLogin={handleLogin} />;
  }

  if (!partieId) {
    return (
      <>
        <ServerList 
          parties={parties}
          pseudo={pseudo}
          onJoin={handleJoin}
          onLogout={handleLogout}
          onShowHelp={() => setShowHelp(true)}
        />
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </>
    );
  }

  return (
    <>
      <ChatRoom 
        sessionId={sessionId}
        pseudo={pseudo}
        messages={messages}
        players={players}
        currentPartie={currentPartie}
        pseudoColor={pseudoColor}
        onSendMessage={handleSendMessage}
        onLeavePartie={handleLeavePartie}
        onUpdateColor={handleUpdateColor}
      />
    </>
  );
}

export default App;
