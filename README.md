# RPG Chat IA - Application Refactorisée

Application de chat pour jeux de rôle avec IA, refactorisée avec une architecture modulaire et cohérente.

## 🏗️ Architecture

### Backend (Node.js/Express)

```
backend/
├── config/           # Configuration
│   ├── database.js   # Gestion de la base de données SQLite
│   └── ai.js         # Service d'IA Groq
├── models/           # Modèles de données
│   └── Session.js    # Gestion des sessions et messages
├── services/         # Logique métier
│   ├── GameService.js    # Gestion des parties
│   └── MessageService.js # Gestion des messages et commandes
├── routes/           # Routes API
│   ├── auth.js       # Authentification
│   ├── parties.js    # Gestion des parties
│   └── sessions.js   # Gestion des sessions
├── middleware/       # Middleware
│   └── upload.js     # Gestion des uploads d'images
├── websocket/        # Gestion WebSocket
│   └── socketHandler.js # Gestionnaire des événements temps réel
└── server.js         # Point d'entrée principal
```

### Frontend (React)

```
frontend/src/
├── components/       # Composants réutilisables
│   ├── LoginForm.js      # Formulaire de connexion
│   ├── ServerList.js     # Liste des serveurs/parties
│   ├── ChatRoom.js       # Salle de chat
│   ├── ImageGenerator.js # Générateur d'images
│   ├── ColorPicker.js    # Sélecteur de couleur
│   └── HelpModal.js      # Modale d'aide
├── hooks/            # Hooks personnalisés
│   └── useSocket.js  # Gestion WebSocket
├── services/         # Services API
│   └── api.js        # Centralisation des appels API
└── App.js            # Composant principal
```

## 🚀 Installation et démarrage

### Prérequis
- Node.js (v14+)
- npm ou yarn

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## 🔧 Configuration

### Variables d'environnement (backend/.env)
```
GROQ_API_KEY=votre_clé_api_groq
PORT=4000
```

## 📋 Fonctionnalités

### Authentification
- Connexion par pseudo
- Gestion des sessions
- Couleurs personnalisables

### Gestion des parties
- Création de parties
- Rejoindre des parties existantes
- Renommage et suppression (admin)
- Support de différents systèmes de JDR

### Chat en temps réel
- Messages publics et privés
- Support des images (upload + génération IA)
- Commandes spéciales (/roll, /start, /help, etc.)
- Correction de contexte

### IA intégrée
- MJ virtuel via Groq
- Génération d'images
- Résumés automatiques
- Correction de contexte

## 🎮 Commandes disponibles

- `/start` - Lance l'aventure
- `/help` - Affiche l'aide
- `/resume` - Demande un résumé
- `/roll 2d6+1` - Lance des dés
- `/message ...` - Message privé au MJ
- `/correctContext ...` - Correction de contexte
- `/correctStory ...` - Correction de l'histoire

## 🔄 Améliorations apportées

### Backend
- **Architecture modulaire** : Séparation claire des responsabilités
- **Services dédiés** : GameService, MessageService, AIService
- **Gestion d'erreurs** : Meilleure gestion des erreurs et validation
- **Base de données** : Modèle Session centralisé
- **WebSocket** : Gestionnaire dédié pour les événements temps réel

### Frontend
- **Composants réutilisables** : Architecture modulaire React
- **Hooks personnalisés** : useSocket pour la gestion WebSocket
- **Service API centralisé** : Tous les appels API dans un seul service
- **Gestion d'état** : État local optimisé avec useCallback
- **Interface utilisateur** : Composants spécialisés (ColorPicker, ImageGenerator, etc.)

### Général
- **Cohérence** : Structure uniforme et prévisible
- **Maintenabilité** : Code plus facile à maintenir et étendre
- **Performance** : Optimisations React et gestion mémoire
- **Sécurité** : Validation des données et gestion des erreurs

## 🛠️ Technologies utilisées

- **Backend** : Node.js, Express, Socket.IO, SQLite, Groq AI
- **Frontend** : React, Socket.IO Client, React Markdown
- **Base de données** : SQLite avec better-sqlite3
- **IA** : Groq API (llama-3.3-70b-versatile)
- **Images** : Pollinations AI pour la génération

## 📝 Notes de développement

Cette refactorisation améliore significativement la maintenabilité et l'extensibilité du code tout en conservant toutes les fonctionnalités existantes. L'architecture modulaire facilite l'ajout de nouvelles fonctionnalités et la correction de bugs. 