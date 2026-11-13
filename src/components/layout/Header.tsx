import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, ShieldCheck } from 'lucide-react';
import { Logo } from '../common/Logo';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

const navLinks = [
  { name: 'Accueil', href: '/' },
  { name: 'À propos', href: '/about' },
  { name: 'Domaines', href: '/domains' },
  { name: 'Boutique', href: '/shop' },
  { name: 'Services', href: '/services' },
  { name: 'Abonnements', href: '/subscriptions' },
  { name: 'Contact', href: '/contact' },
];

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-brand-grey bg-white/80 backdrop-blur-md text-brand-navy">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-8 px-6">
        {/* Zone 1: Logo */}
        <Link to="/" className="flex items-center gap-3">
          <Logo />
        </Link>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className="text-sm font-medium text-brand-navy/70 transition-colors hover:text-brand-navy hover:underline decoration-brand-green decoration-2 underline-offset-4 whitespace-nowrap"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Zone 3: Primary Action / User Profile */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="hidden sm:flex items-center gap-3">
              {profile?.role === 'admin' && (
                <Link to="/admin">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-navy text-white text-xs font-bold hover:bg-brand-navy/90 transition-colors">
                    <ShieldCheck size={14} className="text-brand-green" />
                    Administration
                  </span>
                </Link>
              )}
              <Link to="/dashboard" className="flex items-center gap-2 group">
                <div className="h-10 w-10 rounded-full bg-brand-grey border border-brand-grey flex items-center justify-center text-brand-navy group-hover:border-brand-green transition-colors">
                  <User size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-none">{profile?.full_name || 'Membre'}</span>
                  <span className="text-[10px] text-brand-navy/40 uppercase font-black tracking-widest">{profile?.role || 'Membre'}</span>
                </div>
              </Link>
              <button 
                onClick={handleSignOut}
                className="p-2 text-brand-navy/40 hover:text-red-500 transition-colors"
                title="Déconnexion"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link to="/login">
                <Button variant="outline" size="sm">
                  Connexion
                </Button>
              </Link>
              <Link to="/admin">
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-navy text-white text-xs font-bold hover:bg-brand-navy/90 transition-colors">
                  <ShieldCheck size={14} className="text-brand-green" />
                  Admin
                </span>
              </Link>
            </div>
          )}
          
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand-grey lg:hidden"
            aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-b border-brand-grey lg:hidden animate-in fade-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col p-6 gap-4">
            {user && (
               <div className="mb-4 p-4 bg-brand-grey rounded-2xl flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-brand-navy">
                    <User size={24} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{profile?.full_name || 'Membre'}</span>
                    <span className="text-[10px] text-brand-navy/40 uppercase font-black tracking-widest">{profile?.role || 'Membre'}</span>
                  </div>
               </div>
            )}
            
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="text-base font-medium text-brand-navy border-b border-brand-grey pb-2 last:border-0"
              >
                {link.name}
              </Link>
            ))}

            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-brand-navy border-b border-brand-grey pb-2">
                  Mon Espace Membre
                </Link>
                <Button variant="primary" onClick={handleSignOut} className="mt-2 bg-red-500 hover:bg-red-600 border-none">
                  Déconnexion
                </Button>
              </>
            ) : (
              <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                <Button variant="primary" className="w-full mt-2">
                  Connexion
                </Button>
              </Link>
            )}

            {/* Accès Administration direct pour le propriétaire */}
            <div className="pt-2 border-t border-brand-grey mt-2">
              <Link 
                to="/admin" 
                onClick={() => setIsMenuOpen(false)} 
                className="w-full flex items-center justify-between p-3.5 bg-brand-navy text-white rounded-2xl text-xs font-bold hover:bg-brand-navy/90 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={16} className="text-brand-green" />
                  <span>Espace Administration</span>
                </div>
                <span className="text-[10px] bg-brand-green text-white px-2 py-0.5 rounded-md uppercase font-black">
                  Propriétaire
                </span>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
