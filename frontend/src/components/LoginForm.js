import React, { useState } from 'react';

const LoginForm = ({ onLogin }) => {
  const [pseudo, setPseudo] = useState('');
  const [userId, setUserId] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onLogin(pseudo, userId);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Connexion</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input 
          value={pseudo} 
          onChange={e => setPseudo(e.target.value)} 
          placeholder="Pseudo" 
          required
        />
        <button type="submit">Se connecter</button>
      </form>
    </div>
  );
};

export default LoginForm; 