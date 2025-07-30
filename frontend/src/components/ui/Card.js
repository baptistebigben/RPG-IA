import React from 'react';
import PropTypes from 'prop-types';

const Card = ({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'default',
  hover = true,
  ...props 
}) => {
  const baseClasses = 'card transition';
  
  const variantClasses = {
    default: '',
    elevated: 'card-elevated',
    outlined: 'border-2 border-secondary'
  };
  
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-2',
    default: 'p-4',
    lg: 'p-5'
  };
  
  const hoverClasses = hover ? 'hover:shadow-lg hover:-translate-y-1' : '';
  
  const classes = [
    baseClasses,
    variantClasses[variant],
    paddingClasses[padding],
    hoverClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'elevated', 'outlined']),
  padding: PropTypes.oneOf(['none', 'sm', 'default', 'lg']),
  hover: PropTypes.bool
};

export default Card; 