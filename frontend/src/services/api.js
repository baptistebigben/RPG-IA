const API_BASE = '';

export const api = {
  // Authentification
  login: async (pseudo, userId) => {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo, userId })
    });
    
    if (!res.ok) {
      throw new Error('Pseudo déjà utilisé ou invalide');
    }
    
    return res.json();
  },

  // Parties
  getParties: async (pseudo) => {
    const res = await fetch(`${API_BASE}/parties?pseudo=${encodeURIComponent(pseudo || '')}`);
    return res.json();
  },

  createParty: async (nom, mjId, pseudo, version) => {
    const res = await fetch(`${API_BASE}/parties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, mjId, pseudo, version })
    });
    return res.json();
  },

  joinParty: async (id, userId) => {
    const res = await fetch(`${API_BASE}/parties/${id}/rejoindre`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    return res.json();
  },

  renameParty: async (id, nom, pseudo) => {
    const res = await fetch(`${API_BASE}/parties/${id}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, pseudo })
    });
    return res.json();
  },

  deleteParty: async (id, pseudo) => {
    const res = await fetch(`${API_BASE}/parties/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo })
    });
    return res.json();
  },

  // Sessions et messages
  getMessages: async (sessionId) => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`);
    return res.json();
  },

  sendMessage: async (sessionId, auteur, contenu) => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auteur, contenu })
    });
    return res.json();
  },

  updateResume: async (sessionId, resume) => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/resume`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume })
    });
    return res.json();
  },

  confirmContextCorrection: async (sessionId, correctif) => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/confirm-correctContext`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correctif })
    });
    return res.json();
  },

  askMJ: async (sessionId, auteur, contenu) => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/ask-mj`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auteur, contenu })
    });
    return res.json();
  },

  // Upload d'images
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_BASE}/upload`, { 
      method: 'POST', 
      body: formData 
    });
    return res.json();
  }
}; 