import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { 
  supportService, 
  SupportTicket, 
  SupportMessage, 
  TicketStatus, 
  SupportCategory, 
  SUPPORT_CATEGORIES, 
  CommunicationSettings,
  DEFAULT_COMMUNICATION_SETTINGS 
} from '../../lib/supportService';
import { adminService } from '../../lib/adminService';
import { Button } from '../ui/Button';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  X, 
  Send, 
  Phone, 
  Mail, 
  User, 
  ShieldCheck, 
  Loader2, 
  ChevronRight, 
  Save, 
  Settings, 
  MessageCircle, 
  HelpCircle,
  ExternalLink,
  Tag,
  Check,
  RefreshCw
} from 'lucide-react';

export const AdminSupportView: React.FC = () => {
  const { user, profile } = useAuth();

  // State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Reply form
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Communication Settings
  const [settings, setSettings] = useState<CommunicationSettings>(DEFAULT_COMMUNICATION_SETTINGS);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [tempWhatsapp, setTempWhatsapp] = useState(DEFAULT_COMMUNICATION_SETTINGS.whatsappNumber);
  const [tempEmail, setTempEmail] = useState(DEFAULT_COMMUNICATION_SETTINGS.supportEmail);
  const [tempWhatsappEnabled, setTempWhatsappEnabled] = useState(DEFAULT_COMMUNICATION_SETTINGS.whatsappEnabled);
  const [tempCategories, setTempCategories] = useState<string[]>(DEFAULT_COMMUNICATION_SETTINGS.categories);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [allTickets, commSettings] = await Promise.all([
        supportService.getAllTickets(),
        supportService.getSettings()
      ]);
      setTickets(allTickets);
      setSettings(commSettings);
      setTempWhatsapp(commSettings.whatsappNumber);
      setTempEmail(commSettings.supportEmail);
      setTempWhatsappEnabled(commSettings.whatsappEnabled);
      setTempCategories(commSettings.categories?.length ? commSettings.categories : SUPPORT_CATEGORIES);

      if (selectedTicket) {
        const updatedSelected = allTickets.find(t => t.id === selectedTicket.id);
        if (updatedSelected) {
          setSelectedTicket(updatedSelected);
        }
      }
    } catch (err) {
      console.error('Error loading admin support data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Flash message dismiss
  useEffect(() => {
    if (actionSuccess) {
      const t = setTimeout(() => setActionSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [actionSuccess]);

  // Open ticket details & fetch conversation
  const handleSelectTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setLoadingMessages(true);
    setActionError(null);
    try {
      const msgs = await supportService.getTicketMessages(ticket.id);
      setTicketMessages(msgs);
    } catch (err) {
      console.error('Error loading ticket conversation:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Submit admin reply
  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim() || !user) return;

    setIsSendingReply(true);
    setActionError(null);

    try {
      const adminName = profile?.full_name || 'Administration SANDRINO';
      const msg = await supportService.replyToTicket({
        ticketId: selectedTicket.id,
        ticketNumber: selectedTicket.ticketNumber,
        senderRole: 'admin',
        senderName: adminName,
        senderId: user.id,
        message: replyText.trim(),
        targetUserId: selectedTicket.userId,
        ticketSubject: selectedTicket.subject
      });

      // Audit log
      adminService.logAudit({
        action: `Réponse au ticket ${selectedTicket.ticketNumber}`,
        target_type: 'support_ticket',
        target_id: selectedTicket.id,
        admin_id: user.id,
        admin_email: user.email || 'admin',
        details: { ticketNumber: selectedTicket.ticketNumber, subject: selectedTicket.subject }
      });

      setTicketMessages([...ticketMessages, msg]);
      setReplyText('');
      setActionSuccess(`Réponse transmise avec succès au destinataire (${selectedTicket.senderEmail}). Notification créée.`);

      // Update local state
      const updatedTicket: SupportTicket = {
        ...selectedTicket,
        status: 'answered',
        updatedAt: msg.createdAt,
        lastReplyAt: msg.createdAt,
        lastReplyBy: 'admin'
      };
      setSelectedTicket(updatedTicket);
      setTickets(tickets.map(t => t.id === selectedTicket.id ? updatedTicket : t));
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de l'enregistrement de la réponse.");
    } finally {
      setIsSendingReply(false);
    }
  };

  // Update status
  const handleChangeStatus = async (newStatus: TicketStatus) => {
    if (!selectedTicket || !user) return;

    try {
      await supportService.updateTicketStatus(selectedTicket.id, newStatus, {
        id: user.id,
        email: user.email || 'admin'
      });

      adminService.logAudit({
        action: `Statut ticket ${selectedTicket.ticketNumber} changé à ${newStatus}`,
        target_type: 'support_ticket',
        target_id: selectedTicket.id,
        admin_id: user.id,
        admin_email: user.email || 'admin',
        details: { newStatus }
      });

      const updated = { ...selectedTicket, status: newStatus, updatedAt: new Date().toISOString() };
      setSelectedTicket(updated);
      setTickets(tickets.map(t => t.id === selectedTicket.id ? updated : t));
      setActionSuccess(`Statut du ticket mis à jour : "${newStatus}".`);
    } catch (err: any) {
      alert(`Erreur lors de la mise à jour : ${err.message}`);
    }
  };

  // Save Communication Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingSettings(true);
    try {
      const cleanCategories = tempCategories.map(c => c.trim()).filter(Boolean);
      const updated = await supportService.updateSettings({
        whatsappNumber: tempWhatsapp.trim(),
        whatsappEnabled: tempWhatsappEnabled,
        supportEmail: tempEmail.trim() || 'petitsandrino1@gmail.com',
        categories: cleanCategories.length > 0 ? cleanCategories : SUPPORT_CATEGORIES
      }, {
        id: user.id,
        email: user.email || 'petitsandrino1@gmail.com'
      });

      setSettings(updated);
      setShowSettingsModal(false);
      setActionSuccess('Paramètres de communication enregistrés avec succès.');
    } catch (err: any) {
      alert(`Erreur d'enregistrement : ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (!tempCategories.includes(trimmed)) {
      setTempCategories([...tempCategories, trimmed]);
    }
    setNewCategoryInput('');
  };

  const handleRemoveCategory = (catToRemove: string) => {
    if (tempCategories.length <= 1) return;
    setTempCategories(tempCategories.filter(c => c !== catToRemove));
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesSearch = 
        t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.senderEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.orderId && t.orderId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [tickets, searchQuery, statusFilter, categoryFilter]);

  // Counts
  const counts = useMemo(() => {
    return {
      total: tickets.length,
      newCount: tickets.filter(t => t.status === 'new').length,
      inProgressCount: tickets.filter(t => t.status === 'in_progress').length,
      answeredCount: tickets.filter(t => t.status === 'answered').length,
      closedCount: tickets.filter(t => t.status === 'closed').length
    };
  }, [tickets]);

  const renderStatusBadge = (status: TicketStatus) => {
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
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Flash Success Notification */}
      {actionSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-950">
            <X size={14} />
          </button>
        </motion.div>
      )}

      {/* Top Bar Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-grey shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black text-brand-navy uppercase tracking-tight">
              MESSAGES ET ASSISTANCE
            </h2>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-brand-navy text-white">
              Gestionnaire Réel
            </span>
          </div>
          <p className="text-xs text-brand-navy/60 mt-1">
            Consultez les demandes des visiteurs et des membres, répondez en direct et pilotez le support client.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => setShowSettingsModal(true)}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-bold"
          >
            <Settings size={14} className="mr-1.5" />
            Paramètres WhatsApp & E-mail
          </Button>

          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-brand-navy bg-brand-grey hover:bg-brand-grey/80 transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => setStatusFilter('all')}
          className={`p-5 rounded-3xl border cursor-pointer transition-all ${
            statusFilter === 'all' 
              ? 'bg-brand-navy text-white border-brand-navy shadow-sm' 
              : 'bg-white text-brand-navy border-brand-grey hover:bg-brand-grey/40'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider block opacity-70">Total Demandes</span>
          <div className="text-2xl font-black mt-1 tabular-nums">{counts.total}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('new')}
          className={`p-5 rounded-3xl border cursor-pointer transition-all ${
            statusFilter === 'new' 
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
              : 'bg-white text-brand-navy border-blue-200 hover:bg-blue-50/50'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider block text-blue-700">Nouvelles demandes</span>
          <div className="text-2xl font-black mt-1 text-blue-800 tabular-nums">{counts.newCount}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('in_progress')}
          className={`p-5 rounded-3xl border cursor-pointer transition-all ${
            statusFilter === 'in_progress' 
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm' 
              : 'bg-white text-brand-navy border-amber-200 hover:bg-amber-50/50'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider block text-amber-700">En cours</span>
          <div className="text-2xl font-black mt-1 text-amber-800 tabular-nums">{counts.inProgressCount}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('answered')}
          className={`p-5 rounded-3xl border cursor-pointer transition-all ${
            statusFilter === 'answered' 
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
              : 'bg-white text-brand-navy border-emerald-200 hover:bg-emerald-50/50'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider block text-emerald-700">Répondues</span>
          <div className="text-2xl font-black mt-1 text-emerald-800 tabular-nums">{counts.answeredCount}</div>
        </div>
      </div>

      {/* Main Split Layout: Ticket List & Conversation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Tickets List (5 cols on large) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-brand-grey shadow-sm space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-3 text-brand-navy/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher nom, e-mail, ticket, sujet..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-brand-grey border border-brand-grey text-xs text-brand-navy focus:bg-white focus:border-brand-green focus:outline-none transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-brand-grey border border-brand-grey text-xs font-medium text-brand-navy focus:bg-white focus:outline-none"
              >
                <option value="all">Toutes les catégories</option>
                {(settings.categories?.length ? settings.categories : SUPPORT_CATEGORIES).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-brand-grey border border-brand-grey text-xs font-medium text-brand-navy focus:bg-white focus:outline-none"
              >
                <option value="all">Tous statuts</option>
                <option value="new">Nouvelle</option>
                <option value="in_progress">En cours</option>
                <option value="answered">Répondue</option>
                <option value="closed">Fermée</option>
              </select>
            </div>
          </div>

          {/* List of tickets */}
          <div className="bg-white rounded-3xl border border-brand-grey shadow-sm p-3 max-h-[650px] overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 size={24} className="animate-spin text-brand-green mx-auto mb-2" />
                <p className="text-xs text-brand-navy/60">Chargement des demandes...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12 px-4 text-xs text-brand-navy/50">
                Aucune demande trouvée avec ces critères.
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                const isMember = Boolean(ticket.userId);

                return (
                  <div
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-brand-navy text-white border-brand-navy shadow-sm'
                        : 'bg-white border-brand-grey hover:bg-brand-grey/50 text-brand-navy'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`font-mono text-[10px] font-bold ${isSelected ? 'text-brand-green' : 'text-brand-navy/60'}`}>
                        {ticket.ticketNumber}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isMember ? (
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-brand-navy/10 text-brand-navy'
                          }`}>
                            Membre
                          </span>
                        ) : (
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-amber-400/20 text-amber-300' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Visiteur
                          </span>
                        )}
                        {renderStatusBadge(ticket.status)}
                      </div>
                    </div>

                    <h4 className={`text-xs font-bold line-clamp-1 ${isSelected ? 'text-white' : 'text-brand-navy'}`}>
                      {ticket.subject}
                    </h4>

                    <div className={`text-[11px] mt-1 flex items-center justify-between ${isSelected ? 'text-white/70' : 'text-brand-navy/50'}`}>
                      <span>{ticket.senderName}</span>
                      <span>
                        {new Date(ticket.updatedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Ticket Conversation & Management (7 cols on large) */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <div className="bg-white rounded-3xl border border-brand-grey shadow-sm overflow-hidden flex flex-col h-[760px]">
              
              {/* Header of selected ticket */}
              <div className="p-6 bg-brand-grey/40 border-b border-brand-grey space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-brand-navy">
                        {selectedTicket.ticketNumber}
                      </span>
                      {renderStatusBadge(selectedTicket.status)}
                      <span className="text-xs px-2 py-0.5 rounded-md bg-white border border-brand-grey text-brand-navy/80 font-medium">
                        {selectedTicket.category}
                      </span>
                      {selectedTicket.orderId && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-brand-navy/10 text-brand-navy font-mono">
                          Commande #{selectedTicket.orderId}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-brand-navy mt-1">
                      {selectedTicket.subject}
                    </h3>
                  </div>

                  {/* Status Action Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-brand-navy/60 font-medium">Statut :</span>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleChangeStatus(e.target.value as TicketStatus)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-brand-grey text-xs font-bold text-brand-navy focus:outline-none"
                    >
                      <option value="new">Nouvelle</option>
                      <option value="in_progress">En cours</option>
                      <option value="answered">Répondue</option>
                      <option value="closed">Fermée</option>
                    </select>
                  </div>
                </div>

                {/* Sender details pill */}
                <div className="p-3 bg-white rounded-2xl border border-brand-grey flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-grey flex items-center justify-center text-brand-navy">
                      <User size={14} />
                    </div>
                    <div>
                      <div className="font-bold text-brand-navy">{selectedTicket.senderName}</div>
                      <a href={`mailto:${selectedTicket.senderEmail}`} className="text-[11px] text-brand-green hover:underline">
                        {selectedTicket.senderEmail}
                      </a>
                    </div>
                  </div>

                  {selectedTicket.senderPhone && (
                    <div className="flex items-center gap-1.5 text-brand-navy/70">
                      <Phone size={13} />
                      <span className="font-mono text-[11px]">{selectedTicket.senderPhone}</span>
                    </div>
                  )}

                  <div className="text-[11px] text-brand-navy/50">
                    Créée le {new Date(selectedTicket.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              {/* Conversation messages thread */}
              <div className="p-6 space-y-4 flex-grow overflow-y-auto bg-brand-white/40">
                {loadingMessages ? (
                  <div className="text-center py-12">
                    <Loader2 size={24} className="animate-spin text-brand-green mx-auto mb-2" />
                    <p className="text-xs text-brand-navy/60">Chargement de la conversation...</p>
                  </div>
                ) : ticketMessages.length === 0 ? (
                  <div className="text-center py-8 text-xs text-brand-navy/50">
                    Aucun message enregistré.
                  </div>
                ) : (
                  ticketMessages.map((msg) => {
                    const isAdmin = msg.senderRole === 'admin';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1 text-[11px]">
                          {isAdmin ? (
                            <>
                              <span className="text-brand-navy/40">
                                {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="inline-flex items-center gap-1 font-bold text-brand-green">
                                <ShieldCheck size={13} />
                                {msg.senderName} (Admin)
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-brand-navy">
                                {msg.senderName} ({msg.senderRole === 'member' ? 'Membre' : 'Visiteur'})
                              </span>
                              <span className="text-brand-navy/40">
                                {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </>
                          )}
                        </div>

                        <div
                          className={`max-w-xl p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                            isAdmin
                              ? 'bg-[#0B1730] text-white rounded-tr-sm shadow-sm'
                              : 'bg-white border border-brand-grey text-brand-navy rounded-tl-sm shadow-sm'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Admin reply composer */}
              <div className="p-5 bg-white border-t border-brand-grey">
                {actionError && (
                  <div className="p-3 mb-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{actionError}</span>
                  </div>
                )}

                <form onSubmit={handleSendAdminReply} className="space-y-3">
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Rédigez votre réponse officielle pour ${selectedTicket.senderName}...`}
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-brand-grey border border-brand-grey text-xs sm:text-sm text-brand-navy focus:bg-white focus:border-brand-green focus:outline-none transition-all resize-y"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-brand-navy/60">
                      <ShieldCheck size={14} className="text-brand-green" />
                      <span>
                        {selectedTicket.userId 
                          ? 'Enregistré dans la base + notification membre générée'
                          : 'Réponse enregistrée pour le visiteur'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedTicket.status !== 'closed' && (
                        <button
                          type="button"
                          onClick={() => handleChangeStatus('closed')}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          Clôturer le ticket
                        </button>
                      )}

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
                            Transmission...
                          </>
                        ) : (
                          <>
                            <Send size={14} className="mr-1.5" />
                            Transmettre la réponse
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>

            </div>
          ) : (
            <div className="h-[760px] bg-white rounded-3xl border border-dashed border-brand-grey flex flex-col items-center justify-center p-8 text-center text-brand-navy/40">
              <MessageSquare size={48} className="mb-3 text-brand-navy/20" />
              <h3 className="text-base font-bold text-brand-navy mb-1">
                Sélectionnez une demande d'assistance
              </h3>
              <p className="text-xs text-brand-navy/60 max-w-sm">
                Cliquez sur une demande dans la liste de gauche pour lire les détails, consulter l'historique et envoyer votre réponse.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* MODAL: COMMUNICATION & WHATSAPP SETTINGS */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-brand-grey max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-brand-grey mb-6">
                <div>
                  <h3 className="text-lg font-black uppercase text-brand-navy tracking-tight">
                    Paramètres de communication
                  </h3>
                  <p className="text-xs text-brand-navy/60 mt-0.5">
                    Coordonnées officielles de contact et canal WhatsApp.
                  </p>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 text-brand-navy/40 hover:text-brand-navy rounded-xl hover:bg-brand-grey transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy/70 mb-1.5">
                    Numéro WhatsApp officiel
                  </label>
                  <input
                    type="text"
                    value={tempWhatsapp}
                    onChange={(e) => setTempWhatsapp(e.target.value)}
                    placeholder="+22892395727"
                    className="w-full px-4 py-3 rounded-2xl bg-brand-grey border border-brand-grey text-xs sm:text-sm text-brand-navy font-mono focus:bg-white focus:border-brand-green focus:outline-none transition-all"
                  />
                  <p className="text-[11px] text-brand-navy/50 mt-1">
                    Numéro utilisé pour générer le lien de discussion direct <code>wa.me</code>. Laissez vide pour masquer le bouton WhatsApp.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-brand-grey rounded-2xl">
                  <div>
                    <div className="text-xs font-bold text-brand-navy">Canal WhatsApp activé</div>
                    <p className="text-[11px] text-brand-navy/60">Afficher le bouton de contact direct aux utilisateurs</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempWhatsappEnabled}
                      onChange={(e) => setTempWhatsappEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy/70 mb-1.5">
                    Adresse e-mail du support
                  </label>
                  <input
                    type="email"
                    value={tempEmail}
                    onChange={(e) => setTempEmail(e.target.value)}
                    placeholder="petitsandrino1@gmail.com"
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-brand-grey border border-brand-grey text-xs sm:text-sm text-brand-navy focus:bg-white focus:border-brand-green focus:outline-none transition-all"
                  />
                </div>

                {/* Configurable Categories */}
                <div className="space-y-2 pt-2 border-t border-brand-grey">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy/70">
                      Catégories de demandes
                    </label>
                    <button
                      type="button"
                      onClick={() => setTempCategories(SUPPORT_CATEGORIES)}
                      className="text-[10px] font-bold text-brand-green hover:underline"
                    >
                      Réinitialiser par défaut
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tempCategories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-grey text-xs font-medium text-brand-navy"
                      >
                        <Tag size={12} className="text-brand-green" />
                        {cat}
                        {tempCategories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCategory(cat)}
                            className="text-brand-navy/40 hover:text-red-500 ml-1"
                            title="Supprimer cette catégorie"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      placeholder="Ajouter une catégorie..."
                      className="flex-grow px-3 py-2 rounded-xl bg-brand-grey border border-brand-grey text-xs text-brand-navy focus:bg-white focus:border-brand-green focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-3 py-2 rounded-xl bg-brand-navy text-white text-xs font-bold hover:bg-brand-navy/90"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-brand-navy/70 hover:bg-brand-grey transition-colors"
                  >
                    Annuler
                  </button>
                  <Button
                    type="submit"
                    disabled={savingSettings}
                    variant="primary"
                    size="sm"
                    className="rounded-xl text-xs font-bold"
                  >
                    {savingSettings ? (
                      <>
                        <Loader2 size={14} className="animate-spin mr-1.5" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save size={14} className="mr-1.5" />
                        Enregistrer les modifications
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
