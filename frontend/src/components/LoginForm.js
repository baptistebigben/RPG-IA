import React, { useState } from 'react';

const LoginForm = ({ onLogin }) => {
  const [pseudo, setPseudo] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pseudo.trim()) return;
    
    setLoading(true);
    try {
      await onLogin(pseudo, userId);
    } catch (error) {
      console.error('Erreur de connexion:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            🎮
          </div>
          <h1 className="login-title">RPG Chat IA</h1>
          <p className="login-subtitle">Plongez dans l'aventure avec l'IA</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="pseudo" className="form-label">
              Pseudo
            </label>
            <input
              id="pseudo"
              type="text"
              value={pseudo}
              onChange={e => setPseudo(e.target.value)}
              placeholder="Entrez votre pseudo"
              className="form-input"
              required
            />
          </div>
          
          <button
            type="submit"
            className={`btn-discord w-full ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Connexion...
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>
        
        <div className="login-footer">
          <p className="text-xs text-muted">
            En vous connectant, vous acceptez de participer à une aventure immersive
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm; 