import React, { useState } from 'react';

const ImageGenerator = ({ onClose, onImageGenerated }) => {
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleGenerateImage = async () => {
    setImageLoading(true);
    setImageUrl('');
    setImageError('');
    setImageLoaded(false);
    
    try {
      const randomNoise = Math.random().toString(36).substring(2, 8);
      const prompt = encodeURIComponent(imagePrompt + ' ' + randomNoise);
      const url = `https://image.pollinations.ai/prompt/${prompt}`;
      
      // Télécharge le blob de l'image générée
      const imgResp = await fetch(url);
      if (!imgResp.ok) throw new Error('Erreur lors du téléchargement de l\'image générée');
      const blob = await imgResp.blob();
      
      // Upload sur le backend
      const formData = new FormData();
      formData.append('image', blob, 'generee.png');
      const uploadResp = await fetch('/upload', { method: 'POST', body: formData });
      const { url: uploadedUrl } = await uploadResp.json();
      setImageUrl(uploadedUrl);
    } catch (e) {
      setImageUrl('');
      setImageError("Erreur lors de la génération de l'image : " + e.message);
    }
    setImageLoading(false);
  };

  const handleAddToChat = () => {
    if (imageUrl) {
      onImageGenerated(imageUrl);
    }
  };

  return (
    <div style={{
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      background: '#000a', 
      zIndex: 2000,
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center'
    }}>
      <div style={{ 
        background: '#232946', 
        borderRadius: 16, 
        padding: 32, 
        minWidth: 340, 
        boxShadow: '0 4px 32px #000a', 
        color: '#fff', 
        position: 'relative' 
      }}>
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: 8, 
            right: 12, 
            background: 'none', 
            border: 'none', 
            color: '#fff', 
            fontSize: 22, 
            cursor: 'pointer' 
          }}
        >
          ×
        </button>
        
        <h3 style={{marginTop:0}}>Générer une image</h3>
        
        <input 
          value={imagePrompt} 
          onChange={e => setImagePrompt(e.target.value)} 
          placeholder="Décris l'image à générer..." 
          style={{
            width:'100%',
            padding:8,
            borderRadius:6,
            border:'1px solid #bfa76f',
            marginBottom:12,
            fontSize:16
          }} 
        />
        
        <button 
          onClick={handleGenerateImage} 
          style={{
            marginBottom:16,
            width:'100%',
            background: 'linear-gradient(90deg, #3d2c5a 0%, #bfa76f 100%)',
            color: '#fff',
            fontWeight: 'bold',
            borderRadius: 8,
            fontSize: 16,
            padding: '8px 0'
          }}
        >
          Générer
        </button>
        
        {imageLoading && !imageLoaded && (
          <div style={{color:'#bfa76f', margin:'12px 0'}}>Génération en cours...</div>
        )}
        
        {imageError && (
          <div style={{color:'#ff6b6b', margin:'12px 0', fontWeight:'bold'}}>{imageError}</div>
        )}
        
        {imageUrl && (
          <img
            src={imageUrl}
            alt="générée"
            style={{
              maxWidth:400,
              maxHeight:300,
              borderRadius:10,
              marginTop:8,
              display: imageLoaded ? 'block' : 'none'
            }}
            onLoad={() => { 
              setImageLoaded(true); 
              setImageLoading(false); 
            }}
          />
        )}
        
        {imageUrl && (
          <button 
            onClick={handleAddToChat} 
            style={{
              marginTop:12,
              width:'100%',
              background: 'linear-gradient(90deg, #3d2c5a 0%, #bfa76f 100%)',
              color: '#fff',
              fontWeight: 'bold',
              borderRadius: 8,
              fontSize: 16,
              padding: '8px 0'
            }}
          >
            Ajouter au chat
          </button>
        )}
      </div>
    </div>
  );
};

export default ImageGenerator; 