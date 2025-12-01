import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'cyber';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '',
  disabled,
  ...props 
}) => {
  const baseStyles = "relative font-mono font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-1 focus:ring-brand-pink/50";
  
  const variants = {
    primary: "bg-brand-pink text-white hover:bg-brand-pinkHover shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] border border-transparent rounded-lg",
    secondary: "bg-brand-panel border border-brand-border text-zinc-300 hover:border-brand-pink/50 hover:text-white rounded-lg hover:shadow-[0_0_10px_rgba(236,72,153,0.1)]",
    ghost: "bg-transparent text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg",
    cyber: "bg-zinc-900 border border-brand-pink/50 text-brand-pink hover:bg-brand-pink hover:text-white rounded-none shadow-[0_0_10px_rgba(236,72,153,0.15)] hover:shadow-[0_0_20px_rgba(236,72,153,0.4)]"
  };

  const widthClass = fullWidth ? 'w-full py-4 text-lg' : 'px-4 py-2 text-xs';

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};