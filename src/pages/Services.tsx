import React from 'react';
import { motion } from 'motion/react';
import { SERVICES } from '../data/services';
import { ServiceCard } from '../components/services/ServiceCard';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

export const ServicesPage = () => {
  return (
    <div className="bg-brand-grey min-h-screen">
      {/* 1. HERO */}
      <section className="relative pt-32 pb-20 bg-brand-navy overflow-hidden">
        {/* Subtle geometric pattern */}
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 border border-brand-green rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 border border-white rounded-full -translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="mx-auto max-w-7xl px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <span className="text-brand-green font-bold tracking-[0.3em] uppercase text-sm mb-4 block">
              Accompagnements
            </span>
            <h1 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 sm:mb-8 tracking-tight uppercase break-words max-w-2xl leading-tight">
              SERVICES ET <br className="sm:hidden" /><span className="text-brand-green">ACCOMPAGNEMENTS</span>
            </h1>
            <p className="text-base sm:text-xl text-brand-grey/90 leading-relaxed mb-8 sm:mb-10">
              « Découvrez les services proposés par SANDRINO. Que vous soyez un entrepreneur débutant ou une personne en quête d'évolution, nous vous accompagnons vers vos objectifs. »
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/about">
                <Button variant="secondary" size="lg" className="px-10">
                  Découvrir SANDRINO
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. SERVICES GRID */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-5xl mb-6 uppercase text-balance max-w-2xl mx-auto leading-tight">
              Nos Offres d'accompagnement
            </h2>
            <div className="h-1.5 w-24 bg-brand-green mx-auto"></div>
          </div>

          {SERVICES.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {SERVICES.map((service) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <ServiceCard service={service} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-brand-grey shadow-sm">
              <p className="text-brand-navy/60">
                Nos services seront bientôt configurés. Revenez découvrir nos prochaines offres.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 3. APPEL À L'ACTION */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-3xl sm:rounded-[2.5rem] bg-brand-green p-5 sm:p-12 lg:p-20 text-center text-white relative overflow-hidden shadow-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative z-10"
            >
              <h2 className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 sm:mb-8 uppercase break-words max-w-3xl mx-auto leading-snug">
                BESOIN D'UN <br className="sm:hidden" />ACCOMPAGNEMENT <br className="sm:hidden" />SUR MESURE ?
              </h2>
              <p className="text-base sm:text-xl mb-10 text-white/90 max-w-2xl mx-auto leading-relaxed">
                « Si vous avez des besoins spécifiques ou si vous souhaitez en savoir plus sur la manière dont SANDRINO peut vous aider, n'hésitez pas à nous contacter. »
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
                <Button variant="primary" size="lg" className="bg-brand-navy hover:bg-brand-navy/90 border-none px-8 sm:px-12 w-full sm:w-auto">
                  Prendre contact
                </Button>
                <Link to="/domains" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="bg-white text-brand-navy border-white hover:bg-brand-grey px-8 sm:px-12 w-full sm:w-auto">
                    Voir les domaines
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};
