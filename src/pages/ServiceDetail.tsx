import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SERVICES } from '../data/services';
import { Button } from '../components/ui/Button';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  CheckCircle2, 
  Target, 
  Zap, 
  Users,
  Calendar,
  Clock,
  Info
} from 'lucide-react';

export const ServiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  const service = useMemo(() => {
    return SERVICES.find(s => s.id === id);
  }, [id]);

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-grey px-6 text-center">
        <div>
          <h2 className="text-3xl font-bold text-brand-navy mb-4">Service non trouvé</h2>
          <p className="text-brand-navy/60 mb-8">Désolé, l'accompagnement que vous recherchez n'est pas disponible.</p>
          <Link to="/services">
            <Button variant="primary">Retour aux services</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-grey min-h-screen pb-20">
      {/* 1. HEADER & BREADCRUMBS */}
      <div className="pt-32 pb-8 px-6">
        <div className="mx-auto max-w-7xl">
          <Link to="/services" className="inline-flex items-center gap-2 text-brand-navy/50 hover:text-brand-green font-bold text-xs uppercase tracking-widest transition-colors">
            <ChevronLeft size={16} />
            Retour aux services
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* 2. SERVICE INFO */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1 bg-brand-green/10 text-brand-green rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
              {service.category}
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-brand-navy mb-8 tracking-tight uppercase leading-tight text-balance">
              {service.name}
            </h1>
            <p className="text-xl text-brand-navy/70 leading-relaxed mb-10 italic">
              {service.fullDescription}
            </p>

            {/* PUBLIC CONCERNÉ */}
            <div className="mb-12 p-8 bg-white rounded-3xl border border-brand-grey shadow-sm">
              <h3 className="text-lg font-bold text-brand-navy mb-4 flex items-center gap-3 uppercase tracking-wider">
                <Users size={20} className="text-brand-green" />
                Public concerné
              </h3>
              <p className="text-brand-navy/80 leading-relaxed">
                {service.targetAudience}
              </p>
            </div>

            {/* OBJECTIVES */}
            <div className="mb-12">
              <h3 className="text-lg font-bold text-brand-navy mb-6 flex items-center gap-3 uppercase tracking-wider">
                <Target size={20} className="text-brand-green" />
                Objectifs de l'accompagnement
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {service.objectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-brand-grey shadow-sm group hover:border-brand-green/30 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0 font-bold text-xs">
                      {i + 1}
                    </div>
                    <span className="text-brand-navy font-medium leading-relaxed">{obj}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* 3. SIDEBAR / ACTIONS */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="sticky top-32">
              {/* DETAILS BOX */}
              <div className="bg-brand-navy rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden mb-8">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/10 rounded-bl-full"></div>
                
                <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                  <Zap size={24} className="text-brand-green" />
                  Détails de l'offre
                </h3>

                <ul className="space-y-6 mb-10">
                  <li className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3 text-brand-grey/60 text-sm">
                      <Calendar size={16} />
                      Format
                    </div>
                    <span className="font-bold text-sm">{service.format || 'À définir'}</span>
                  </li>
                  <li className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3 text-brand-grey/60 text-sm">
                      <Clock size={16} />
                      Durée
                    </div>
                    <span className="font-bold text-sm">{service.duration || 'À définir'}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-brand-grey/60 text-sm">
                      <Users size={16} />
                      Accompagnement
                    </div>
                    <span className="font-bold text-sm text-brand-green">Personnalisé</span>
                  </li>
                </ul>

                <div className="mb-10 text-center p-6 bg-white/5 rounded-2xl border border-white/10">
                  <span className="block text-xs font-bold text-brand-grey/40 uppercase mb-2">Tarif estimé</span>
                  <span className="text-3xl font-black text-brand-green">
                    {service.price ? `${service.price.toLocaleString('fr-FR')} FCFA` : 'Sur devis'}
                  </span>
                </div>

                <Button variant="secondary" size="lg" className="w-full h-16 text-lg font-bold">
                  Demander des informations
                </Button>

                <p className="mt-6 text-[10px] text-center text-brand-grey/40 flex items-center justify-center gap-2">
                  <Info size={12} />
                  Cette fonctionnalité sera disponible prochainement.
                </p>
              </div>

              {/* ADVANTAGES BOX */}
              <div className="bg-white rounded-[2rem] p-8 border border-brand-grey shadow-lg">
                <h3 className="text-lg font-bold text-brand-navy mb-6 uppercase tracking-wider">
                  Vos avantages
                </h3>
                <ul className="space-y-5">
                  {service.advantages.map((adv, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <CheckCircle2 size={18} className="text-brand-green shrink-0 mt-0.5" />
                      <span className="text-sm text-brand-navy/70 leading-relaxed">{adv}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
