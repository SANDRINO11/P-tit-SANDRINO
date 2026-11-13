import React from 'react';
import { ArrowRight } from 'lucide-react';

interface UniverseCardProps {
  title: string;
  description: string;
  className?: string;
}

export const UniverseCard = ({ title, description, className = '' }: UniverseCardProps) => {
  return (
    <div className={`group relative overflow-hidden rounded-2xl bg-brand-navy p-8 transition-all duration-300 hover:-translate-y-1 ${className}`}>
      {/* Decorative accent */}
      <div className="absolute top-0 right-0 h-24 w-24 bg-brand-green/10 rounded-bl-full transition-transform duration-500 group-hover:scale-110"></div>
      
      <div className="relative z-10">
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <p className="text-brand-grey/70 mb-8 leading-relaxed">
          {description}
        </p>
        <div className="flex items-center text-brand-green font-medium text-sm gap-2">
          En savoir plus
          <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  );
};
