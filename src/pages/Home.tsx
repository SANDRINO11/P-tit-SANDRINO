import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { FeatureCard } from '../components/ui/FeatureCard';
import { UniverseCard } from '../components/ui/UniverseCard';
import { motion } from 'motion/react';
import { BookOpen, TrendingUp, Zap } from 'lucide-react';

export const Home = () => {
  return (
    <>
      {/* SECTION 1: HERO */}
      <section className="relative w-full min-h-[80vh] flex items-center overflow-hidden bg-brand-navy pt-20">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/src/assets/images/hero_entrepreneurship_learning_1794242222891.jpg" 
            alt="SANDRINO Professional Workspace"
            className="h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/60 to-transparent"></div>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.2em] text-brand-green">
                Bienvenue chez SANDRINO
              </span>
              <h1 className="mb-6 sm:mb-8 text-2xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white break-words max-w-4xl leading-tight">
                TON AVENIR COMMENCE PAR UNE DÉCISION.
              </h1>
              <p className="mb-8 sm:mb-10 text-base sm:text-xl leading-relaxed text-brand-grey/90 max-w-2xl">
                « Développe tes compétences, découvre de nouvelles opportunités et donne vie à tes ambitions grâce à des ressources et des accompagnements pensés pour t'aider à progresser. »
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link to="/about">
                  <Button variant="secondary" size="lg">
                    Découvrir SANDRINO
                  </Button>
                </Link>
                <Link to="/shop">
                  <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                    Explorer nos offres
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 2: POURQUOI SANDRINO ? */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-5xl mb-6 uppercase max-w-3xl mx-auto text-balance leading-tight">
              Pourquoi choisir SANDRINO ?
            </h2>
            <div className="h-1.5 w-24 bg-brand-green mx-auto"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              title="APPRENDRE" 
              description="Découvre des ressources et des connaissances pratiques pour développer tes compétences dans divers domaines d'avenir."
              icon={<BookOpen size={24} />}
            />
            <FeatureCard 
              title="ÉVOLUER" 
              description="Travaille sur ton potentiel, tes habitudes et tes objectifs personnels ou professionnels pour une croissance continue."
              icon={<TrendingUp size={24} />}
            />
            <FeatureCard 
              title="PASSER À L'ACTION" 
              description="Transforme tes connaissances en actions concrètes pour avancer vers tes ambitions les plus grandes."
              icon={<Zap size={24} />}
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: NOS UNIVERS */}
      <section className="py-24 bg-brand-grey">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-5xl mb-6 uppercase max-w-3xl mx-auto text-balance leading-tight">
              Explore nos univers
            </h2>
            <div className="h-1.5 w-24 bg-brand-green mx-auto"></div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link to="/domains">
              <UniverseCard 
                title="ENTREPRENEURIAT"
                description="Découvre des conseils, ressources et opportunités pour développer tes projets et ton esprit d'entreprise."
              />
            </Link>
            <Link to="/domains">
              <UniverseCard 
                title="DÉVELOPPEMENT PERSONNEL"
                description="Améliore ta discipline, ta confiance et ta capacité à atteindre tes objectifs avec nos guides spécialisés."
              />
            </Link>
            <Link to="/domains">
              <UniverseCard 
                title="BIEN-ÊTRE"
                description="Découvre des ressources pour développer de meilleures habitudes et prendre soin de ton équilibre de vie."
              />
            </Link>
            <Link to="/domains">
              <UniverseCard 
                title="FORMATION"
                description="Apprends de nouvelles compétences grâce à des contenus et ressources pratiques adaptés à tes besoins."
              />
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 4: NOTRE VISION */}
      <section className="relative py-24 bg-brand-navy overflow-hidden">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-brand-green/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-green/5 rounded-full blur-3xl"></div>

        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-5xl mb-8 uppercase leading-tight text-balance">
                Une plateforme pour <span className="text-brand-green">apprendre</span> et <span className="text-brand-green">progresser</span>
              </h2>
              <p className="text-xl leading-relaxed text-brand-grey/80 mb-10">
                « Chez SANDRINO, nous croyons que chaque personne peut progresser lorsqu'elle dispose des bonnes connaissances, des bons outils et de la motivation nécessaire pour passer à l'action. Notre objectif est de rendre l'apprentissage et l'évolution personnelle plus accessibles à tous ceux qui osent rêver grand. »
              </p>
              <Link to="/about">
                <Button variant="secondary" size="lg" className="px-10">
                  En savoir plus sur SANDRINO
                </Button>
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            >
              <img 
                src="/assets/aistudio/7e6f3df8-0391-490d-a90c-74df06c6cbf1_22f71846.png" 
                alt="SANDRINO Vision"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-brand-navy/20"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 5: APPEL À L'ACTION */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-3xl sm:rounded-[2.5rem] bg-brand-green p-5 sm:p-12 lg:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-brand-green/20">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 -translate-x-1/2 -translate-y-1/2 rounded-full"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand-navy/10 translate-x-1/4 translate-y-1/4 rounded-full"></div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative z-10"
            >
              <h2 className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 sm:mb-8 uppercase break-words max-w-3xl mx-auto leading-snug">
                Prêt à commencer ton évolution ?
              </h2>
              <p className="text-base sm:text-xl mb-10 text-white/90 max-w-2xl mx-auto leading-relaxed">
                « Découvre SANDRINO et commence dès aujourd'hui à investir dans tes connaissances, tes compétences et ton avenir. »
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <Link to="/domains">
                  <Button variant="primary" size="lg" className="bg-brand-navy hover:bg-brand-navy/90 text-white border-none px-10">
                    Découvrir nos offres
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="outline" size="lg" className="bg-white text-brand-navy border-white hover:bg-brand-grey px-10">
                    Créer mon compte
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
