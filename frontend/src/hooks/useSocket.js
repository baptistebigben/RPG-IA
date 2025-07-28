import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const useSocket = (logged, partieId, pseudo, onMessage, onMjReply, onPlayersUpdate, onInterpretation, onResumeUpdated) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (logged && partieId && pseudo) {
      console.log('🔌 Tentative de connexion WebSocket...');
      const socket = io('http://localhost:4000');
      socketRef.current = socket;
      
      socket.on('connect', () => {
        console.log('✅ WebSocket connecté');
      });
      
      socket.on('disconnect', () => {
        console.log('❌ WebSocket déconnecté');
      });
      
      socket.emit('joinRoom', { sessionId: partieId, pseudo });
      console.log('🏠 Rejoindre room:', partieId, 'avec pseudo:', pseudo);
      
      socket.on('playersUpdate', onPlayersUpdate);
      socket.on('message', onMessage);
      socket.on('mjReply', onMjReply);
      socket.on('interpretation', onInterpretation);
      socket.on('resumeUpdated', onResumeUpdated);
      
      return () => socket.disconnect();
    }
  }, [logged, partieId, pseudo, onMessage, onMjReply, onPlayersUpdate, onInterpretation, onResumeUpdated]);

  const sendMessage = (sessionId, auteur, contenu, destinataires) => {
    if (socketRef.current) {
      console.log('📤 Envoi message via WebSocket:', { sessionId, auteur, contenu, destinataires });
      socketRef.current.emit('message', {
        sessionId,
        auteur,
        contenu,
        destinataires
      });
    } else {
      console.error('❌ Socket non disponible pour envoyer le message');
    }
  };

  const updateColor = (sessionId, pseudo, color) => {
    if (socketRef.current) {
      socketRef.current.emit('updateColor', { sessionId, pseudo, color });
    }
  };

  const correctContext = (sessionId, auteur, correctif) => {
    if (socketRef.current) {
      socketRef.current.emit('correctContext', { sessionId, auteur, correctif });
    }
  };

  const confirmCorrectContext = (sessionId, correctif) => {
    if (socketRef.current) {
      socketRef.current.emit('confirmCorrectContext', { sessionId, correctif });
    }
  };

  return {
    sendMessage,
    updateColor,
    correctContext,
    confirmCorrectContext
  };
};

export default useSocket; 