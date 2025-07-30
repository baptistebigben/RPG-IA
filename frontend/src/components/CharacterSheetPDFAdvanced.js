import React, { useState, useEffect, useRef } from 'react';

const CharacterSheetPDFAdvanced = ({ character, gameName, pseudo, onDataChange }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedFields, setSavedFields] = useState({});
  const [currentFields, setCurrentFields] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [detectedFields, setDetectedFields] = useState([]);
  const [saveMessage, setSaveMessage] = useState('');
  const iframeRef = useRef(null);

  // Charger les données sauvegardées au montage du composant
  useEffect(() => {
    if (character && gameName === 'Donjons & Dragons 5') {
      loadSavedCharacterSheet();
    }
  }, [character, gameName]);

  // Écouter les changements de champs et notifier le parent
  useEffect(() => {
    if (onDataChange && Object.keys(currentFields).length > 0) {
      const characterData = {
        characterId: character?.id,
        characterName: character?.name,
        gameName: gameName,
        userId: pseudo,
        pdfFields: currentFields,
        lastUpdated: new Date().toISOString(),
        structuredData: extractStructuredData(currentFields)
      };
      onDataChange(characterData);
    }
  }, [currentFields, character, gameName, pseudo, onDataChange]);

  // Extraire des données structurées pour le MJ IA
  const extractStructuredData = (fields) => {
    return {
      stats: {
        strength: parseInt(fields['Strength'] || fields['Force'] || '0'),
        dexterity: parseInt(fields['Dexterity'] || fields['Dextérité'] || '0'),
        constitution: parseInt(fields['Constitution'] || '0'),
        intelligence: parseInt(fields['Intelligence'] || fields['Intelligence'] || '0'),
        wisdom: parseInt(fields['Wisdom'] || fields['Sagesse'] || '0'),
        charisma: parseInt(fields['Charisma'] || fields['Charisme'] || '0')
      },
      combat: {
        armorClass: parseInt(fields['ArmorClass'] || fields['Classe d\'armure'] || '0'),
        hitPoints: parseInt(fields['HitPoints'] || fields['Points de vie'] || '0'),
        initiative: parseInt(fields['Initiative'] || '0'),
        speed: parseInt(fields['Speed'] || fields['Vitesse'] || '0')
      },
             character: {
         name: fields['CharacterName 2'] || fields['Nom du personnage'] || character?.characterName || '',
        class: fields['ClassLevel'] || fields['Classe et niveau'] || '',
        race: fields['Race'] || fields['Race'] || '',
        background: fields['Background'] || fields['Historique'] || '',
        alignment: fields['Alignment'] || fields['Alignement'] || '',
        level: parseInt(fields['Level'] || fields['Niveau'] || '1'),
        experience: parseInt(fields['ExperiencePoints'] || fields['Points d\'expérience'] || '0')
      },
      abilities: {
        features: fields['Features'] || fields['Aptitudes'] || '',
        proficiencies: fields['Proficiencies'] || fields['Maîtrises'] || '',
        languages: fields['Languages'] || fields['Langues'] || ''
      },
      equipment: {
        items: fields['Equipment'] || fields['Équipement'] || '',
        weapons: fields['Weapons'] || fields['Armes'] || '',
        armor: fields['Armor'] || fields['Armure'] || ''
      }
    };
  };

  const loadAndFillPDF = async (savedData = null) => {
    setLoading(true);
    setError(null);
    
    // Utiliser les données passées en paramètre ou savedFields
    const fieldsToUse = savedData || savedFields;
    
    try {
      // Charger le PDF depuis le backend
      const response = await fetch('/uploads/feuillepersonnagednd5.pdf');
      if (!response.ok) {
        throw new Error('Impossible de charger le PDF');
      }
      
      const pdfBytes = await response.arrayBuffer();
      
      // Charger le PDF avec pdf-lib pour le remplissage
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Détecter les champs du formulaire
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
             // Créer une liste des champs détectés
       const fieldList = fields.map(field => {
         let value = '';
         try {
           // Gérer les différents types de champs PDF
           if (field.getText) {
             value = field.getText() || '';
           } else if (field.getValue) {
             value = field.getValue() || '';
           } else if (field.getOptions) {
             // Pour les champs de sélection
             const options = field.getOptions();
             value = options.length > 0 ? options[0] : '';
           } else {
             value = '';
           }
         } catch (error) {
           console.log(`⚠️ Erreur lecture champ ${field.getName()}:`, error);
           value = '';
         }
         
         return {
           name: field.getName(),
           type: field.constructor.name,
           value: value
         };
       });
      
      setDetectedFields(fieldList);
      console.log('📋 Champs détectés:', fieldList.map(f => f.name));
      
             // Remplir le PDF avec les données sauvegardées
       await fillPDFWithSavedData(pdfDoc, fieldsToUse);
      
      // Remplir le champ nom du personnage
      try {
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
        
                 if (nameField) {
           let currentValue = '';
           try {
             if (nameField.getText) {
               currentValue = nameField.getText() || '';
             } else if (nameField.getValue) {
               currentValue = nameField.getValue() || '';
             }
           } catch (error) {
             console.log('⚠️ Erreur lecture valeur champ nom:', error);
           }
           
                        if (!currentValue.trim()) {
               try {
                 if (nameField.setText) {
                   nameField.setText(character.characterName);
                 } else if (nameField.setValue) {
                   nameField.setValue(character.characterName);
                 }
                 console.log(`✅ ${nameField.getName()}: "${character.characterName}"`);
               } catch (error) {
                 console.log('❌ Erreur écriture champ nom:', error);
               }
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
      
             // Initialiser les champs actuels
       initializeCurrentFields(fieldList, fieldsToUse);
      
    } catch (err) {
      console.error('Erreur lors du chargement du PDF:', err);
      setError('Erreur lors du chargement de la fiche de personnage');
    } finally {
      setLoading(false);
    }
  };

  const initializeCurrentFields = (fieldList, savedData = null) => {
    // Utiliser les données passées en paramètre ou savedFields
    const fieldsToUse = savedData || savedFields;
    
    // Commencer avec les données sauvegardées en base
    const initialFields = { ...fieldsToUse };
    
    console.log('📋 Initialisation des champs avec:', {
      savedFieldsCount: Object.keys(fieldsToUse).length,
      fieldListCount: fieldList.length,
      savedFields: fieldsToUse
    });
    
    // Initialiser avec les valeurs des champs détectés dans le PDF
    fieldList.forEach(field => {
      if (field.value && field.value.trim() !== '') {
        // Ne pas écraser les données sauvegardées
        if (!initialFields[field.name]) {
          initialFields[field.name] = field.value;
        }
      }
    });
    
         // Forcer le nom du personnage seulement si pas déjà défini
     if (character?.characterName && !initialFields['CharacterName 2']) {
       initialFields['CharacterName 2'] = character.characterName;
     }
    
    console.log('📋 Champs finaux:', initialFields);
    setCurrentFields(initialFields);
  };

  const loadSavedCharacterSheet = async () => {
    try {
      console.log('💾 Chargement des données sauvegardées...');
      const response = await fetch(`/character-sheets/load/${pseudo}/${encodeURIComponent(gameName)}/${character.id}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log('💾 Données trouvées en base:', result.data.pdfFields);
          console.log('💾 Mise à jour de savedFields avec les données de la base');
          setSavedFields(result.data.pdfFields);
          // Passer les données directement à loadAndFillPDF
          loadAndFillPDF(result.data.pdfFields);
        } else {
          console.log('💾 Aucune fiche trouvée en base');
          loadAndFillPDF();
        }
      } else {
        console.log('💾 Erreur lors du chargement');
        loadAndFillPDF();
      }
    } catch (error) {
      console.log('💾 Aucune fiche sauvegardée:', error);
      loadAndFillPDF();
    }
  };

  const saveCharacterSheet = async () => {
    if (!character || !gameName) return;

    setSaving(true);
    try {
      // Log des données à sauvegarder
             const saveData = {
         userId: pseudo,
         gameName: gameName,
         characterName: character.characterName,
         characterId: character.id,
         pdfFields: currentFields
       };
      
      console.log('💾 Données à sauvegarder:', saveData);
      console.log('💾 Nombre de champs:', Object.keys(currentFields).length);
      
      // Sauvegarder les champs actuels
      const saveResponse = await fetch('/character-sheets/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData)
      });

      console.log('💾 Réponse du serveur:', saveResponse.status, saveResponse.statusText);

      if (saveResponse.ok) {
        const result = await saveResponse.json();
        console.log('💾 Résultat de la sauvegarde:', result);
        
                          if (result.success) {
           // Mettre à jour savedFields avec les données actuelles
           setSavedFields(currentFields);
           setHasUnsavedChanges(false);
           setSaveMessage('✅ Fiche sauvegardée !');
           console.log('💾 Sauvegarde réussie');
           
           // Faire disparaître le message après 3 secondes
           setTimeout(() => {
             setSaveMessage('');
           }, 3000);
           
           // Recharger les données depuis la base pour s'assurer de la synchronisation
           setTimeout(() => {
             console.log('💾 Rechargement après sauvegarde...');
             loadSavedCharacterSheet();
           }, 100);
        } else {
          console.error('💾 Erreur de sauvegarde:', result.error);
          alert('Erreur lors de la sauvegarde: ' + result.error);
        }
      } else {
        const errorText = await saveResponse.text();
        console.error('💾 Erreur HTTP:', saveResponse.status, errorText);
        alert(`Erreur lors de la sauvegarde (${saveResponse.status}): ${errorText}`);
      }
    } catch (error) {
      console.error('💾 Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

    const fillPDFWithSavedData = async (pdfDoc, savedData = null) => {
    try {
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      // Utiliser les données passées en paramètre ou savedFields
      const fieldsToUse = savedData || savedFields;
      
      console.log('📋 Remplissage du PDF avec:', fieldsToUse);
      
      let filledCount = 0;
      
      Object.keys(fieldsToUse).forEach(fieldName => {
        const field = fields.find(f => f.getName() === fieldName);
        if (field && fieldsToUse[fieldName] && fieldsToUse[fieldName].trim() !== '') {
           try {
             // Gérer les différents types de champs PDF
                           if (field.setText) {
                field.setText(fieldsToUse[fieldName]);
              } else if (field.setValue) {
                field.setValue(fieldsToUse[fieldName]);
              } else {
                console.log(`⚠️ Type de champ non supporté: ${fieldName}`);
                return;
              }
              console.log(`✅ ${fieldName}: "${fieldsToUse[fieldName]}"`);
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

  const downloadPDF = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
             link.download = `fiche_${character.characterName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFieldChange = (fieldName, value) => {
    setCurrentFields(prev => ({
      ...prev,
      [fieldName]: value
    }));
    setHasUnsavedChanges(true);
  };

  // Interface d'édition des champs (approche PDFQuery-like)
  const renderFieldEditor = () => (
    <div className="pdf-field-editor" style={{
      background: 'var(--color-bg-secondary)',
      padding: 'var(--spacing-md)',
      borderRadius: 'var(--border-radius-md)',
      marginBottom: 'var(--spacing-md)',
      maxHeight: '300px',
      overflowY: 'auto'
    }}>
      <h4 style={{ color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-sm)' }}>
        📝 Édition des champs PDF
      </h4>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
         {detectedFields.map(field => (
           <div key={field.name}>
             <label style={{ 
               color: 'var(--color-text-secondary)', 
               fontSize: 'var(--font-size-sm)',
               display: 'block',
               marginBottom: '4px'
             }}>
               {field.name} <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8em' }}>({field.type})</span>:
             </label>
             <input
               type={field.type.includes('CheckBox') ? 'checkbox' : 'text'}
               value={currentFields[field.name] || ''}
               checked={field.type.includes('CheckBox') ? (currentFields[field.name] === 'true' || currentFields[field.name] === true) : undefined}
               onChange={(e) => {
                 if (field.type.includes('CheckBox')) {
                   handleFieldChange(field.name, e.target.checked.toString());
                 } else {
                   handleFieldChange(field.name, e.target.value);
                 }
               }}
               style={{
                 width: '100%',
                 padding: 'var(--spacing-xs)',
                 borderRadius: 'var(--border-radius-sm)',
                 border: '1px solid var(--color-border)',
                 background: 'var(--color-bg-primary)',
                 color: 'var(--color-text-primary)',
                 fontSize: 'var(--font-size-sm)'
               }}
               placeholder={field.value || 'Vide'}
             />
           </div>
         ))}
       </div>
    </div>
  );

  if (!character || gameName !== 'Donjons & Dragons 5') {
    return (
      <div className="character-sheet-placeholder">
        <div className="placeholder-icon">📋</div>
                 <div className="placeholder-text">
           Fiche de personnage pour <strong>{character?.characterName}</strong>
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
                 {hasUnsavedChanges && (
           <span style={{ 
             color: 'var(--color-warning)', 
             fontSize: 'var(--font-size-sm)',
             marginLeft: 'var(--spacing-sm)'
           }}>
             ⚠️ Modifications non sauvegardées
           </span>
         )}
         {saveMessage && (
           <span style={{ 
             color: 'var(--color-success)', 
             fontSize: 'var(--font-size-sm)',
             marginLeft: 'var(--spacing-sm)',
             animation: 'fadeIn 0.3s ease-in'
           }}>
             {saveMessage}
           </span>
         )}
      </div>
      
      {renderFieldEditor()}
      
      {pdfUrl && (
        <div className="pdf-viewer">
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            title={`Fiche de personnage - ${character.characterName}`}
            width="100%"
            height="600px"
            style={{ border: 'none', borderRadius: 'var(--border-radius-md)' }}
          />
        </div>
      )}
    </div>
  );
};

export default CharacterSheetPDFAdvanced; 