import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { 
  supportService, 
  SupportTicket, 
  SupportMessage, 
  SupportCategory, 
  SUPPORT_CATEGORIES, 
  CommunicationSettings,
  DEFAULT_COMMUNICATION_SETTINGS 
} from '../../lib/supportService';
import { Order } from '../../data/member';
import { Button } from '../ui/Button';
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ChevronRight, 
  User, 
  ShieldCheck, 
  Phone, 
  ExternalLink, 
  Loader2, 
  ArrowLeft,
  Lock,
  MessageCircle,
  HelpCircle,
  ShoppingBag,
  Info
} from 'lucide-react';

interface MemberSupportViewProps {
  orders: Order[];
  initialTicketId?: string | null;
}

export const MemberSupportView: React.FC<MemberSupportViewProps> = ({ orders, initialTicketId }) => {
  const { user, profile } = useAuth();

  // Tickets list & selected ticket
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportMessage[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // New ticket modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCategory, setNewCategory] = useState<SupportCategory>('Question sur un produit');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newOrderId, setNewOrderId] = useState('');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Settings
  const [settings, setSettings] = useState<CommunicationSettings>(DEFAULT_COMMUNICATION_SETTINGS);

  // Load member tickets & settings
  const loadTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    try {
      const [userTickets, commSettings] = await Promise.all([
        supportService.getMemberTickets(user.id, user.email || undefined),
        supportService.getSettings()
      ]);
      setTickets(userTickets);
      setSettings(commSettings);

      // If initial ticket requested or already selected, refresh it
      if (initialTicketId) {
        const found = userTickets.find(t => t.id === initialTicketId || t.ticketNumber === initialTicketId);
        if (found) {
          handleSelectTicket(found);
        }
      }
    } catch (err) {
      console.error('Error loading member tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [user]);

  // Load messages when a ticket is opened
  const handleSelectTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setLoadingMessages(true);
    setReplyError(null);
    try {
      const msgs = await supportService.getTicketMessages(ticket.id);
      setTicketMessages(msgs);
    } catch (err) {
      console.error('Error fetching ticket messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Submit new ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreateError(null);

    if (!newSubject.trim()) {
      setCreateError('Veuillez préciser le sujet de votre demande.');
      return;
    }
    if (!newMessage.trim() || newMessage.trim().length < 8) {
      setCreateError('Veuillez détailler votre message.');
      return;
    }

    setIsCreatingTicket(true);
    try {
      const res = await supportService.createTicket({
        senderName: profile?.full_name || user.email?.split('@')[0] || 'Membre',
        senderEmail: user.email || 'petitsandrino1@gmail.com',
        senderPhone: profile?.phone || undefined,
        category: newCategory,
        subject: newSubject,
        message: newMessage,
        orderId: newOrderId || undefined,
        userId: user.id
      });

      setShowNewModal(false);
      setNewSubject('');
      setNewMessage('');
      setNewOrderId('');
      await loadTickets();
      handleSelectTicket(res.ticket);
    } catch (err: any) {
      setCreateError(err.message || 'Impossible de créer la demande.');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  // Submit reply in conversation
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim() || !user) return;

    setIsSendingReply(true);
    setReplyError(null);

    try {
      const msg = await supportService.replyToTicket({
        ticketId: selectedTicket.id,
        ticketNumber: selectedTicket.ticketNumber,
        senderRole: 'member',
        senderName: profile?.full_name || 'Vous',
        senderId: user.id,
        message: replyText.trim(),
        targetUserId: selectedTicket.userId,
        ticketSubject: selectedTicket.subject
      });

      setTicketMessages([...ticketMessages, msg]);
      setReplyText('');
      
      // Update local ticket status to in_progress
      setSelectedTicket({
        ...selectedTicket,
        status: 'in_progress',
        updatedAt: msg.createdAt,
        lastReplyAt: msg.createdAt,
        lastReplyBy: 'member'
      });

      // Update in main list
      setTickets(tickets.map(t => 
        t.id === selectedTicket.id 
          ? { ...t, status: 'in_progress', updatedAt: msg.createdAt } 
          : t
      ));
    } catch (err: any) {
      setReplyError(err.message || "Erreur lors de l'envoi de votre réponse.");
    } finally {
      setIsSendingReply(false);
    }
  };

  const renderStatusBadge = (status: SupportTicket['status']) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock size={12} />
            Nouvelle demande
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <Clock size={12} />
            En cours de traitement
          </span>
        );
      case 'answered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
            <CheckCircle2 size={12} />
            Répondue
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <Lock size={12} />
            Fermée
          </span>
        );
      default:
        return null;
    }
  };

  const getCleanWhatsAppLink = () => {
    const rawNumber = settings.whatsappNumber.replace(/[^0-9]/g, '');
    const defaultText = encodeURIComponent(
      `Bonjour SANDRINO, je suis ${profile?.full_name || 'un membre'} et j'ai besoin d'une assistance.`
    );
    return `https://wa.me/${rawNumber}?text=${defaultText}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Fast Actions */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-grey shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck size={14} />
            Support Membre Dédié
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy uppercase tracking-tight">
            Assistance et Demandes
          </h2>
          <p className="text-xs sm:text-sm text-brand-navy/60 mt-1 max-w-xl">
            Créez une demande pour une commande, un abonnement ou un produit. Suivez les réponses et échangez directement avec notre équipe.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {settings.whatsappEnabled && settings.whatsappNumber.trim() && (
            <a
              href={getCleanWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-[#20be5c] transition-all shadow-sm"
            >
              <Phone size={14} />
              WhatsApp Direct
              <ExternalLink size={12} />
            </a>
          )}

          <Button
            onClick={() => {
              setShowNewModal(true);
              setCreateError(null);
            }}
            variant="primary"
            size="sm"
            className="rounded-xl text-xs font-bold"
          >
            <Plus size={14} className="mr-1.5" />
            Nouvelle demande
          </Button>
        </div>
      </div>

      {/* Main View: Split or Full Screen Ticket View */}
      {selectedTicket ? (
        /* Conversation Detail View */
        <div className="bg-white rounded-3xl border border-brand-grey shadow-sm overflow-hidden">
          {/* Header of Ticket */}
          <div className="p-6 bg-brand-grey/50 border-b border-brand-grey flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <button
                onClick={() => {
                  setSelectedTicket(null);
                  loadTickets();
                }}
                className="p-2 rounded-xl bg-white border border-brand-grey text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
                title="Retour aux demandes"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-xs font-bold text-brand-navy/50">
                    {selectedTicket.ticketNumber}
                  </span>
                  {renderStatusBadge(selectedTicket.status)}
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-white border border-brand-grey text-brand-navy/70 font-medium">
                    {selectedTicket.category}
                  </span>
                  {selectedTicket.orderId && (
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-brand-navy/5 text-brand-navy font-mono">
                      Commande #{selectedTicket.orderId}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-brand-navy mt-1">
                  {selectedTicket.subject}
                </h3>
                <p className="text-[11px] text-brand-navy/50">
                  Ouverte le {new Date(selectedTicket.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedTicket(null);
                loadTickets();
              }}
              className="text-xs font-bold text-brand-navy/60 hover:text-brand-navy self-end sm:self-auto"
            >
              Fermer la vue
            </button>
          </div>

          {/* Messages Thread */}
          <div className="p-6 sm:p-8 space-y-6 max-h-[500px] overflow-y-auto bg-brand-white/40">
            {loadingMessages ? (
              <div className="text-center py-12">
                <Loader2 size={24} className="animate-spin text-brand-green mx-auto mb-2" />
                <p className="text-xs text-brand-navy/60">Chargement de la conversation...</p>
              </div>
            ) : ticketMessages.length === 0 ? (
              <div className="text-center py-8 text-xs text-brand-navy/50">
                Aucun message dans cette conversation.
              </div>
            ) : (
              ticketMessages.map((msg) => {
                const isAdmin = msg.senderRole === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[11px]">
                      {isAdmin ? (
                        <>
                          <span className="inline-flex items-center gap-1 font-bold text-brand-green">
                            <ShieldCheck size={13} />
                            Administration SANDRINO
                          </span>
                          <span className="text-brand-navy/40">
                            {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-brand-navy/40">
                            {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="font-bold text-brand-navy">
                            Vous ({profile?.full_name || 'Membre'})
                          </span>
                        </>
                      )}
                    </div>

                    <div
                      className={`max-w-2xl p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                        isAdmin
                          ? 'bg-[#0B1730] text-white rounded-tl-sm shadow-sm'
                          : 'bg-white border border-brand-grey text-brand-navy rounded-tr-sm shadow-sm'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply Form */}
          <div className="p-6 bg-white border-t border-brand-grey">
            {selectedTicket.status === 'closed' ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-slate-400" />
                  <span>Cette demande est actuellement fermée. Vous pouvez créer une nouvelle demande si vous avez un autre besoin.</span>
                </div>
                <Button
                  onClick={() => setShowNewModal(true)}
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs whitespace-nowrap"
                >
                  Nouvelle demande
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSendReply} className="space-y-3">
                {replyError && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{replyError}</span>
                  </div>
                )}
                <div>
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Écrivez votre réponse ou apportez une précision à l'équipe SANDRINO..."
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-brand-grey border border-brand-grey text-xs sm:text-sm text-brand-navy focus:bg-white focus:border-brand-green focus:outline-none transition-all resize-y"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-brand-navy/50">
                    Votre message sera directement notifié à l'administration.
                  </p>
                  <Button
                    type="submit"
                    disabled={isSendingReply || !replyText.trim()}
                    variant="primary"
                    size="sm"
                    className="rounded-xl text-xs font-bold"
                  >
                    {isSendingReply ? (
                      <>
                        <Loader2 size={14} className="animate-spin mr-1.5" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send size={14} className="mr-1.5" />
                        Envoyer ma réponse
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* Tickets List View */
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-grey shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-brand-navy uppercase tracking-wider">
              Mes Demandes d'Assistance ({tickets.length})
            </h3>
            <span className="text-xs text-brand-navy/50">
              Réservé à votre compte
            </span>
          </div>

          {loadingTickets ? (
            <div className="text-center py-16">
              <Loader2 size={28} className="animate-spin text-brand-green mx-auto mb-2" />
              <p className="text-xs text-brand-navy/60">Chargement de vos demandes...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16 px-4 border border-dashed border-brand-grey rounded-2xl bg-brand-grey/20">
              <HelpCircle size={36} className="text-brand-navy/30 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-brand-navy mb-1">
                Aucune demande d'assistance en cours
              </h4>
              <p className="text-xs text-brand-navy/60 max-w-md mx-auto mb-6">
                Vous n'avez pas encore créé de demande. Si vous avez une question sur une commande, un abonnement ou un produit, contactez-nous facilement.
              </p>
              <Button
                onClick={() => setShowNewModal(true)}
                variant="primary"
                size="sm"
                className="rounded-xl text-xs font-bold"
              >
                <Plus size={14} className="mr-1.5" />
                Créer ma première demande
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-brand-grey">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket)}
                  className="py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-brand-grey/40 px-3 -mx-3 rounded-2xl transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-brand-grey flex items-center justify-center text-brand-navy group-hover:bg-brand-green group-hover:text-white transition-colors shrink-0 mt-0.5">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-[11px] font-bold text-brand-navy/60">
                          {ticket.ticketNumber}
                        </span>
                        {renderStatusBadge(ticket.status)}
                        <span className="text-[11px] text-brand-navy/50">
                          • {ticket.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-brand-navy group-hover:text-brand-green transition-colors">
                        {ticket.subject}
                      </h4>
                      <p className="text-[11px] text-brand-navy/50 mt-1">
                        Mis à jour le {new Date(ticket.updatedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="text-xs font-bold text-brand-green group-hover:underline inline-flex items-center gap-1">
                      Consulter les réponses
                      <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: NEW SUPPORT TICKET */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-brand-grey max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-brand-grey mb-6">
                <div>
                  <h3 className="text-lg font-black uppercase text-brand-navy tracking-tight">
                    Nouvelle demande d'assistance
                  </h3>
                  <p className="text-xs text-brand-navy/60 mt-0.5">
                    Un conseiller SANDRINO vous répondra personnellement.
                  </p>
                </div>
                <button
                  onClick={() => setShowNewModal(false)}
                  className="p-2 text-brand-navy/40 hover:text-brand-navy rounded-xl hover:bg-brand-grey transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {createError && (
                <div className="p-4 rounded-2xl bg-red-50 text-red-700 text-xs flex items-center gap-2 mb-4">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy/70 mb-1.5">
                    Catégorie de la demande <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as SupportCategory)}
                    className="w-full px-4 py-3 rounded-2xl bg-brand-grey border border-brand-grey text-xs sm:text-sm text-brand-navy focus:bg-white focus:border-brand-green focus:outline-none transition-all"
                  >
                    {(settings.categories?.length ? settings.categories : SUPPORT_CATEGORIES).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {orders.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy/70 mb-1.5">
                      Commande concernée (optionnel)
                    </label>
                    <select
                      value={newOrderId}
                      onChange={(e) => setNewOrderId(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-brand-grey border border-brand-grey text-xs sm:text-sm text-brand-navy focus:bg-white focus:border-brand-green focus:outline-none transition-all"
                    >
                      <option value="">-- Aucune commande spécifique --</option>
                      {orders.map((ord) => (
                        <option key={ord.id} value={ord.orderNumber}>
                          {ord.orderNumber} ({ord.totalAmount.toLocaleString('fr-FR')} FCFA) - {ord.paymentStatus}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy/70 mb-1.5">
                    Sujet de votre demande <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Ex: Problème de téléchargement ou question sur ma commande"
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-brand-grey border border-brand-grey text-xs sm:text-sm text-brand-navy focus:bg-white focus:border-brand-green focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy/70 mb-1.5">
                    Votre message détaillé <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Décrivez précisément votre situation..."
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-brand-grey border border-brand-grey text-xs sm:text-sm text-brand-navy focus:bg-white focus:border-brand-green focus:outline-none transition-all resize-y"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-brand-navy/70 hover:bg-brand-grey transition-colors"
                  >
                    Annuler
                  </button>
                  <Button
                    type="submit"
                    disabled={isCreatingTicket}
                    variant="primary"
                    size="sm"
                    className="rounded-xl text-xs font-bold"
                  >
                    {isCreatingTicket ? (
                      <>
                        <Loader2 size={14} className="animate-spin mr-1.5" />
                        Envoi de la demande...
                      </>
                    ) : (
                      <>
                        <Send size={14} className="mr-1.5" />
                        Transmettre la demande
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
