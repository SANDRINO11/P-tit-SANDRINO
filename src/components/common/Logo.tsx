import React from 'react';

interface LogoProps {
  className?: string;
  withText?: boolean;
}

export const Logo = ({ className = '', withText = true }: LogoProps) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative w-10 h-10 overflow-hidden rounded-full border border-brand-grey bg-brand-white shrink-0">
        <img 
          src="/assets/aistudio/7527df5d-9817-4723-b4ec-ea33f715b3ce_4a47bab2.png" 
          alt="SANDRINO Logo"
          className="w-full h-full object-cover"
        />
      </div>
      {withText && (
        <span className="text-xl font-bold tracking-tight text-brand-navy">
          SANDRINO
        </span>
      )}
    </div>
  );
};
