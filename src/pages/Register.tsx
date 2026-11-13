import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ChevronLeft
} from 'lucide-react';

export const Register = () => {
  const navigate = useNavigate();
  const { isConfigured } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConfigured) {
      setError("Supabase n'est pas encore configuré. Veuillez ajouter les clés API dans le fichier .env");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (!formData.acceptTerms) {
      setError("Vous devez accepter les conditions d'utilisation.");
      return;
    }

    setLoading(true);

    try {
      // 1. Sign up user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create profile record (Note: Trigger or direct insert depending on your DB setup)
        // Usually, a trigger in Supabase handles this, but we'll do it manually here 
        // to ensure it works if the trigger isn't set up yet.
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              full_name: formData.fullName,
              email: formData.email,
              phone: formData.phone,
              role: 'member',
              status: 'active'
            }
          ]);

        if (profileError && profileError.code !== '23505') { // Ignore duplicate key if trigger already ran
           console.error('Profile creation error:', profileError);
        }
      }

      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-brand-grey flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl text-center border border-brand-green/20"
        >
          <div className="h-20 w-20 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={40} className="text-brand-green" />
          </div>
          <h2 className="text-2xl font-black text-brand-navy mb-4 uppercase">Compte créé !</h2>
          <p className="text-brand-navy/60 leading-relaxed mb-8">
            Votre compte a été créé avec succès. Un e-mail de confirmation vous a été envoyé. 
            Vous allez être redirigé vers la page de connexion.
          </p>
          <Loader2 className="animate-spin text-brand-green mx-auto" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-grey pt-32 pb-20 px-6">
      <div className="mx-auto max-w-xl">
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
            <h1 className="text-3xl font-black text-brand-navy mb-4 uppercase tracking-tight">Rejoindre SANDRINO</h1>
            <p className="text-brand-navy/60">Créez votre compte membre en quelques secondes.</p>
          </div>

          {!isConfigured && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
              <AlertCircle className="text-amber-500 shrink-0 mt-1" size={20} />
              <div className="text-xs text-amber-800 leading-relaxed">
                <strong>Attention:</strong> Supabase n'est pas configuré. 
                Veuillez ajouter <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code> dans votre fichier <code>.env</code>.
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
            <div className="grid grid-cols-1 gap-6">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-brand-navy/40 ml-1">Nom Complet</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/20" size={18} />
                  <input
                    required
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Ex: Pétit Sandrino"
                    className="w-full pl-12 pr-4 py-4 bg-brand-grey border-none rounded-2xl text-brand-navy focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email */}
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

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-brand-navy/40 ml-1">Numéro de téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/20" size={18} />
                  <input
                    required
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+225 0102030405"
                    className="w-full pl-12 pr-4 py-4 bg-brand-grey border-none rounded-2xl text-brand-navy focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-brand-navy/40 ml-1">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/20" size={18} />
                  <input
                    required
                    minLength={6}
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-brand-grey border-none rounded-2xl text-brand-navy focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-brand-navy/40 ml-1">Confirmer</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/20" size={18} />
                  <input
                    required
                    minLength={6}
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-brand-grey border-none rounded-2xl text-brand-navy focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 py-2">
              <input
                required
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                id="acceptTerms"
                className="mt-1 h-4 w-4 rounded border-brand-grey text-brand-green focus:ring-brand-green"
              />
              <label htmlFor="acceptTerms" className="text-xs text-brand-navy/60 leading-relaxed">
                J'accepte les <Link to="/legal#conditions" className="text-brand-green font-bold hover:underline">Conditions d'utilisation</Link> et la <Link to="/legal#confidentialite" className="text-brand-green font-bold hover:underline">Politique de confidentialité</Link>.
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              variant="secondary"
              size="lg"
              className="w-full h-16 rounded-2xl text-base font-black uppercase tracking-widest shadow-xl shadow-brand-green/20"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-3" size={20} />
                  Création...
                </>
              ) : "Créer mon compte"}
            </Button>
          </form>

          <div className="mt-10 pt-8 border-t border-brand-grey text-center">
            <p className="text-sm text-brand-navy/60 font-medium">
              Déjà membre ?{' '}
              <Link to="/login" className="text-brand-green font-bold hover:underline ml-1">
                Se connecter
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
