import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { 
  supportService, 
  SUPPORT_CATEGORIES, 
  SupportCategory, 
  CommunicationSettings,
  DEFAULT_COMMUNICATION_SETTINGS 
} from '../lib/supportService';
import { Button } from '../components/ui/Button';
import { 
  Mail, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Phone, 
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Loader2
} from 'lucide-react';

export const Contact = () => {
  const { user, profile } = useAuth();

  // Form state
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [category, setCategory] = useState<SupportCategory>('Question sur un produit');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Status & communication settings
  const [settings, setSettings] = useState<CommunicationSettings>(DEFAULT_COMMUNICATION_SETTINGS);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedTicketNumber, setSubmittedTicketNumber] = useState<string | null>(null);

  // Load communication settings (WhatsApp number, etc.)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const commSettings = await supportService.getSettings();
        setSettings(commSettings);
      } catch (e) {
        console.warn('Using default communication settings:', e);
      }
    };
    loadSettings();
  }, []);

  // Pre-fill user profile if logged in
  useEffect(() => {
    if (profile?.full_name && !fullName) {
      setFullName(profile.full_name);
    }
    if (user?.email && !email) {
      setEmail(user.email);
    }
    if (profile?.phone && !phone) {
      setPhone(profile.phone);
    }
  }, [profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!fullName.trim()) {
      setErrorMsg('Veuillez renseigner votre nom complet.');
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Veuillez renseigner une adresse e-mail valide pour que nous puissions vous répondre.');
      return;
    }

    if (!subject.trim()) {
      setErrorMsg('Veuillez préciser le sujet de votre demande.');
      return;
    }

    if (!message.trim() || message.trim().length < 10) {
      setErrorMsg('Veuillez détailler votre message (au moins 10 caractères).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await supportService.createTicket({
        senderName: fullName,
        senderEmail: email,
        senderPhone: phone || undefined,
        category,
        subject,
        message,
        userId: user?.id || null
      });

      setSubmittedTicketNumber(res.ticket.ticketNumber);
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur est survenue lors de l'enregistrement de votre demande.");
    } finally {
      setSubmitting(false);
    }
  };

  const getCleanWhatsAppLink = () => {
    const rawNumber = settings.whatsappNumber.replace(/[^0-9]/g, '');
    const defaultText = encodeURIComponent(
      `Bonjour SANDRINO, je vous contacte depuis le site officiel pour une demande d'information.`
    );
    return `https://wa.me/${rawNumber}?text=${defaultText}`;
  };

  return (
    <div className="min-h-screen bg-brand-white pt-12 pb-24 text-brand-navy">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-grey text-brand-navy text-xs font-bold uppercase tracking-wider mb-4 border border-brand-grey">
            <MessageSquare size={14} className="text-brand-green" />
            Centre de communication
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-brand-navy">
            CONTACTEZ SANDRINO
          </h1>
          <p className="text-base sm:text-lg text-brand-navy/70 mt-3 leading-relaxed">
            Une question, une demande ou besoin d'informations ? Contactez-nous et nous vous répondrons dès que possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Contact Form (8 cols on large) */}
          <div className="lg:col-span-7">
            <div className="bg-white p-8 sm:p-10 rounded-3xl border border-brand-grey shadow-sm">
              <h2 className="text-xl font-bold uppercase tracking-tight text-brand-navy mb-2">
                Envoyer une demande écrite
              </h2>
              <p className="text-xs text-brand-navy/60 mb-8">
                Toutes les demandes sont traitées personnellement par l'administration SANDRINO.
              </p>

              {submittedTicketNumber ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 size={36} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-950">
                      Demande enregistrée avec succès
                    </h3>
                    <p className="text-sm text-emerald-800 font-medium mt-1">
                      « Votre demande a bien été envoyée. Nous vous répondrons dès que possible. »
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-emerald-200 inline-block text-left text-xs text-brand-navy max-w-md w-full">
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-2 mb-2">
                      <span className="text-brand-navy/60 font-medium">Référence dossier :</span>
                      <strong className="text-brand-navy font-mono text-sm">{submittedTicketNumber}</strong>
                    </div>
                    <p className="text-[11px] text-brand-navy/70">
                      {user ? (
                        <>Vous pouvez suivre les réponses et l'avancement de votre dossier directement dans la rubrique <strong>Assistance</strong> de votre espace personnel.</>
                      ) : (
                        <>Conservez cette référence. Une réponse sera apportée à l'adresse <strong>{email}</strong> dans les meilleurs délais.</>
                      )}
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setSubmittedTicketNumber(null)}
                      className="text-xs font-bold text-brand-green hover:underline"
                    >
                      Envoyer un autre message
                    </button>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {errorMsg && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy/70 mb-2">
                        Nom complet <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ex: Koffi Mensah"
                        required
                        className="w-full px-4 py-3 rounded-2xl bg-brand-grey border border-brand-grey text-sm text-brand-navy focus:bg-white focus:border-brand-green focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy/70 mb-2">
                        Adresse e-mail <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Ex: exemple@email.com"
                        required
                        className="w-full px-4 py-3 rounded-2xl bg-brand-grey border border-brand-grey text-sm text-brand-navy focus:bg-white focus:border-brand-green focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy/70 mb-2">
                        Numéro de téléphone (optionnel)
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ex: +228 90 00 00 00"
                        className="w-full px-4 py-3 rounded-2xl bg-brand-grey border border-brand-grey text-sm text-brand-navy focus:bg-white focus:border-brand-green focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy/70 mb-2">
                        Catégorie de la demande <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as SupportCategory)}
                        className="w-full px-4 py-3 rounded-2xl bg-brand-grey border border-brand-grey text-sm text-brand-navy focus:bg-white focus:border-brand-green focus:outline-none transition-all"
                      >
                        {(settings.categories?.length ? settings.categories : SUPPORT_CATEGORIES).map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy/70 mb-2">
                      Sujet de votre demande <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Ex: Question concernant la formule Essentiel ou un guide PDF"
                      required
                      className="w-full px-4 py-3 rounded-2xl bg-brand-grey border border-brand-grey text-sm text-brand-navy focus:bg-white focus:border-brand-green focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy/70 mb-2">
                      Votre message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Décrivez précisément votre demande ou la question que vous souhaitez poser..."
                      required
                      className="w-full px-4 py-3 rounded-2xl bg-brand-grey border border-brand-grey text-sm text-brand-navy focus:bg-white focus:border-brand-green focus:outline-none transition-all resize-y"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    variant="primary"
                    size="lg"
                    className="w-full rounded-2xl font-black text-sm uppercase tracking-wider"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" />
                        Enregistrement de votre demande...
                      </>
                    ) : (
                      <>
                        <Send size={16} className="mr-2" />
                        Envoyer ma demande
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Sidebar Info & WhatsApp Fast Contact (5 cols on large) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* WhatsApp Contact Box */}
            <div className="bg-gradient-to-br from-[#0B1730] to-[#122347] text-white p-8 rounded-3xl shadow-sm border border-brand-navy/50 relative overflow-hidden">
              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Contact direct & instantané
                </div>

                <h3 className="text-2xl font-black uppercase tracking-tight text-white">
                  Échangez directement sur WhatsApp
                </h3>

                <p className="text-xs text-brand-grey/80 leading-relaxed">
                  Pour une réponse rapide concernant vos questions d'adhésion, vos paiements T-Money ou Moov Money, échangez directement avec notre conseiller.
                </p>

                {settings.whatsappEnabled && settings.whatsappNumber.trim() ? (
                  <>
                    <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 space-y-1">
                      <div className="text-[11px] text-brand-grey/60 uppercase font-black tracking-wider">
                        Numéro officiel configuré
                      </div>
                      <div className="text-lg font-mono font-bold text-brand-green">
                        {settings.whatsappNumber}
                      </div>
                    </div>

                    <a
                      href={getCleanWhatsAppLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <button className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-[#25D366] text-white font-black text-xs uppercase tracking-wider hover:bg-[#20be5c] transition-all shadow-md">
                        <Phone size={16} />
                        NOUS CONTACTER SUR WHATSAPP
                        <ExternalLink size={14} />
                      </button>
                    </a>
                  </>
                ) : (
                  <div className="p-4 bg-white/10 rounded-2xl text-xs text-brand-grey/70 text-center">
                    Le canal WhatsApp n'est pas actif pour le moment. Veuillez utiliser le formulaire écrit ci-contre ou écrire à {settings.supportEmail}.
                  </div>
                )}
              </div>
            </div>

            {/* Practical commitments */}
            <div className="bg-white p-8 rounded-3xl border border-brand-grey shadow-sm space-y-6">
              <h4 className="text-sm font-bold uppercase tracking-wider text-brand-navy">
                Nos engagements de service
              </h4>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0 mt-0.5">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-brand-navy">Délai de réponse moyen</h5>
                    <p className="text-xs text-brand-navy/60 mt-0.5">
                      Prise en charge sous 24h ouvrées pour les demandes écrites.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-navy/10 text-brand-navy flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-brand-navy">Confidentialité totale</h5>
                    <p className="text-xs text-brand-navy/60 mt-0.5">
                      Vos échanges sont strictement privés et protégés.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0 mt-0.5">
                    <Mail size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-brand-navy">E-mail de contact</h5>
                    <p className="text-xs text-brand-navy/60 mt-0.5 font-mono">
                      {settings.supportEmail}
                    </p>
                  </div>
                </div>
              </div>

              {user && (
                <div className="pt-4 border-t border-brand-grey">
                  <div className="p-4 rounded-2xl bg-brand-grey text-xs space-y-2">
                    <div className="font-bold text-brand-navy">Déjà membre de SANDRINO ?</div>
                    <p className="text-brand-navy/70 leading-relaxed">
                      Accédez à votre historique d'échanges et discutez en direct avec l'administration depuis votre espace personnel.
                    </p>
                    <a
                      href="/dashboard"
                      className="inline-flex items-center gap-1.5 font-bold text-brand-green hover:underline mt-1"
                    >
                      Ouvrir mon espace assistance
                      <ChevronRight size={14} />
                    </a>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
