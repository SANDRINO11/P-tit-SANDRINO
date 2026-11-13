import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { SubscriptionPlan } from '../data/subscriptions';
import { subscriptionService } from '../lib/subscriptionService';
import { Button } from '../components/ui/Button';
import { Check, Info, ShieldCheck, Star, Zap } from 'lucide-react';

export const Subscriptions = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => subscriptionService.getPlansSync());

  useEffect(() => {
    let active = true;
    subscriptionService.getPlans().then((livePlans) => {
      if (active && livePlans.length > 0) {
        setPlans(livePlans);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="bg-brand-grey min-h-screen">
      {/* 1. HERO SECTION */}
      <section className="relative pt-32 pb-20 bg-brand-navy overflow-hidden text-center">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-green rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
        </div>

        <div className="mx-auto max-w-7xl px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-brand-green font-bold tracking-[0.3em] uppercase text-xs mb-4 block">
              Adhésion & Privilèges
            </span>
            <h1 className="text-3xl md:text-6xl font-extrabold text-white mb-8 tracking-tight uppercase text-balance max-w-4xl mx-auto leading-tight">
              CHOISISSEZ LA FORMULE QUI <br className="hidden md:block" /> VOUS RESSEMBLE
            </h1>
            <p className="text-lg md:text-xl text-brand-grey/80 leading-relaxed max-w-3xl mx-auto italic">
              « Rejoignez la communauté SANDRINO et accédez à des ressources exclusives conçues pour booster votre apprentissage, votre business et votre épanissement personnel. »
            </p>
          </motion.div>
        </div>
      </section>

      {/* 2. PLANS COMPARISON */}
      <section className="py-24 px-6 relative z-20 -mt-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan, index) => {
              const isPaidUnconfigured = plan.id !== 'free' && plan.price <= 0;
              return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative flex flex-col p-8 md:p-10 rounded-[2.5rem] bg-white border transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${
                  plan.isHighlighted 
                    ? 'border-brand-green ring-4 ring-brand-green/10 z-10' 
                    : 'border-brand-grey'
                }`}
              >
                {plan.isHighlighted && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-brand-green text-white px-6 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                    <Star size={12} fill="currentColor" />
                    Recommandé
                  </div>
                )}

                <div className="mb-10 text-center">
                  <h3 className={`text-2xl font-black uppercase mb-6 tracking-tight ${plan.isHighlighted ? 'text-brand-green' : 'text-brand-navy'}`}>
                    {plan.name}
                  </h3>
                  <div className="flex flex-col items-center">
                    {isPaidUnconfigured ? (
                      <span className="text-xl md:text-2xl font-black text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2 rounded-2xl">
                        Tarif à définir
                      </span>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl md:text-5xl font-black text-brand-navy">
                          {plan.price > 0 ? plan.price.toLocaleString('fr-FR') : '0'}
                        </span>
                        <span className="text-sm font-bold text-brand-navy/40 uppercase">FCFA</span>
                      </div>
                    )}
                    <span className="mt-2 text-xs font-bold text-brand-navy/30 uppercase tracking-widest bg-brand-grey px-3 py-1 rounded-lg">
                      {plan.billingCycle}
                    </span>
                  </div>
                </div>

                <div className="flex-grow">
                  <h4 className="text-xs font-black text-brand-navy uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Zap size={14} className={plan.isHighlighted ? 'text-brand-green' : 'text-brand-navy/30'} />
                    Ce qui est inclus
                  </h4>
                  <ul className="space-y-4 mb-12">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-4">
                        <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${plan.isHighlighted ? 'bg-brand-green text-white' : 'bg-brand-grey text-brand-navy/40'}`}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                        <span className="text-sm font-medium text-brand-navy/70 leading-tight">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link to={plan.id === 'free' ? '/dashboard' : isPaidUnconfigured ? '/contact' : `/checkout?plan=${plan.id}`}>
                  <Button 
                    variant={plan.isHighlighted ? 'secondary' : 'outline'} 
                    size="lg" 
                    className={`w-full rounded-2xl h-16 text-base font-black uppercase tracking-wider ${
                      !plan.isHighlighted && 'border-2'
                    }`}
                  >
                    {isPaidUnconfigured ? 'Nous contacter' : 'Choisir cette formule'}
                  </Button>
                </Link>
                
                <p className="mt-6 text-[10px] text-center text-brand-navy/40 flex items-center justify-center gap-2">
                  <Info size={12} />
                  {plan.id === 'free' ? 'Accès immédiat dès inscription.' : 'Activation après validation manuelle.'}
                </p>
              </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. SECURITY & TRUST */}
      <section className="py-24 bg-brand-navy text-white overflow-hidden relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl md:text-5xl font-bold mb-8 uppercase leading-tight text-balance">
                UN SYSTÈME <span className="text-brand-green">SÉCURISÉ</span> ET <span className="text-brand-green">TRANSPARENT</span>
              </h2>
              <div className="h-1.5 w-20 bg-brand-green mb-8"></div>
              <p className="text-lg text-brand-grey/70 leading-relaxed mb-10">
                L'accès à nos formules payantes repose sur une vérification manuelle de chaque transaction. Cela garantit une transparence totale et une assistance personnalisée dès le début de votre engagement.
              </p>
              
              <div className="space-y-6">
                {[
                  "Paiement manuel via T-Money (Togocom) et Moov Money (Togo)",
                  "Validation rapide par l'administration SANDRINO",
                  "Suivi précis de l'état de votre abonnement",
                  "Notifications de renouvellement avant expiration"
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <ShieldCheck className="text-brand-green shrink-0" size={24} />
                    <span className="text-sm md:text-base font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-white/5 border border-white/10 p-8 md:p-12 rounded-[3rem] backdrop-blur-sm"
            >
              <h3 className="text-xl font-bold mb-8 text-center uppercase tracking-widest text-brand-green">État du système</h3>
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between mb-3 text-xs font-bold uppercase tracking-wider text-brand-grey/50">
                    <span>Vérification Paiements</span>
                    <span className="text-brand-green">Opérationnel</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-brand-green"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-3 text-xs font-bold uppercase tracking-wider text-brand-grey/50">
                    <span>Attribution Droits</span>
                    <span className="text-brand-green">Automatisé</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-brand-green opacity-80"></div>
                  </div>
                </div>
                <div className="pt-8 text-center">
                  <p className="text-sm text-brand-grey/60">
                    Paiement Mobile Money T-Money et Moov Money opérationnel avec vérification manuelle sécurisée.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. FINAL CTA */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-3xl sm:rounded-[3rem] bg-brand-green p-5 sm:p-12 lg:p-20 text-center text-white relative overflow-hidden shadow-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative z-10"
            >
              <h2 className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-extrabold mb-6 sm:mb-8 uppercase break-words max-w-3xl mx-auto leading-snug">
                VOTRE ÉVOLUTION MÉRITE LE MEILLEUR.
              </h2>
              <p className="text-lg md:text-xl mb-12 text-white/90 max-w-2xl mx-auto leading-relaxed">
                « Ne laissez pas vos ambitions s'éteindre. Choisissez la formule qui correspond à votre rythme et commencez à transformer vos résultats. »
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <Link to="/register">
                  <Button variant="primary" size="lg" className="bg-brand-navy hover:bg-brand-navy/90 border-none px-12 h-16">
                    Créer un compte
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="lg" className="bg-white text-brand-navy border-white hover:bg-brand-grey px-12 h-16">
                    Nous contacter
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
