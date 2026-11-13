import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { 
  Briefcase, 
  UserCircle, 
  Heart, 
  GraduationCap, 
  CheckCircle2, 
  Search, 
  BookOpen, 
  Zap 
} from 'lucide-react';

const domainList = [
  {
    title: "ENTREPRENEURIAT",
    description: "Découvrez des conseils, des ressources et des outils pour développer vos idées, mieux comprendre le monde entrepreneurial et avancer dans vos projets.",
    icon: <Briefcase size={32} />,
    themes: ["Entrepreneuriat", "Business en ligne", "Marketing digital", "Création de projets", "Opportunités numériques"],
    color: "bg-brand-navy"
  },
  {
    title: "DÉVELOPPEMENT PERSONNEL",
    description: "Développez votre potentiel grâce à des ressources consacrées à la motivation, la discipline, la confiance en soi et la réalisation de vos objectifs.",
    icon: <UserCircle size={32} />,
    themes: ["Motivation", "Discipline", "Confiance en soi", "Gestion des objectifs", "Habitudes positives"],
    color: "bg-brand-green"
  },
  {
    title: "BIEN-ÊTRE",
    description: "Découvrez des ressources et des conseils pour développer de meilleures habitudes et favoriser votre équilibre personnel au quotidien.",
    icon: <Heart size={32} />,
    themes: ["Gestion du stress", "Équilibre personnel", "Habitudes de vie", "Organisation", "Bien-être mental général"],
    color: "bg-brand-navy"
  },
  {
    title: "FORMATION ET APPRENTISSAGE",
    description: "Développez de nouvelles compétences grâce à des guides, des formations et des ressources pratiques accessibles à différents niveaux.",
    icon: <GraduationCap size={32} />,
    themes: ["Apprentissage de compétences", "Formations numériques", "Guides pratiques", "Ressources éducatives", "Développement pro"],
    color: "bg-brand-green"
  }
];

export const Domains = () => {
  return (
    <>
      {/* 1. PAGE PRINCIPALE DES DOMAINES */}
      <section className="relative pt-32 pb-20 bg-brand-navy overflow-hidden">
        {/* Subtle geometric background pattern */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 border border-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 border border-brand-green rounded-full translate-x-1/3 translate-y-1/3"></div>
        </div>

        <div className="mx-auto max-w-7xl px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="text-brand-green font-bold tracking-[0.3em] uppercase text-sm mb-4 block">
              Exploration
            </span>
            <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold text-white mb-6 sm:mb-8 tracking-tight uppercase break-words max-w-2xl mx-auto leading-tight">
              NOS DOMAINES <span className="text-brand-green">D'EXPERTISE</span>
            </h1>
            <p className="text-base sm:text-xl text-brand-grey/90 leading-relaxed">
              « SANDRINO propose des ressources et des accompagnements dans plusieurs domaines pour aider chacun à apprendre, évoluer et avancer vers ses objectifs personnels ou professionnels. »
            </p>
          </motion.div>
        </div>
      </section>

      {/* 2-5. DOMAINES D'EXPERTISE CARDS */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {domainList.map((domain, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group flex flex-col h-full bg-brand-grey rounded-[2.5rem] overflow-hidden border border-brand-grey hover:border-brand-green/30 hover:shadow-2xl transition-all duration-300"
              >
                <div className={`p-10 ${domain.color} text-white`}>
                  <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                    {domain.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4 tracking-tight uppercase">{domain.title}</h3>
                  <p className="text-brand-grey/80 leading-relaxed">
                    {domain.description}
                  </p>
                </div>
                
                <div className="p-10 flex flex-col flex-grow">
                  <h4 className="text-sm font-bold text-brand-navy/40 uppercase tracking-widest mb-6">Thèmes abordés</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 flex-grow">
                    {domain.themes.map((theme, i) => (
                      <li key={i} className="flex items-center gap-3 text-brand-navy font-medium text-sm">
                        <CheckCircle2 className="text-brand-green shrink-0" size={18} />
                        {theme}
                      </li>
                    ))}
                  </ul>
                  
                  <Link to="/shop" className="w-full sm:w-auto mt-auto">
                    <Button variant="secondary" size="lg" className="w-full">
                      Découvrir les ressources
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. SECTION — COMMENT SANDRINO PEUT VOUS AIDER ? */}
      <section className="py-24 bg-brand-navy text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-green/5 -skew-x-12 transform translate-x-1/4"></div>
        
        <div className="mx-auto max-w-7xl px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-2xl md:text-5xl font-bold mb-6 uppercase tracking-tight text-balance max-w-3xl mx-auto leading-tight">
              UN SEUL OBJECTIF : <span className="text-brand-green">VOUS AIDER À PROGRESSER</span>
            </h2>
            <div className="h-1.5 w-24 bg-brand-green mx-auto mb-8"></div>
            <p className="text-xl text-brand-grey/80 max-w-3xl mx-auto leading-relaxed">
              « Quel que soit votre point de départ, SANDRINO vous propose des ressources et des outils conçus pour vous aider à apprendre, développer vos compétences et avancer progressivement vers vos objectifs. »
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connection Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-px border-t border-dashed border-white/20 z-0"></div>

            {[
              {
                step: "01",
                title: "DÉCOUVRIR",
                desc: "Explorez les domaines et choisissez les ressources qui correspondent à vos besoins spécifiques.",
                icon: <Search size={28} />
              },
              {
                step: "02",
                title: "APPRENDRE",
                desc: "Accédez à des contenus et des outils pratiques pour développer vos connaissances avec excellence.",
                icon: <BookOpen size={28} />
              },
              {
                step: "03",
                title: "PASSER À L'ACTION",
                desc: "Utilisez vos nouvelles connaissances pour avancer concrètement vers vos objectifs personnels.",
                icon: <Zap size={28} />
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative z-10 flex flex-col items-center text-center group"
              >
                <div className="mb-8 relative">
                  <div className="h-24 w-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-green group-hover:bg-brand-green group-hover:text-white transition-all duration-300">
                    {item.icon}
                  </div>
                  <span className="absolute -top-3 -right-3 h-10 w-10 rounded-full bg-brand-navy border-2 border-brand-green flex items-center justify-center text-xs font-bold">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-4 uppercase tracking-wider">{item.title}</h3>
                <p className="text-brand-grey/60 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. APPEL À L'ACTION FINAL */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-3xl sm:rounded-[3rem] bg-brand-green p-5 sm:p-12 lg:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-brand-green/20">
            {/* Decorative background shapes */}
            <div className="absolute top-0 left-0 w-48 h-48 bg-white/10 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 right-0 w-72 h-72 bg-brand-navy/10 translate-x-1/4 translate-y-1/4 rounded-full blur-2xl"></div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative z-10"
            >
              <h2 className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 sm:mb-8 uppercase leading-snug break-words max-w-3xl mx-auto">
                TROUVEZ LES RESSOURCES QUI CORRESPONDENT À VOS OBJECTIFS.
              </h2>
              <p className="text-xl mb-12 text-white/90 max-w-2xl mx-auto leading-relaxed">
                « Explorez les différents univers de SANDRINO et découvrez progressivement les ressources et accompagnements disponibles. »
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <Link to="/shop">
                  <Button variant="primary" size="lg" className="bg-brand-navy hover:bg-brand-navy/90 text-white border-none px-12">
                    Explorer la boutique
                  </Button>
                </Link>
                <Link to="/services">
                  <Button variant="outline" size="lg" className="bg-white text-brand-navy border-white hover:bg-brand-grey px-12">
                    Découvrir nos services
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
