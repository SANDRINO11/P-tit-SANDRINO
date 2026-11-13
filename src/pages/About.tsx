import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { FeatureCard } from '../components/ui/FeatureCard';
import { BookOpen, TrendingUp, Zap, Share2, CheckCircle2 } from 'lucide-react';

export const About = () => {
  return (
    <>
      {/* 1. SECTION PRINCIPALE — À PROPOS */}
      <section className="relative pt-32 pb-20 bg-brand-navy overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-brand-green/5 skew-x-12 transform translate-x-1/2"></div>
        <div className="mx-auto max-w-7xl px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <span className="text-brand-green font-bold tracking-widest uppercase text-sm mb-4 block">
              Notre histoire
            </span>
            <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold text-white mb-6 sm:mb-8 tracking-tight uppercase break-words max-w-2xl leading-tight">
              À PROPOS DE <span className="text-brand-green">SANDRINO</span>
            </h1>
            <p className="text-base sm:text-xl text-brand-grey/90 leading-relaxed">
              « SANDRINO est une plateforme dédiée à l'apprentissage, à l'entrepreneuriat et au développement personnel. Elle a été créée avec la volonté d'aider chacun à découvrir de nouvelles connaissances, développer ses compétences et avancer vers ses objectifs. »
            </p>
          </motion.div>
        </div>
      </section>

      {/* 2. SECTION — NOTRE MISSION */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src="/src/assets/images/hero_entrepreneurship_learning_1794242222891.jpg" 
                  alt="Mission SANDRINO"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-brand-navy/10"></div>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="order-1 lg:order-2"
            >
              <h2 className="text-2xl md:text-5xl font-bold text-brand-navy mb-8 uppercase tracking-tight text-balance leading-tight">
                Notre Mission
              </h2>
              <div className="h-1.5 w-20 bg-brand-green mb-8"></div>
              <p className="text-xl text-brand-navy/70 leading-relaxed mb-8">
                « Notre mission est d'accompagner les personnes qui souhaitent apprendre, évoluer et passer à l'action grâce à des ressources pratiques, des outils numériques et des accompagnements adaptés à leurs besoins. »
              </p>
              <ul className="space-y-4">
                {[
                  "Accompagnement personnalisé",
                  "Ressources de haute qualité",
                  "Communauté d'entraide",
                  "Outils numériques innovants"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-brand-navy font-medium">
                    <CheckCircle2 className="text-brand-green" size={20} />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. SECTION — NOTRE VISION */}
      <section className="py-24 bg-brand-grey">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl md:text-5xl font-bold text-brand-navy mb-8 uppercase tracking-tight text-balance leading-tight">
              Notre Vision
            </h2>
            <p className="text-2xl text-brand-navy/80 italic leading-relaxed">
              « Nous croyons que l'accès aux connaissances et aux bons outils peut aider chaque personne à développer son potentiel et à créer de nouvelles opportunités. SANDRINO souhaite devenir un espace où apprendre, évoluer et entreprendre deviennent plus accessibles. »
            </p>
          </motion.div>
        </div>
      </section>

      {/* 4. SECTION — NOS VALEURS */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-5xl font-bold text-brand-navy mb-6 uppercase text-balance max-w-2xl mx-auto leading-tight">Nos Valeurs</h2>
            <div className="h-1.5 w-20 bg-brand-green mx-auto"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              title="APPRENDRE"
              description="Nous croyons que l'apprentissage est une étape essentielle pour progresser chaque jour."
              icon={<BookOpen size={24} />}
            />
            <FeatureCard 
              title="ÉVOLUER"
              description="Chaque personne possède un potentiel qui peut être développé avec discipline et persévérance."
              icon={<TrendingUp size={24} />}
            />
            <FeatureCard 
              title="PASSER À L'ACTION"
              description="Les connaissances prennent toute leur valeur lorsqu'elles sont transformées en actions concrètes."
              icon={<Zap size={24} />}
            />
            <FeatureCard 
              title="PARTAGER"
              description="Nous souhaitons rendre les connaissances et les opportunités plus accessibles à tous."
              icon={<Share2 size={24} />}
            />
          </div>
        </div>
      </section>

      {/* 5. SECTION — LE FONDATEUR */}
      <section className="py-24 bg-brand-grey overflow-hidden">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl md:text-5xl font-bold text-brand-navy mb-8 uppercase text-balance leading-tight">Derrière SANDRINO</h2>
              <div className="h-1.5 w-20 bg-brand-green mb-8"></div>
              <h3 className="text-2xl font-bold text-brand-navy mb-4">Pétit SANDRINO</h3>
              <p className="text-lg text-brand-navy/70 leading-relaxed mb-8">
                « Pétit SANDRINO est le fondateur de SANDRINO. Animé par l'entrepreneuriat, l'apprentissage et le développement personnel, il souhaite partager son parcours, ses découvertes et les ressources qui peuvent aider d'autres personnes à progresser et à développer leurs projets. »
              </p>
              <div className="p-6 bg-white rounded-2xl border border-brand-grey shadow-sm">
                <p className="italic text-brand-navy/60">
                  "L'ambition sans action n'est qu'un rêve. SANDRINO est l'outil pour transformer ces rêves en résultats tangibles."
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="aspect-square max-w-md mx-auto relative z-10 rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
                <img 
                  src="/assets/aistudio/dde54a32-a773-452f-9c54-792cc3c6a042_967bafe3.png" 
                  alt="Pétit SANDRINO - Fondateur"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-brand-green/10 rounded-full scale-110 blur-3xl z-0"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 6. SECTION — NOTRE ENGAGEMENT */}
      <section className="py-24 bg-brand-navy text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-5xl font-bold mb-6 uppercase text-balance max-w-2xl mx-auto leading-tight">Notre engagement envers vous</h2>
            <div className="h-1.5 w-20 bg-brand-green mx-auto"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: "Des ressources utiles",
                desc: "Proposer des contenus et outils qui apportent une véritable valeur aux utilisateurs au quotidien."
              },
              {
                title: "Une évolution continue",
                desc: "Améliorer progressivement les ressources et les services proposés par SANDRINO pour rester à la pointe."
              },
              {
                title: "Un accompagnement accessible",
                desc: "Créer une plateforme simple et accessible pour les personnes qui souhaitent sincèrement apprendre et évoluer."
              }
            ].map((engagement, i) => (
              <div key={i} className="text-center group">
                <div className="mb-6 mx-auto w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-brand-green transition-colors duration-300">
                  <span className="text-2xl font-bold text-brand-green group-hover:text-white">0{i+1}</span>
                </div>
                <h3 className="text-xl font-bold mb-4">{engagement.title}</h3>
                <p className="text-brand-grey/60 leading-relaxed">{engagement.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. APPEL À L'ACTION */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-3xl sm:rounded-[2.5rem] bg-brand-green p-5 sm:p-12 lg:p-20 text-center text-white relative overflow-hidden shadow-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative z-10"
            >
              <h2 className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-extrabold mb-6 sm:mb-8 uppercase break-words max-w-3xl mx-auto leading-snug">
                VOTRE ÉVOLUTION PEUT COMMENCER AUJOURD'HUI.
              </h2>
              <p className="text-xl mb-12 text-white/90 max-w-2xl mx-auto leading-relaxed">
                « Découvrez les ressources et les opportunités proposées par SANDRINO et faites un premier pas vers vos objectifs. »
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <Link to="/domains">
                  <Button variant="primary" size="lg" className="bg-brand-navy hover:bg-brand-navy/90 border-none px-10">
                    Découvrir nos domaines
                  </Button>
                </Link>
                <Link to="/domains">
                  <Button variant="outline" size="lg" className="bg-white text-brand-navy border-white hover:bg-brand-grey px-10">
                    Explorer nos offres
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};
