require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Database = require('better-sqlite3');
const Groq = require('groq-sdk');
const crypto = require('crypto');
const cors = require('cors');
const multer = require('multer');
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont autorisées'));
  }
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware CORS pour les routes Express
app.use(cors());
app.use(express.json()); // Pour parser le JSON

const db = new Database('sessions.db');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sessionId TEXT PRIMARY KEY,
    partieId TEXT,
    prompt TEXT,
    resume TEXT
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sessionId TEXT,
    auteur TEXT,
    contenu TEXT,
    timestamp INTEGER
  );
`);

// Ajout de la colonne destinataires si elle n'existe pas déjà
try {
  db.prepare('SELECT destinataires FROM messages LIMIT 1').get();
} catch (e) {
  db.exec('ALTER TABLE messages ADD COLUMN destinataires TEXT');
}

const users = {}; // Stockage en mémoire des utilisateurs connectés
const parties = {}; // Stockage en mémoire des parties

// Chargement des parties existantes depuis la BDD au démarrage
const sessions = db.prepare('SELECT * FROM sessions').all();
for (const session of sessions) {
  // Récupérer la liste des joueurs distincts ayant envoyé un message dans cette session
  const joueurs = db.prepare('SELECT DISTINCT auteur FROM messages WHERE sessionId = ?').all(session.sessionId)
    .map(r => r.auteur)
    .filter(j => j && j !== 'MJ' && j !== 'Système')
    .map(j => (typeof j === 'object' && j.pseudo ? j : { pseudo: String(j), color: '#6d2e7a' })); // Force le format
  // Correction du nom de la partie
  let nomPartie = '';
  if (session.prompt && session.prompt.includes('Nom de la partie :')) {
    nomPartie = session.prompt.split('Nom de la partie :')[1]?.split('\n')[0]?.trim() || session.sessionId;
  } else if (session.nom) {
    nomPartie = session.nom;
  } else {
    nomPartie = 'Partie sans nom';
  }
  parties[session.sessionId] = {
    id: session.sessionId,
    nom: nomPartie,
    prompt: session.prompt,
    resume: session.resume,
    version: session.version || '',
    joueurs,
    messages: [],
    fiches: {},
    proprietaire: joueurs[0] || '',
    mjId: 'MJ',
  };
}

app.post('/login', (req, res) => {
  const { pseudo, userId, color } = req.body;
  if (!pseudo || typeof pseudo !== 'string' || pseudo.trim() === '') {
    return res.status(400).json({ error: 'Pseudo invalide' });
  }
  // Vérifier si le pseudo est déjà pris
  const existingUserId = Object.keys(users).find(id => users[id] === pseudo);
  if (existingUserId) {
    // Vérifier s'il y a une socket active pour ce pseudo
    const isStillConnected = Object.values(io.sockets.sockets).some(s => s.pseudo === pseudo);
    if (!isStillConnected) {
      // Libérer le pseudo et permettre la reconnexion
      delete users[existingUserId];
    } else {
      return res.status(409).json({ error: 'Ce pseudo est déjà utilisé' });
    }
  }
  // Nouveau pseudo ou reconnexion
  const newUserId = userId || (Date.now() + Math.random().toString(36).substr(2, 9));
  users[newUserId] = { pseudo, color };
  res.json({ userId: newUserId, pseudo });
});

app.get('/', (req, res) => {
  res.send('Backend RPG Chat IA opérationnel !');
});

// Créer une partie
app.post('/parties', (req, res) => {
  const { nom, mjId, pseudo, version } = req.body;
  if (!nom || typeof nom !== 'string' || nom.trim() === '') {
    return res.status(400).json({ error: 'Nom de partie invalide' });
  }
  if (!mjId || !users[mjId]) {
    return res.status(400).json({ error: 'MJ invalide' });
  }
  if (!pseudo || typeof pseudo !== 'string') {
    return res.status(400).json({ error: 'Propriétaire manquant' });
  }
  if (!version || typeof version !== 'string') {
    return res.status(400).json({ error: 'Version du jeu de rôle obligatoire' });
  }
  const partieId = Date.now() + Math.random().toString(36).substr(2, 9);
  const sessionId = partieId; // sessionId = partieId pour simplifier
  parties[partieId] = {
    id: partieId,
    version,
    nom,
    mjId,
    joueurs: [{ pseudo, color: users[mjId]?.color || '#6d2e7a' }],
    messages: [],
    fiches: {},
    proprietaire: pseudo,
  };
  // Créer automatiquement une session dans la base de données
  const promptSystem = `Tu es le maître de jeu d'une aventure de jeu de rôle médiéval fantastique. Les règles à utiliser sont : ${version}. Sois immersif, mais concis. Laisse de la place à l'imagination des joueurs, ne donne pas tous les détails, suggère, pose des questions ouvertes, laisse des mystères. Réponds toujours en français, en Markdown, en alternant les textes courts et les textes longs en fonction de la situation.`;
  db.prepare('INSERT INTO sessions (sessionId, partieId, prompt, resume, version) VALUES (?, ?, ?, ?, ?)').run(sessionId, partieId, promptSystem, '', version);
  // Envoi d'une introduction automatique à l'IA (questionnaire de création de partie)
  (async () => {
    try {
      const introPrompt = [
        { role: 'system', content: promptSystem },
        { role: 'user', content: `Avant de commencer l'aventure, tu dois recueillir toutes les informations nécessaires auprès des joueurs, de façon immersive et roleplay. Présente-toi comme MJ, explique que tu vas les guider dans la création de la partie, et pose toutes les questions nécessaires pour bien préparer l'aventure. Demande notamment :\n- Le nombre de joueurs attendus\n- Le type d'univers ou d'ambiance qu'ils souhaitent explorer\n- Les règles ou systèmes de jeu à utiliser (ou si tu dois en proposer un)\n- La création de personnage (nom, classe, histoire, traits, etc.)\n- Leurs attentes ou envies particulières pour cette aventure\nFormate ta réponse en Markdown pour la lisibilité, et reste immersif.` }
      ];
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: introPrompt,
        max_tokens: 600
      });
      const introMJ = completion.choices[0].message.content;
      db.prepare('INSERT INTO messages (sessionId, auteur, contenu, timestamp) VALUES (?, ?, ?, ?)')
        .run(sessionId, 'MJ', introMJ, Date.now());
    } catch (e) {
      db.prepare('INSERT INTO messages (sessionId, auteur, contenu, timestamp) VALUES (?, ?, ?, ?)')
        .run(sessionId, 'MJ', "[Erreur lors de la génération de l'introduction IA]", Date.now());
    }
  })();
  res.json(parties[partieId]);
});

// Lister les parties (admin voit tout)
app.get('/parties', (req, res) => {
  res.json(Object.values(parties));
});

// Rejoindre une partie
app.post('/parties/:id/rejoindre', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const partie = parties[id];
  if (!partie) {
    return res.status(404).json({ error: 'Partie non trouvée' });
  }
  if (!userId || !users[userId]) {
    return res.status(400).json({ error: 'Utilisateur invalide' });
  }
  // On force le format {pseudo, color} même si la BDD est sale
  const joueur = users[userId];
  if (!partie.joueurs.some(j => j.pseudo === joueur.pseudo)) {
    partie.joueurs.push({ pseudo: joueur.pseudo, color: joueur.color || '#6d2e7a' });
  }
  // On nettoie la liste pour ne garder que des objets bien formés
  partie.joueurs = partie.joueurs.map(j => (typeof j === 'object' && j.pseudo ? j : { pseudo: String(j), color: '#6d2e7a' }));
  res.json(partie);
});

// Renommer une partie
app.post('/parties/:id/rename', (req, res) => {
  const { id } = req.params;
  const { nom, pseudo } = req.body;
  if (!nom || typeof nom !== 'string' || nom.trim() === '') {
    return res.status(400).json({ error: 'Nom de partie invalide' });
  }
  if (!parties[id]) {
    return res.status(404).json({ error: 'Partie non trouvée' });
  }
  const partie = parties[id];
  if (pseudo !== 'admin' && pseudo !== partie.proprietaire) {
    return res.status(403).json({ error: 'Seul le propriétaire ou l\'admin peut renommer cette partie.' });
  }
  parties[id].nom = nom;
  res.json({ id, nom });
});

// Supprimer une partie
app.delete('/parties/:id', (req, res) => {
  const { id } = req.params;
  const { pseudo } = req.body;
  if (pseudo !== 'admin') {
    return res.status(403).json({ error: 'Seul l\'administrateur peut supprimer une partie.' });
  }
  if (!parties[id]) {
    return res.status(404).json({ error: 'Partie non trouvée' });
  }
  delete parties[id];
  res.json({ success: true });
});

// Endpoint de login admin
app.post('/admin/login', (req, res) => {
  const { pseudo, password } = req.body;
  if (pseudo === ADMIN_PSEUDO && password === ADMIN_PASSWORD) {
    adminToken = crypto.randomBytes(32).toString('hex');
    res.json({ token: adminToken });
  } else {
    res.status(401).json({ error: 'Identifiants invalides' });
  }
});

// Middleware de vérification du token admin
function checkAdminToken(req, res, next) {
  const token = req.headers['authorization'];
  if (token && token === `Bearer ${adminToken}`) {
    return next();
  }
  res.status(403).json({ error: 'Accès administrateur requis' });
}

// Endpoint pour supprimer une partie et tout son contexte
app.delete('/admin/parties/:partieId', checkAdminToken, (req, res) => {
  const { partieId } = req.params;
  // Trouver la session liée à la partie
  const session = db.prepare('SELECT sessionId FROM sessions WHERE partieId = ?').get(partieId);
  if (session) {
    db.prepare('DELETE FROM messages WHERE sessionId = ?').run(session.sessionId);
    db.prepare('DELETE FROM sessions WHERE sessionId = ?').run(session.sessionId);
  }
  // Supprimer la partie en mémoire
  if (parties[partieId]) {
    delete parties[partieId];
  }
  res.json({ ok: true, partieId });
});

// Endpoint temporaire pour lister les pseudos connus
app.get('/users', (req, res) => {
  res.json(Object.values(users));
});

// Endpoint pour récupérer l'historique des messages d'une session
app.get('/sessions/:sessionId/messages', (req, res) => {
  const { sessionId } = req.params;
  const messages = db.prepare('SELECT id, auteur, contenu, destinataires FROM messages WHERE sessionId = ? ORDER BY timestamp ASC').all(sessionId);
  res.json(messages);
});

// Fonction pour récupérer le contexte à envoyer à GPT
function getSessionContext(sessionId) {
  const session = db.prepare('SELECT * FROM sessions WHERE sessionId = ?').get(sessionId);
  if (!session) return null;
  const messages = db.prepare('SELECT auteur, contenu FROM messages WHERE sessionId = ? ORDER BY timestamp DESC LIMIT 15').all(sessionId).reverse();
  const context = [];
  if (session.prompt) {
    context.push({ role: 'system', content: session.prompt });
  }
  if (session.resume) {
    context.push({ role: 'system', content: `Résumé de la session : ${session.resume}` });
  }
  for (const msg of messages) {
    context.push({
      role: msg.auteur === 'MJ' ? 'assistant' : 'user',
      content: msg.contenu
    });
  }
  return context;
}

// Fonction pour demander à OpenAI d'interpréter un correctif de contexte
async function demanderInterpretationCorrectif(sessionId, correctif) {
  const context = getSessionContext(sessionId) || [];
  // On ajoute le message de correction à la fin du pack
  context.push({ role: 'user', content: `/correctContext ${correctif}` });
  // On ajoute un prompt système spécial pour guider l'IA
  context.unshift({
    role: 'system',
    content: "Un joueur propose une correction de contexte pour la partie de jeu de rôle. Reformule en une phrase ce que tu comprends de ce correctif, sans l'appliquer ni modifier le contexte."
  });
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: context,
    max_tokens: 100
  });
  return completion.choices[0].message.content;
}

// Route pour mettre à jour le résumé de la session
app.put('/sessions/:sessionId/resume', (req, res) => {
  const { sessionId } = req.params;
  const { resume } = req.body;
  if (typeof resume !== 'string' || resume.trim() === '') {
    return res.status(400).json({ error: 'Résumé invalide' });
  }
  const result = db.prepare('UPDATE sessions SET resume = ? WHERE sessionId = ?').run(resume, sessionId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Session non trouvée' });
  }
  res.json({ sessionId, resume });
});

// Endpoint pour envoyer un message (et gérer /correctContext et les commandes /)
app.post('/sessions/:sessionId/message', async (req, res) => {
  const { sessionId } = req.params;
  const { auteur, contenu } = req.body;
  if (!auteur || typeof auteur !== 'string' || !contenu || typeof contenu !== 'string') {
    return res.status(400).json({ error: 'Auteur ou contenu manquant' });
  }
  // Gestion des commandes slash
  if (contenu.startsWith('/')) {
    let reponseMJ = '';
    if (contenu.startsWith('/start')) {
      // Lancement d'une introduction IA
      const promptSystem = getSessionContext(sessionId)?.find(m => m.role === 'system')?.content || '';
      const introPrompt = [
        { role: 'system', content: promptSystem },
        { role: 'user', content: "Tu es un MJ de jeu de rôle. Réponds tout le temps en français. tant que la commande /start n'est pas lancée, tu ne fait que récupérer le contexte de la partie et répondre en français." }
      ];
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: introPrompt,
        max_tokens: 600
      });
      reponseMJ = completion.choices[0].message.content;
    } else if (contenu.startsWith('/help')) {
      reponseMJ = "Commandes disponibles : /start (introduction), /resume (résumé de la partie), /help (cette aide).";
    } else if (contenu.startsWith('/resume')) {
      const context = getSessionContext(sessionId) || [];
      const resumePrompt = [
        ...context,
        { role: 'user', content: "Fais un résumé de l'aventure en cours pour les joueurs, en français." }
      ];
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: resumePrompt,
        max_tokens: 600
      });
      reponseMJ = completion.choices[0].message.content;
    } else if (contenu.startsWith('/correctStory ')) {
      // Correction de contexte via le chat
      const correctif = contenu.replace('/correctStory ', '').trim();
      if (!correctif) {
        reponseMJ = "Correctif vide. Utilisez : /correctStory [votre correction]";
      } else {
        // Stocker le correctif dans l'historique
        const infoCorrect = db.prepare('INSERT INTO messages (sessionId, auteur, contenu, timestamp) VALUES (?, ?, ?, ?)')
          .run(sessionId, auteur, contenu, Date.now());
        // Demander l'interprétation à l'IA
        try {
          const interpretation = await demanderInterpretationCorrectif(sessionId, correctif);
          reponseMJ = interpretation;
        } catch (e) {
          reponseMJ = "Erreur lors de l'appel à l'IA pour la correction : " + e.message;
        }
      }
    } else {
      reponseMJ = "Commande inconnue. Tapez /help pour la liste des commandes.";
    }
    db.prepare('INSERT INTO messages (sessionId, auteur, contenu, timestamp) VALUES (?, ?, ?, ?)')
      .run(sessionId, 'MJ', reponseMJ, Date.now());
    return res.json({ reponseMJ });
  }
  // Commande /correctContext déjà gérée
  if (contenu.startsWith('/correctContext ')) {
    const correctif = contenu.replace('/correctContext ', '').trim();
    if (!correctif) {
      return res.status(400).json({ error: 'Correctif vide' });
    }
    db.prepare('INSERT INTO messages (sessionId, auteur, contenu, timestamp) VALUES (?, ?, ?, ?)')
      .run(sessionId, auteur, contenu, Date.now());
    try {
      const interpretation = await demanderInterpretationCorrectif(sessionId, correctif);
      return res.json({ interpretation, correctif });
    } catch (e) {
      return res.status(500).json({ error: "Erreur lors de l'appel à Groq", details: e.message });
    }
  }
  // Message normal : on l'ajoute à l'historique
  db.prepare('INSERT INTO messages (sessionId, auteur, contenu, timestamp) VALUES (?, ?, ?, ?)')
    .run(sessionId, auteur, contenu, Date.now());
  res.json({ ok: true });
});

// Endpoint pour confirmer et appliquer le correctif de contexte
app.post('/sessions/:sessionId/confirm-correctContext', (req, res) => {
  const { sessionId } = req.params;
  const { correctif } = req.body;
  if (!correctif || typeof correctif !== 'string' || correctif.trim() === '') {
    return res.status(400).json({ error: 'Correctif manquant' });
  }
  // Récupérer le résumé actuel
  const session = db.prepare('SELECT resume FROM sessions WHERE sessionId = ?').get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session non trouvée' });
  }
  // Ajouter le correctif au résumé (concaténation)
  const nouveauResume = session.resume ? session.resume + ' | Correction : ' + correctif : 'Correction : ' + correctif;
  db.prepare('UPDATE sessions SET resume = ? WHERE sessionId = ?').run(nouveauResume, sessionId);
  res.json({ sessionId, resume: nouveauResume });
});

// Endpoint pour discuter avec le MJ virtuel (Groq)
app.post('/sessions/:sessionId/ask-mj', async (req, res) => {
  const { sessionId } = req.params;
  const { auteur, contenu } = req.body;
  if (!auteur || typeof auteur !== 'string' || !contenu || typeof contenu !== 'string') {
    return res.status(400).json({ error: 'Auteur ou contenu manquant' });
  }
  db.prepare('INSERT INTO messages (sessionId, auteur, contenu, timestamp) VALUES (?, ?, ?, ?)')
    .run(sessionId, auteur, contenu, Date.now());
  const context = getSessionContext(sessionId) || [];
  context.push({ role: 'user', content: contenu });
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: context,
      max_tokens: 600
    });
    const reponseMJ = completion.choices[0].message.content;
    db.prepare('INSERT INTO messages (sessionId, auteur, contenu, timestamp) VALUES (?, ?, ?, ?)')
      .run(sessionId, 'MJ', reponseMJ, Date.now());
    res.json({ reponseMJ });
  } catch (e) {
    res.status(500).json({ error: "Erreur lors de l'appel à Groq", details: e.message });
  }
});

// --- MJ VIRTUEL UNIQUEMENT (Groq) ---
// Le MJ est toujours l'API Groq. Pas de gestion de MJ humain.

// Compteur de messages par session pour la mise à jour automatique du résumé
const resumeCounters = {};

// Fonction pour mettre à jour le résumé de session via l'IA
async function updateSessionResume(sessionId) {
  const context = getSessionContext(sessionId) || [];
  context.push({ role: 'user', content: "Fais un résumé synthétique et fidèle de l'aventure en cours, pour que le MJ puisse s'en souvenir même si l'historique est tronqué. Résume les faits importants, les personnages, les enjeux, les lieux, etc. Réponds en français." });
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: context,
    max_tokens: 600
  });
  const resume = completion.choices[0].message.content;
  db.prepare('UPDATE sessions SET resume = ? WHERE sessionId = ?').run(resume, sessionId);
  console.log("Résumé mis à jour :", resume);
}

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

app.use('/uploads', express.static('uploads'));

io.on('connection', (socket) => {
  console.log('Un utilisateur s\'est connecté');

  // Rejoindre une room (sessionId)
  socket.on('joinRoom', ({ sessionId, pseudo }) => {
    socket.join(sessionId);
    socket.sessionId = sessionId;
    socket.pseudo = pseudo;
    // Nettoyer les anciennes entrées de ce pseudo dans la partie
    if (parties[sessionId]) {
      parties[sessionId].joueurs = parties[sessionId].joueurs.filter(j => j.pseudo !== pseudo);
      // Chercher la couleur dans users
      const userColor = Object.values(users).find(u => u.pseudo === pseudo)?.color || '#6d2e7a';
      parties[sessionId].joueurs.push({ pseudo, color: userColor });
      io.to(sessionId).emit('playersUpdate', { players: parties[sessionId].joueurs });
    }
    socket.to(sessionId).emit('info', `${pseudo} a rejoint la partie.`);
  });

  // Message (public ou direct, MJ = Groq)
  socket.on('message', async ({ sessionId, auteur, contenu, destinataires }) => {
    if (!sessionId || !auteur || !contenu) return;
    const destinatairesStr = destinataires ? JSON.stringify(destinataires) : null;
    const info = db.prepare('INSERT INTO messages (sessionId, auteur, contenu, timestamp, destinataires) VALUES (?, ?, ?, ?, ?)')
      .run(sessionId, auteur, contenu, Date.now(), destinatairesStr);
    const id = info.lastInsertRowid;
    // Diffusion du message utilisateur (toujours, même si commande)
    if (destinataires && Array.isArray(destinataires) && destinataires.length > 0) {
      // Message direct : envoyer uniquement aux sockets concernés
      const sockets = await io.in(sessionId).fetchSockets();
      sockets.forEach(s => {
        if (destinataires.includes(s.pseudo) || s.pseudo === auteur) {
          s.emit('message', { id, auteur, contenu, destinataires });
        }
      });
    } else {
      // Message public : à toute la room
      io.to(sessionId).emit('message', { id, auteur, contenu });
    }

    // 1. Traiter d'abord /message (envoyé à l'IA)
    if (contenu.startsWith('/message ')) {
      const action = contenu.replace('/message ', '').trim();
      // Construire le contexte et envoyer à l'IA
      const context = getSessionContext(sessionId) || [];
      context.push({ role: 'user', content: action });
      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: context,
          max_tokens: 600
        });
        const reponseMJ = completion.choices[0].message.content;
        const infoMJ = db.prepare('INSERT INTO messages (sessionId, auteur, contenu, timestamp, destinataires) VALUES (?, ?, ?, ?, ?)')
          .run(sessionId, 'MJ', reponseMJ, Date.now(), destinatairesStr);
        const idMJ = infoMJ.lastInsertRowid;
        io.to(sessionId).emit('mjReply', { id: idMJ, auteur: 'MJ', contenu: reponseMJ });
      } catch (e) {
        socket.emit('error', { error: "Erreur Groq", details: e.message });
      }
      // Mise à jour automatique du résumé toutes les 5 interactions
      resumeCounters[sessionId] = (resumeCounters[sessionId] || 0) + 1;
      if (resumeCounters[sessionId] % 5 === 0) {
        updateSessionResume(sessionId).catch(e => console.error('Erreur MAJ résumé :', e));
      }
      return;
    }

    // 1bis. Traiter la commande /roll
    if (contenu.startsWith('/roll ')) {
      const rollCmd = contenu.replace('/roll ', '').trim();
      // Séparer les groupes de dés par &
      const groups = rollCmd.split('&').map(g => g.trim());
      let resultText = '';
      for (const group of groups) {
        // Regex pour matcher "XdY+Z" ou "XdY"
        const match = group.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
        if (!match) {
          resultText += `Syntaxe invalide pour : ${group}\n`;
          continue;
        }
        const nb = parseInt(match[1] || '1', 10);
        const faces = parseInt(match[2], 10);
        const mod = match[3] ? parseInt(match[3], 10) : 0;
        const rolls = [];
        for (let i = 0; i < nb; i++) {
          rolls.push(Math.floor(Math.random() * faces) + 1);
        }
        const total = rolls.reduce((a, b) => a + b, 0) + mod;
        resultText += `🎲 ${group} : [${rolls.join(', ')}]`;
        if (mod) resultText += (mod > 0 ? ` +${mod}` : ` ${mod}`);
        resultText += ` = **${total}**\n`;
      }
      // Diffuser le résultat à tous
      io.to(sessionId).emit('mjReply', { auteur: 'Système', contenu: resultText });
      return;
    }

    // 2. Puis les autres commandes slash (start, help, etc.)
    if (contenu.startsWith('/')) {
      let reponseMJ = '';
      if (contenu.startsWith('/start')) {
        const promptSystem = getSessionContext(sessionId)?.find(m => m.role === 'system')?.content || '';
        const introPrompt = [
          { role: 'system', content: promptSystem },
          { role: 'user', content: "Lance l'aventure, présente l'univers, le contexte, les enjeux pour les joueurs. Sois immersif et en français." }
        ];
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: introPrompt,
          max_tokens: 600
        });
        reponseMJ = completion.choices[0].message.content;
      } else if (contenu.startsWith('/help')) {
        reponseMJ = "Commandes disponibles : /start (introduction), /resume (résumé de la partie), /help (cette aide).";
      } else if (contenu.startsWith('/resume')) {
        const context = getSessionContext(sessionId) || [];
        const resumePrompt = [
          ...context,
          { role: 'user', content: "Fais un résumé de l'aventure en cours pour les joueurs, en français." }
        ];
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: resumePrompt,
          max_tokens: 600
        });
        reponseMJ = completion.choices[0].message.content;
      } else if (contenu.startsWith('/correctStory ')) {
        // Correction de contexte via le chat
        const correctif = contenu.replace('/correctStory ', '').trim();
        if (!correctif) {
          reponseMJ = "Correctif vide. Utilisez : /correctStory [votre correction]";
        } else {
          // Stocker le correctif dans l'historique
          const infoCorrect = db.prepare('INSERT INTO messages (sessionId, auteur, contenu, timestamp) VALUES (?, ?, ?, ?)')
            .run(sessionId, auteur, contenu, Date.now());
          // Demander l'interprétation à l'IA
          try {
            const interpretation = await demanderInterpretationCorrectif(sessionId, correctif);
            reponseMJ = interpretation;
          } catch (e) {
            reponseMJ = "Erreur lors de l'appel à l'IA pour la correction : " + e.message;
          }
        }
      } else {
        reponseMJ = "Commande inconnue. Tapez /help pour la liste des commandes.";
      }
      const infoMJ = db.prepare('INSERT INTO messages (sessionId, auteur, contenu, timestamp, destinataires) VALUES (?, ?, ?, ?, ?)')
        .run(sessionId, 'MJ', reponseMJ, Date.now(), destinatairesStr);
      const idMJ = infoMJ.lastInsertRowid;
      io.to(sessionId).emit('mjReply', { id: idMJ, auteur: 'MJ', contenu: reponseMJ });
      // Mise à jour automatique du résumé toutes les 5 interactions
      resumeCounters[sessionId] = (resumeCounters[sessionId] || 0) + 1;
      if (resumeCounters[sessionId] % 5 === 0) {
        updateSessionResume(sessionId).catch(e => console.error('Erreur MAJ résumé :', e));
      }
      return;
    }

    // 3. Les messages normaux (hors-jeu, discussion)
    // (déjà diffusés plus haut)
    // Mise à jour automatique du résumé toutes les 5 interactions
    resumeCounters[sessionId] = (resumeCounters[sessionId] || 0) + 1;
    if (resumeCounters[sessionId] % 5 === 0) {
      updateSessionResume(sessionId).catch(e => console.error('Erreur MAJ résumé :', e));
    }
  });

  // Correction de contexte
  socket.on('correctContext', async ({ sessionId, auteur, correctif }) => {
    if (!sessionId || !auteur || !correctif) return;
    db.prepare('INSERT INTO messages (sessionId, auteur, contenu, timestamp) VALUES (?, ?, ?, ?)')
      .run(sessionId, auteur, `/correctContext ${correctif}`, Date.now());
    try {
      const interpretation = await demanderInterpretationCorrectif(sessionId, correctif);
      socket.emit('interpretation', { interpretation, correctif });
    } catch (e) {
      socket.emit('error', { error: "Erreur Groq", details: e.message });
    }
      // Mise à jour automatique du résumé toutes les 5 interactions
  if (resumeCounters[sessionId] % 5 === 0) {
    updateSessionResume(sessionId).catch(e => console.error('Erreur MAJ résumé :', e));
  }
  resumeCounters[sessionId] = (resumeCounters[sessionId] || 0) + 1;
  });

  // Confirmation de correction
  socket.on('confirmCorrectContext', ({ sessionId, correctif }) => {
    if (!sessionId || !correctif) return;
    const session = db.prepare('SELECT resume FROM sessions WHERE sessionId = ?').get(sessionId);
    if (!session) {
      socket.emit('error', { error: 'Session non trouvée' });
      return;
    }
    const nouveauResume = session.resume ? session.resume + ' | Correction : ' + correctif : 'Correction : ' + correctif;
    db.prepare('UPDATE sessions SET resume = ? WHERE sessionId = ?').run(nouveauResume, sessionId);
    io.to(sessionId).emit('resumeUpdated', { sessionId, resume: nouveauResume });
  });

  // Mise à jour de la couleur du joueur
  socket.on('updateColor', ({ sessionId, pseudo, color }) => {
    if (!sessionId || !pseudo || !color) return;
    // Met à jour la couleur dans users
    const user = Object.values(users).find(u => u.pseudo === pseudo);
    if (user) user.color = color;
    // Met à jour la couleur dans la partie
    if (parties[sessionId]) {
      parties[sessionId].joueurs = parties[sessionId].joueurs.map(j =>
        j.pseudo === pseudo ? { ...j, color } : j
      );
      io.to(sessionId).emit('playersUpdate', { players: parties[sessionId].joueurs });
    }
  });

  socket.on('disconnect', () => {
    // Pour chaque partie, retirer ce joueur si présent
    Object.values(parties).forEach(partie => {
      if (Array.isArray(partie.joueurs)) {
        const before = partie.joueurs.length;
        partie.joueurs = partie.joueurs.filter(j => j.pseudo !== socket.pseudo);
        if (partie.joueurs.length !== before) {
          // Mise à jour pour tous les clients de la room
          io.to(partie.id).emit('playersUpdate', { players: partie.joueurs });
        }
      }
    });
    if (socket.sessionId && socket.pseudo) {
      // Retirer le joueur de la partie côté backend
      if (parties[socket.sessionId]) {
        parties[socket.sessionId].joueurs = parties[socket.sessionId].joueurs.filter(p => p !== socket.pseudo);
        // Diffuser la nouvelle liste à jour
        io.to(socket.sessionId).emit('playersUpdate', { players: parties[socket.sessionId].joueurs });
      }
      socket.to(socket.sessionId).emit('info', `${socket.pseudo} a quitté la partie.`);
    }
    console.log('Un utilisateur s\'est déconnecté');
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Serveur backend démarré sur le port ${PORT}`);
}); 