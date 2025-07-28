const Groq = require('groq-sdk');

class AIService {
  constructor() {
    try {
      this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      this.model = 'llama-3.3-70b-versatile';
      this.maxTokens = 600;
      this.isAvailable = true;
    } catch (error) {
      console.log('⚠️  Service AI non disponible (clé API manquante) - mode test activé');
      this.isAvailable = false;
    }
  }

  async generateResponse(messages) {
    if (!this.isAvailable) {
      return "Je suis en mode test. Les réponses AI ne sont pas disponibles sans clé API GROQ.";
    }
    
    try {
      const completion = await this.groq.chat.completions.create({
        messages: messages,
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: 0.7,
      });
      return completion.choices[0]?.message?.content || "Pas de réponse";
    } catch (error) {
      console.error('Erreur AI:', error);
      return "Erreur lors de la génération de la réponse AI.";
    }
  }

  async generateSessionIntro(promptSystem) {
    if (!this.isAvailable) {
      return "Bienvenue dans cette partie de test ! L'IA est en mode simulation.";
    }
    
    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: promptSystem
          },
          {
            role: "user",
            content: "Génère une introduction immersive pour cette session de jeu de rôle."
          }
        ],
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: 0.8,
      });
      return completion.choices[0]?.message?.content || "Introduction par défaut";
    } catch (error) {
      console.error('Erreur génération intro:', error);
      return "Bienvenue dans cette aventure !";
    }
  }

  async generateSessionResume(context) {
    if (!this.isAvailable) {
      return "Résumé de session en mode test.";
    }
    
    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Tu es un assistant qui résume les sessions de jeu de rôle de manière concise et claire."
          },
          {
            role: "user",
            content: `Résume cette session de jeu de rôle : ${context}`
          }
        ],
        model: this.model,
        max_tokens: 300,
        temperature: 0.5,
      });
      return completion.choices[0]?.message?.content || "Résumé par défaut";
    } catch (error) {
      console.error('Erreur génération résumé:', error);
      return "Résumé de session";
    }
  }

  async interpretContextCorrection(context, correctif) {
    if (!this.isAvailable) {
      return "Correction de contexte en mode test.";
    }
    
    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Tu es un assistant qui aide à corriger le contexte d'une session de jeu de rôle."
          },
          {
            role: "user",
            content: `Contexte actuel : ${context}\n\nCorrection demandée : ${correctif}\n\nInterprète cette correction et propose une version corrigée.`
          }
        ],
        model: this.model,
        max_tokens: 400,
        temperature: 0.6,
      });
      return completion.choices[0]?.message?.content || "Correction par défaut";
    } catch (error) {
      console.error('Erreur interprétation correction:', error);
      return "Correction de contexte";
    }
  }
}

module.exports = new AIService(); 