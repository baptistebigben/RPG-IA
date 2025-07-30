import React from 'react';
import PropTypes from 'prop-types';

const Input = ({ 
  type = 'text',
  placeholder,
  value,
  onChange,
  onFocus,
  onBlur,
  className = '',
  disabled = false,
  error = false,
  success = false,
  icon,
  iconPosition = 'left',
  size = 'md',
  ...props 
}) => {
  const baseClasses = 'input transition';
  
  const sizeClasses = {
    sm: 'text-sm py-1 px-2',
    md: 'text-base py-2 px-3',
    lg: 'text-lg py-3 px-4'
  };
  
  const stateClasses = {
    error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
    success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
    default: 'border-secondary focus:border-primary focus:ring-primary'
  };
  
  const state = error ? 'error' : success ? 'success' : 'default';
  
  const classes = [
    baseClasses,
    sizeClasses[size],
    stateClasses[state],
    disabled ? 'opacity-60 cursor-not-allowed' : '',
    className
  ].filter(Boolean).join(' ');

  const inputElement = (
    <input
      type={type}
      className={classes}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={disabled}
      {...props}
    />
  );

  if (!icon) {
    return inputElement;
  }

  const iconElement = (
    <span className="absolute inset-y-0 flex items-center pointer-events-none">
      <span className="text-muted">
        {icon}
      </span>
    </span>
  );

  return (
    <div className="relative">
      {iconPosition === 'left' && iconElement}
      {inputElement}
      {iconPosition === 'right' && iconElement}
    </div>
  );
};

Input.propTypes = {
  type: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  success: PropTypes.bool,
  icon: PropTypes.node,
  iconPosition: PropTypes.oneOf(['left', 'right']),
  size: PropTypes.oneOf(['sm', 'md', 'lg'])
};

export default Input; 