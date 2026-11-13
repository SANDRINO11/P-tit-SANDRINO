import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green disabled:pointer-events-none disabled:opacity-50 rounded-lg';
  
  const variants = {
    primary: 'bg-brand-navy text-white hover:bg-brand-navy/90 shadow-sm',
    secondary: 'bg-brand-green text-white hover:bg-brand-green/90 shadow-sm',
    outline: 'border border-brand-navy bg-transparent text-brand-navy hover:bg-brand-grey',
    ghost: 'bg-transparent text-brand-navy hover:bg-brand-grey',
  };
  
  const sizes = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-11 px-6 text-sm',
    lg: 'h-14 px-8 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
