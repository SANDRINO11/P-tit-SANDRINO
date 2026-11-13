import React from 'react';
import { Link } from 'react-router-dom';
import { Service } from '../../data/services';
import { Button } from '../ui/Button';
import { 
  Briefcase, 
  UserCircle, 
  GraduationCap, 
  Lightbulb,
  ArrowRight,
  Users
} from 'lucide-react';

interface ServiceCardProps {
  service: Service;
}

const getIcon = (category: string) => {
  switch (category) {
    case 'Accompagnement entrepreneurial': return <Briefcase size={24} />;
    case 'Développement personnel': return <UserCircle size={24} />;
    case 'Formation et apprentissage': return <GraduationCap size={24} />;
    case 'Conseils et orientation': return <Lightbulb size={24} />;
    default: return <Briefcase size={24} />;
  }
};

export const ServiceCard = ({ service }: ServiceCardProps) => {
  return (
    <div className="group bg-white rounded-3xl overflow-hidden border border-brand-grey hover:border-brand-green/20 hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
      <div className="p-8 flex flex-col flex-grow">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-grey text-brand-navy group-hover:bg-brand-green group-hover:text-white transition-colors duration-300">
          {getIcon(service.category)}
        </div>
        
        <h3 className="text-xl font-bold text-brand-navy mb-4 group-hover:text-brand-green transition-colors">
          {service.name}
        </h3>
        
        <p className="text-sm text-brand-navy/60 mb-6 leading-relaxed">
          {service.shortDescription}
        </p>

        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-navy/30 uppercase mb-3">
            <Users size={14} />
            Public concerné
          </div>
          <p className="text-sm text-brand-navy font-medium">
            {service.targetAudience}
          </p>
        </div>

        <div className="mt-auto pt-6 border-t border-brand-grey flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-brand-navy/30 uppercase">Tarif</span>
            <span className="text-sm font-bold text-brand-navy">
              {service.price ? `${service.price.toLocaleString('fr-FR')} FCFA` : 'À définir'}
            </span>
          </div>
          <Link to={`/services/${service.id}`}>
            <Button variant="secondary" size="sm" className="rounded-xl px-4">
              Détails
              <ArrowRight size={14} className="ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
