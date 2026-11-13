import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { 
  Mail, 
  Lock, 
  AlertCircle,
  Loader2,
  ChevronLeft,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export const ResetPassword = () => {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  useEffect(() => {
    // Check if we are in recovery mode (user clicked the link)
    // Supabase hash fragment usually contains type=recovery
    if (location.hash && location.hash.includes('type=recovery')) {
      setIsUpdateMode(true);
    }
  }, [location]);

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      setMessage("Un e-mail de récupération a été envoyé à votre adresse.");
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setMessage("Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter.");
    } catch (err: any) {
      setError(err.message || "Impossible de mettre à jour le mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-grey pt-32 pb-20 px-6 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Link to="/login" className="inline-flex items-center gap-2 text-brand-navy/40 hover:text-brand-green font-bold text-xs uppercase tracking-widest mb-10 transition-colors">
          <ChevronLeft size={16} />
          Retour à la connexion
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-brand-grey"
        >
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-brand-navy mb-4 uppercase tracking-tight text-balance">
              {isUpdateMode ? "Nouveau mot de passe" : "Accès perdu ?"}
            </h1>
            <p className="text-brand-navy/60">
              {isUpdateMode 
                ? "Définissez votre nouveau mot de passe sécurisé."
                : "Entrez votre e-mail pour recevoir un lien de récupération."}
            </p>
          </div>

          {message && (
            <div className="mb-8 p-6 bg-brand-green/10 border border-brand-green/20 rounded-2xl flex items-start gap-4 text-brand-green">
              <CheckCircle2 className="shrink-0 mt-1" size={20} />
              <p className="text-sm font-bold leading-relaxed">{message}</p>
            </div>
          )}

          {error && (
            <div className="mb-8 p-6 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4 text-red-800">
              <AlertCircle className="shrink-0 mt-1" size={20} />
              <p className="text-sm font-medium leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={isUpdateMode ? handleUpdatePassword : handleSendResetEmail} className="space-y-6">
            {!isUpdateMode ? (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-brand-navy/40 ml-1">Adresse E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/20" size={18} />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    className="w-full pl-12 pr-4 py-4 bg-brand-grey border-none rounded-2xl text-brand-navy focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-brand-navy/40 ml-1">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/20" size={18} />
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-brand-grey border-none rounded-2xl text-brand-navy focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !!(message && isUpdateMode)}
              variant="secondary"
              size="lg"
              className="w-full h-16 rounded-2xl text-base font-black uppercase tracking-widest shadow-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-3" size={20} />
                  Traitement...
                </>
              ) : (
                <>
                  {isUpdateMode ? "Mettre à jour" : "Envoyer le lien"}
                  <ArrowRight size={20} className="ml-3" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-10 pt-8 border-t border-brand-grey text-center">
            <p className="text-sm text-brand-navy/60 font-medium">
              Besoin d'aide ?{' '}
              <Link to="/contact" className="text-brand-green font-bold hover:underline ml-1">
                Contacter le support
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
