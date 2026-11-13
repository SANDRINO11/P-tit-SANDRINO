import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Logo } from '../common/Logo';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-brand-grey bg-brand-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-4 lg:gap-8">
          {/* Brand Info */}
          <div className="lg:col-span-1">
            <Logo className="mb-6" />
            <p className="text-sm leading-relaxed text-brand-navy/70">
              SANDRINO est une plateforme dédiée à l'apprentissage, à l'entrepreneuriat et au développement personnel. Transformez vos ambitions en résultats réels.
            </p>
          </div>

          {/* Quick Links Placeholder */}
          <div>
            <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-brand-navy">Plateforme</h3>
            <ul className="space-y-4 text-sm text-brand-navy/70">
              <li><Link to="/" className="hover:text-brand-green transition-colors">Accueil</Link></li>
              <li><Link to="/about" className="hover:text-brand-green transition-colors">À propos</Link></li>
              <li><Link to="/domains" className="hover:text-brand-green transition-colors">Domaines</Link></li>
              <li>
                <Link to="/admin" className="hover:text-brand-green transition-colors flex items-center gap-1.5 font-bold text-brand-navy">
                  <ShieldCheck size={14} className="text-brand-green" />
                  Espace Administration
                </Link>
              </li>
            </ul>
          </div>

          {/* Business Placeholder */}
          <div>
            <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-brand-navy">Business</h3>
            <ul className="space-y-4 text-sm text-brand-navy/70">
              <li><Link to="/shop" className="hover:text-brand-green transition-colors">Boutique</Link></li>
              <li><Link to="/subscriptions" className="hover:text-brand-green transition-colors">Abonnements</Link></li>
              <li><Link to="/services" className="hover:text-brand-green transition-colors">Services</Link></li>
            </ul>
          </div>

          {/* Legal Placeholder */}
          <div>
            <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-brand-navy">Légal</h3>
            <ul className="space-y-4 text-sm text-brand-navy/70">
              <li><Link to="/legal#mentions" className="hover:text-brand-green transition-colors">Mentions légales</Link></li>
              <li><Link to="/legal#confidentialite" className="hover:text-brand-green transition-colors">Confidentialité</Link></li>
              <li><Link to="/contact" className="hover:text-brand-green transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-brand-grey pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-brand-navy/50">
            © {currentYear} SANDRINO par Pétit SANDRINO. Tous droits réservés.
          </p>
          <div className="flex gap-6 text-xs text-brand-navy/50">
            <span>Développé avec excellence</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
