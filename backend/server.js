require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// Import des modules refactorisés
const dbManager = require('./config/database');
const SocketHandler = require('./websocket/socketHandler');

// Import des routes
const authRoutes = require('./routes/auth');
const partiesRoutes = require('./routes/parties');
const sessionsRoutes = require('./routes/sessions');
const characterSheetsRoutes = require('./routes/characterSheets');
const characterRoutes = require('./routes/characters');
const gameMasterRoutes = require('./routes/gameMaster');

// Import du middleware
const upload = require('./middleware/upload');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Rendre io accessible globalement pour les routes
global.io = io;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/', authRoutes);
app.use('/parties', partiesRoutes);
app.use('/sessions', sessionsRoutes);
app.use('/character-sheets', characterSheetsRoutes);
app.use('/characters', characterRoutes);
app.use('/api/game-master', gameMasterRoutes);

// Route de base
app.get('/', (req, res) => {
  res.send('Backend RPG Chat IA opérationnel !');
});

// Upload d'images
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier reçu' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// Servir les fichiers uploadés
app.use('/uploads', express.static('uploads'));

// Initialiser le gestionnaire WebSocket
new SocketHandler(io);

// Gestion des erreurs
app.use((error, req, res, next) => {
  console.error('Erreur serveur:', error);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// Gestion de la fermeture propre
process.on('SIGINT', () => {
  console.log('Fermeture du serveur...');
  dbManager.close();
  server.close(() => {
    console.log('Serveur fermé.');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Serveur backend démarré sur le port ${PORT}`);
}); 