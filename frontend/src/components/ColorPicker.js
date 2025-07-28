import React, { useState } from 'react';

const ColorPicker = ({ currentColor, onColorChange }) => {
  const [showColorModal, setShowColorModal] = useState(false);
  const [tempColor, setTempColor] = useState(currentColor);

  const handleColorChange = (e) => {
    setTempColor(e.target.value);
  };

  const handleColorOk = () => {
    onColorChange(tempColor);
    setShowColorModal(false);
  };

  const handleColorCancel = () => {
    setTempColor(currentColor);
    setShowColorModal(false);
  };

  const openColorModal = () => {
    setTempColor(currentColor);
    setShowColorModal(true);
  };

  return (
    <div style={{marginBottom:18, width:'100%', fontSize: '0.97em'}}>
      <b style={{fontSize:'1em'}}>Couleur du pseudo :</b>
      <div className="pseudo-color-palette" style={{marginTop:6}}>
        <div
          className="pseudo-color-dot selected"
          style={{ background: currentColor, cursor: 'pointer' }}
          title={currentColor}
          onClick={openColorModal}
        />
        {showColorModal && (
          <div style={{
            position: 'absolute',
            background: '#232946',
            border: '2px solid #bfa76f',
            borderRadius: 10,
            padding: 16,
            zIndex: 1000,
            marginTop: 8
          }}>
            <label style={{ color: '#fff', marginRight: 8 }}>Choisis ta couleur :</label>
            <input 
              type="color" 
              value={tempColor} 
              onChange={handleColorChange} 
              style={{ width: 40, height: 40, border: 'none', background: 'none' }} 
            />
            <button onClick={handleColorOk} style={{ marginLeft: 12 }}>OK</button>
            <button onClick={handleColorCancel} style={{ marginLeft: 8 }}>Fermer</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorPicker; 