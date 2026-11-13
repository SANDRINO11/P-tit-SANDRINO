import React from 'react';

interface CardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
}

export const FeatureCard = ({ title, description, icon, className = '' }: CardProps) => {
  return (
    <div className={`group p-8 rounded-2xl bg-white border border-brand-grey hover:border-brand-green/30 hover:shadow-xl hover:shadow-brand-navy/5 transition-all duration-300 ${className}`}>
      <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-grey text-brand-navy group-hover:bg-brand-green group-hover:text-white transition-colors duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-brand-navy mb-4 group-hover:text-brand-green transition-colors">{title}</h3>
      <p className="text-brand-navy/70 leading-relaxed">{description}</p>
    </div>
  );
};
