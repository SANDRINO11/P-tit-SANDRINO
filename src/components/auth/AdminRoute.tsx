import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Loader2, ArrowLeft, KeyRound, Copy, Check } from 'lucide-react';
import { Button } from '../ui/Button';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, profile, loading, isConfigured, loginAsOwner } = useAuth();
  const location = useLocation();
  const [copied, setCopied] = React.useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-grey flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="animate-spin text-brand-green mb-4" size={36} />
        <p className="text-sm font-bold uppercase tracking-wider text-brand-navy/60">
          Vérification des autorisations administrateur...
        </p>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    // If Supabase is not yet configured with cloud credentials, allow the owner to unlock their space in preview mode
    if (!isConfigured) {
      return (
        <div className="min-h-screen bg-brand-grey pt-28 pb-20 px-4 sm:px-6 flex items-center justify-center">
          <div className="max-w-xl w-full bg-white rounded-[2.5rem] border border-brand-grey shadow-xl p-6 sm:p-10 text-center">
            <div className="h-16 w-16 rounded-full bg-brand-green/10 text-brand-green flex items-center justify-center mx-auto mb-6">
              <ShieldAlert size={32} />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest text-brand-green bg-brand-green/10 px-3 py-1 rounded-full inline-block mb-4">
              Espace Administration Privé
            </span>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-brand-navy uppercase tracking-tight mb-4 leading-tight break-words">
              Accès Propriétaire SANDRINO
            </h1>

            <p className="text-xs sm:text-sm text-brand-navy/70 leading-relaxed max-w-md mx-auto mb-8">
              Bienvenue dans la zone d'administration de SANDRINO. Vous pouvez accéder directement à la gestion des commandes, des déclarations de paiement, des produits et des membres avec votre compte propriétaire (<strong>petitsandrino1@gmail.com</strong>).
            </p>

            <div className="space-y-4">
              <Button
                onClick={() => loginAsOwner()}
                variant="secondary"
                size="lg"
                className="w-full h-14 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-green/20"
              >
                Ouvrir l'Espace Administrateur (Pétit SANDRINO)
              </Button>

              <Link to="/">
                <Button variant="outline" size="sm" className="w-full rounded-xl text-xs font-bold text-brand-navy/70">
                  <ArrowLeft size={14} className="mr-2" />
                  Retour à l'accueil du site
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in, but NOT admin -> Show explicit secure denial screen with promotion procedure for owner
  if (profile?.role !== 'admin') {
    const sqlSnippet = `UPDATE public.profiles \nSET role = 'admin' \nWHERE email = '${user.email}';`;

    const handleCopy = () => {
      navigator.clipboard.writeText(sqlSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    };

    return (
      <div className="min-h-screen bg-brand-grey pt-28 pb-20 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-[2.5rem] border border-brand-grey shadow-xl p-6 sm:p-10 text-center">
          <div className="h-16 w-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-6 border border-red-100">
            <ShieldAlert size={32} />
          </div>

          <span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full inline-block mb-4">
            Zone d'Administration Sécurisée
          </span>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-brand-navy uppercase tracking-tight mb-4 leading-tight break-words">
            Accès Réservé aux Administrateurs
          </h1>

          <p className="text-xs sm:text-sm text-brand-navy/70 leading-relaxed max-w-lg mx-auto mb-8">
            Vous êtes connecté avec l'adresse <strong>{user.email}</strong>, mais ce compte possède le rôle <strong>« {profile?.role || 'membre'} »</strong>. Conformément aux règles de sécurité de SANDRINO, seuls les comptes disposant du rôle <strong>« administrateur »</strong> certifié en base de données peuvent accéder à cet espace.
          </p>

          {/* Procedure for the owner to assign admin role in Supabase */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-left mb-8">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-brand-navy uppercase tracking-wider">
              <KeyRound size={16} className="text-brand-green" />
              Procédure d'attribution pour le propriétaire (Pétit SANDRINO)
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Pour des raisons absolues de sécurité, aucun utilisateur ne peut s'auto-attribuer le rôle administrateur depuis l'interface web. Pour activer votre statut, exécutez la commande SQL suivante dans votre console Supabase (SQL Editor) :
            </p>

            <div className="relative">
              <pre className="p-3 bg-brand-navy text-brand-green font-mono text-xs rounded-xl overflow-x-auto leading-relaxed">
                {sqlSnippet}
              </pre>
              <button
                type="button"
                onClick={handleCopy}
                className="absolute top-2 right-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
              >
                {copied ? <Check size={12} className="text-brand-green" /> : <Copy size={12} />}
                {copied ? 'Copié' : 'Copier'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Une fois la commande exécutée, déconnectez-vous puis reconnectez-vous pour actualiser vos droits.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dashboard">
              <Button variant="secondary" size="md" className="w-full sm:w-auto rounded-xl text-xs font-bold">
                <ArrowLeft size={16} className="mr-2" />
                Retourner à mon espace membre
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="md" className="w-full sm:w-auto rounded-xl text-xs font-bold">
                Retour à l'accueil
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // User is confirmed admin
  return <>{children}</>;
};
