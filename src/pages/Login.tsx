import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { 
  Mail, 
  Lock, 
  AlertCircle,
  Loader2,
  ChevronLeft,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const { isConfigured, loginAsOwner } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConfigured) {
      setError("Supabase n'est pas encore configuré. Veuillez ajouter les clés API dans le fichier .env");
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (authError) throw authError;

      navigate('/dashboard'); // Redirect to dashboard after login
    } catch (err: any) {
      setError(err.message || "Identifiants incorrects ou erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-grey pt-32 pb-20 px-6 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Link to="/" className="inline-flex items-center gap-2 text-brand-navy/40 hover:text-brand-green font-bold text-xs uppercase tracking-widest mb-10 transition-colors">
          <ChevronLeft size={16} />
          Retour à l'accueil
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-brand-grey"
        >
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-brand-navy mb-4 uppercase tracking-tight text-balance">Content de vous revoir</h1>
            <p className="text-brand-navy/60">Connectez-vous à votre espace membre SANDRINO.</p>
          </div>

          {!isConfigured && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
              <AlertCircle className="text-amber-500 shrink-0 mt-1" size={20} />
              <div className="text-xs text-amber-800 leading-relaxed">
                <strong>Attention:</strong> Supabase n'est pas configuré. 
              </div>
            </div>
          )}

          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4">
              <AlertCircle className="text-red-500 shrink-0 mt-1" size={20} />
              <p className="text-xs text-red-800 leading-relaxed font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-brand-navy/40 ml-1">Adresse E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/20" size={18} />
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="exemple@email.com"
                  className="w-full pl-12 pr-4 py-4 bg-brand-grey border-none rounded-2xl text-brand-navy focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-black uppercase tracking-widest text-brand-navy/40">Mot de passe</label>
                <Link to="/reset-password" title="Récupérer mon accès" className="text-[10px] font-black uppercase tracking-wider text-brand-green hover:underline">
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/20" size={18} />
                <input
                  required
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-brand-grey border-none rounded-2xl text-brand-navy focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              size="lg"
              className="w-full h-16 rounded-2xl text-base font-black uppercase tracking-widest shadow-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-3" size={20} />
                  Connexion...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight size={20} className="ml-3" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-10 pt-8 border-t border-brand-grey text-center">
            <p className="text-sm text-brand-navy/60 font-medium text-balance">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-brand-green font-bold hover:underline ml-1">
                S'inscrire gratuitement
              </Link>
            </p>
          </div>

          {!isConfigured && (
            <div className="mt-6 p-4 bg-brand-navy rounded-2xl text-white text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-green block mb-1">
                Propriétaire du site
              </span>
              <p className="text-xs text-white/80 mb-3">
                Vous souhaitez vérifier l'espace d'administration ?
              </p>
              <button
                type="button"
                onClick={() => {
                  loginAsOwner();
                  navigate('/admin');
                }}
                className="w-full py-2.5 px-4 bg-brand-green text-white font-bold text-xs rounded-xl hover:bg-brand-green/90 transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck size={16} />
                Accéder à l'Administration (Pétit SANDRINO)
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
