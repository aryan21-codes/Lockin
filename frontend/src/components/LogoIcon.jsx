import React from 'react';
import logoIcon from '../assets/logo-icon.png';

const LogoIcon = ({ className = "w-[18px] h-[18px]" }) => (
  <img 
    src={logoIcon} 
    alt="Lockin Logo" 
    className={`${className} object-contain`} 
  />
);

export default LogoIcon;
