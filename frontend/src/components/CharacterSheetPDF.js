import React, { useState, useEffect, useRef } from 'react';
import { PDFDocument, PDFForm } from 'pdf-lib';

const CharacterSheetPDF = ({ character, gameName, pseudo }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedFields, setSavedFields] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const canvasRef = useRef(null);

  // Charger les données sauvegardées au montage du composant
  useEffect(() => {
    if (character && gameName === 'Donjons & Dragons 5') {
      loadSavedCharacterSheet();
    }
  }, [character, gameName]);



  const loadAndFillPDF = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Charger le PDF depuis le backend
      const response = await fetch('/uploads/feuillepersonnagednd5.pdf');
      if (!response.ok) {
        throw new Error('Impossible de charger le PDF');
      }
      
      const pdfBytes = await response.arrayBuffer();
      
      // Charger le PDF avec pdf-lib
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
             // Remplir le PDF avec les données sauvegardées
       await fillPDFWithSavedData(pdfDoc);
       
               // Remplir le champ "NOM DU PERSONNAGE" si on peut le trouver et qu'il n'est pas déjà rempli
        try {
          const form = pdfDoc.getForm();
          const fields = form.getFields();
          
          // Chercher le champ du nom du personnage
          let nameField = fields.find(field => 
            field.getName().toLowerCase().includes('character') && 
            field.getName().toLowerCase().includes('name')
          );
          
          if (!nameField) {
            nameField = fields.find(field => 
              field.getName().toLowerCase().includes('nom') && 
              field.getName().toLowerCase().includes('personnage')
            );
          }
          
          if (!nameField) {
            nameField = fields.find(field => 
              field.getName().toLowerCase().includes('nom') || 
              field.getName().toLowerCase().includes('name')
            );
          }
          
          // Si on trouve un champ et qu'il n'est pas déjà rempli, le remplir avec le nom du personnage
          if (nameField) {
            const currentValue = nameField.getText() || '';
            if (!currentValue.trim()) {
              console.log(`✅ ${nameField.getName()}: "${character.name}"`);
              nameField.setText(character.name);
            }
          }
        } catch (formError) {
          console.log('❌ Erreur champ nom:', formError);
        }
      
      // Convertir le PDF modifié en bytes
      const modifiedPdfBytes = await pdfDoc.save();
      
      // Créer une URL pour afficher le PDF
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setPdfUrl(url);
    } catch (err) {
      console.error('Erreur lors du chargement du PDF:', err);
      setError('Erreur lors du chargement de la fiche de personnage');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `fiche_${character.name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Charger les données sauvegardées depuis la base de données
  const loadSavedCharacterSheet = async () => {
    try {
      const response = await fetch(`/character-sheets/load/${pseudo}/${encodeURIComponent(gameName)}/${character.id}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setSavedFields(result.data.pdfFields);
          console.log('💾 Données chargées');
          // Charger le PDF avec les données sauvegardées
          loadAndFillPDF();
        } else {
          // Si pas de données sauvegardées, charger le PDF vide
          loadAndFillPDF();
        }
      } else {
        // Si pas de données sauvegardées, charger le PDF vide
        loadAndFillPDF();
      }
    } catch (error) {
      console.log('💾 Aucune fiche sauvegardée');
      // En cas d'erreur, charger le PDF vide
      loadAndFillPDF();
    }
  };

  // Sauvegarder les champs du PDF
  const saveCharacterSheet = async () => {
    if (!character || !gameName) return;

    setSaving(true);
    try {
      // Récupérer le PDF actuel avec les modifications
      const response = await fetch('/uploads/feuillepersonnagednd5.pdf');
      if (!response.ok) throw new Error('Impossible de charger le PDF');
      
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Remplir d'abord avec les données sauvegardées existantes
      await fillPDFWithSavedData(pdfDoc);
      
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      // Créer un objet avec tous les champs et leurs valeurs actuelles
      const pdfFields = {};
      fields.forEach(field => {
        try {
          const fieldValue = field.getText() || '';
          pdfFields[field.getName()] = fieldValue;
        } catch (error) {
          pdfFields[field.getName()] = '';
        }
      });

      // Ajouter le nom du personnage dans le bon champ
      const nameField = fields.find(field => 
        field.getName().toLowerCase().includes('character') && 
        field.getName().toLowerCase().includes('name')
      );
      
      if (nameField) {
        pdfFields[nameField.getName()] = character.name;
      }

      // Afficher les champs qui ont des valeurs
      const filledFields = Object.keys(pdfFields).filter(key => 
        pdfFields[key] && pdfFields[key].trim() !== ''
      );
      
      if (filledFields.length > 0) {
        console.log('💾 Champs remplis:');
        filledFields.forEach(fieldName => {
          console.log(`  ${fieldName}: "${pdfFields[fieldName]}"`);
        });
      } else {
        console.log('💾 Aucun champ rempli');
      }

      // Sauvegarder en base de données
      const saveResponse = await fetch('/character-sheets/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: pseudo,
          gameName: gameName,
          characterName: character.name,
          characterId: character.id,
          pdfFields: pdfFields
        })
      });

      if (saveResponse.ok) {
        const result = await saveResponse.json();
        if (result.success) {
          setSavedFields(pdfFields);
          setHasUnsavedChanges(false);
          alert('Fiche sauvegardée avec succès !');
          console.log('💾 Sauvegarde réussie');
          
          // Recharger le PDF avec les nouvelles données
          loadAndFillPDF();
        } else {
          alert('Erreur lors de la sauvegarde: ' + result.error);
        }
      } else {
        alert('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Remplir le PDF avec les données sauvegardées
  const fillPDFWithSavedData = async (pdfDoc) => {
    try {
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      console.log('📋 Remplissage du PDF...');
      
      let filledCount = 0;
      
      // Remplir avec les données sauvegardées
      Object.keys(savedFields).forEach(fieldName => {
        const field = fields.find(f => f.getName() === fieldName);
        if (field && savedFields[fieldName] && savedFields[fieldName].trim() !== '') {
          try {
            field.setText(savedFields[fieldName]);
            console.log(`✅ ${fieldName}: "${savedFields[fieldName]}"`);
            filledCount++;
          } catch (error) {
            console.log(`❌ Erreur ${fieldName}:`, error);
          }
        }
      });
      
      if (filledCount > 0) {
        console.log(`📋 ${filledCount} champs remplis`);
      } else {
        console.log('📋 Aucun champ à remplir');
      }
    } catch (error) {
      console.log('❌ Erreur de remplissage:', error);
    }
  };

  if (!character || gameName !== 'Donjons & Dragons 5') {
    return (
      <div className="character-sheet-placeholder">
        <div className="placeholder-icon">📋</div>
        <div className="placeholder-text">
          Fiche de personnage pour <strong>{character?.name}</strong>
          <br />
          <br />
          {gameName !== 'Donjons & Dragons 5' 
            ? `Les fiches PDF ne sont pas encore disponibles pour ${gameName}`
            : 'Sélectionnez un personnage pour afficher sa fiche'
          }
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="character-sheet-placeholder">
        <div className="placeholder-icon">⏳</div>
        <div className="placeholder-text">
          Chargement de la fiche de personnage...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="character-sheet-placeholder">
        <div className="placeholder-icon">❌</div>
        <div className="placeholder-text">
          {error}
          <br />
          <button 
            onClick={loadAndFillPDF}
            className="btn-discord outline"
            style={{ marginTop: '1rem' }}
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="character-sheet-pdf-container">
      <div className="pdf-controls">
        <button 
          onClick={saveCharacterSheet}
          disabled={saving}
          className={`btn-discord success ${saving ? 'disabled' : ''}`}
        >
          {saving ? '💾 Sauvegarde...' : '💾 Sauvegarder'}
        </button>
        <button 
          onClick={downloadPDF}
          className="btn-discord outline"
        >
          📥 Télécharger
        </button>
      </div>
      
      {pdfUrl && (
        <div className="pdf-viewer">
          <iframe
            src={pdfUrl}
            title={`Fiche de personnage - ${character.name}`}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
          />
        </div>
      )}
    </div>
  );
};

export default CharacterSheetPDF; 