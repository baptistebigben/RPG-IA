import React from 'react';
import PropTypes from 'prop-types';

const Icon = ({ 
  name, 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const icons = {
    // Navigation
    arrowLeft: '⟵',
    arrowRight: '⟶',
    home: '🏠',
    back: '⬅️',
    forward: '➡️',
    
    // Actions
    send: '🚀',
    upload: '📤',
    download: '📥',
    edit: '✏️',
    delete: '🗑️',
    save: '💾',
    cancel: '❌',
    confirm: '✅',
    
    // Communication
    message: '💬',
    chat: '💭',
    users: '👥',
    user: '👤',
    group: '👥',
    
    // Media
    image: '🖼️',
    camera: '📷',
    video: '🎥',
    audio: '🎵',
    file: '📄',
    
    // Gaming
    dice: '🎲',
    game: '🎮',
    sword: '⚔️',
    shield: '🛡️',
    magic: '✨',
    potion: '🧪',
    
    // Status
    online: '🟢',
    offline: '🔴',
    away: '🟡',
    busy: '🔴',
    loading: '⏳',
    
    // UI
    settings: '⚙️',
    help: '❓',
    info: 'ℹ️',
    warning: '⚠️',
    error: '🚨',
    success: '✅',
    close: '✖️',
    menu: '☰',
    search: '🔍',
    filter: '🔧',
    
    // RPG Specific
    character: '👤',
    inventory: '🎒',
    quest: '📜',
    map: '🗺️',
    tavern: '🍺',
    castle: '🏰',
    forest: '🌲',
    dungeon: '⚔️',
    treasure: '💎',
    monster: '👹',
    npc: '🧙',
    dm: '🎭'
  };

  const iconContent = icons[name] || name;
  const classes = [sizeClasses[size], className].filter(Boolean).join(' ');

  return (
    <span className={`inline-flex items-center justify-center ${classes}`} {...props}>
      {iconContent}
    </span>
  );
};

Icon.propTypes = {
  name: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  className: PropTypes.string
};

export default Icon; 