import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  rightHeader?: React.ReactNode;
  noPadding?: boolean;
  variant?: 'default' | 'cyber';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  title, 
  icon,
  rightHeader,
  noPadding = false,
  variant = 'default'
}) => {
  const isCyber = variant === 'cyber';

  return (
    <div className={`
      relative flex flex-col overflow-hidden transition-all duration-300
      bg-brand-panel/60 backdrop-blur-md border border-brand-border
      ${isCyber ? 'rounded-sm hover:border-brand-pink/50 hover:shadow-[0_0_20px_rgba(236,72,153,0.1)]' : 'rounded-xl'}
      ${className}
    `}>
      {/* Cyber Decorators */}
      {isCyber && (
        <>
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-brand-pink/50 rounded-tl-sm pointer-events-none z-20"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-brand-pink/50 rounded-tr-sm pointer-events-none z-20"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-brand-pink/50 rounded-bl-sm pointer-events-none z-20"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-brand-pink/50 rounded-br-sm pointer-events-none z-20"></div>
        </>
      )}

      {(title || rightHeader) && (
        <div className={`
          flex items-center justify-between px-4 py-3 shrink-0 z-10 relative
          border-b border-white/5 bg-black/20
        `}>
          <div className="flex items-center gap-2">
            {icon && <span className="text-brand-pink">{icon}</span>}
            {title && (
              <span className="text-zinc-400 text-[11px] font-mono uppercase tracking-[0.2em] font-bold flex items-center gap-2">
                {title}
                {isCyber && <span className="w-1.5 h-1.5 bg-brand-pink/50 rounded-full animate-pulse"></span>}
              </span>
            )}
          </div>
          {rightHeader && <div>{rightHeader}</div>}
        </div>
      )}
      
      <div className={`flex-1 flex flex-col min-h-0 relative ${noPadding ? '' : 'p-5'}`}>
        {children}
      </div>
    </div>
  );
};