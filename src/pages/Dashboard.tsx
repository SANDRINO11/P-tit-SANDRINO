import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Order, PurchasedProduct, MemberSubscriptionDetails, MemberNotification } from '../data/member';
import { deliveryService } from '../lib/deliveryService';
import { 
  LayoutDashboard, 
  User as UserIcon, 
  CreditCard, 
  ShoppingBag, 
  BookOpen, 
  Sparkles, 
  HelpCircle, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Lock, 
  Download, 
  ChevronRight, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Loader2,
  Menu,
  X,
  ExternalLink,
  MessageCircleQuestion,
  FileCheck2,
  ArrowRight,
  Bell,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { MemberSupportView } from '../components/dashboard/MemberSupportView';

type TabType = 
  | 'dashboard' 
  | 'profile' 
  | 'subscriptions' 
  | 'orders' 
  | 'products' 
  | 'resources' 
  | 'support';

export const Dashboard = () => {
  const { user, profile, signOut, refreshProfile, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Profile Edit State
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Real Database state
  const [loadingData, setLoadingData] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchasedProducts, setPurchasedProducts] = useState<PurchasedProduct[]>([]);
  const [userSubscription, setUserSubscription] = useState<MemberSubscriptionDetails | null>(null);
  const [notifications, setNotifications] = useState<MemberNotification[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadErrorMsg, setDownloadErrorMsg] = useState<string | null>(null);

  // Synchronize profile state when profile updates
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  // Fetch Member Real Data via deliveryService (handles Supabase cloud & offline sync)
  useEffect(() => {
    const fetchMemberData = async () => {
      if (!user) {
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      try {
        const deliveryData = await deliveryService.getMemberDeliveryData(user.id);
        setOrders(deliveryData.orders);
        setPurchasedProducts(deliveryData.purchasedProducts);
        setUserSubscription(deliveryData.subscription);
        setNotifications(deliveryData.notifications);
      } catch (err) {
        console.error('Error fetching member dashboard data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchMemberData();
  }, [user, profile]);

  const handleDownloadProduct = async (product: PurchasedProduct) => {
    if (!user) return;
    setDownloadErrorMsg(null);
    setDownloadingId(product.id);
    try {
      const url = await deliveryService.getSecureDownloadUrl(product, user.id);
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${product.productName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: any) {
      setDownloadErrorMsg("Erreur lors du téléchargement sécurisé : " + (err.message || 'Fichier indisponible'));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdatingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      if (!isConfigured) {
        throw new Error("Supabase n'est pas encore configuré.");
      }

      // Security check: Only full_name and phone can be updated
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim()
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setProfileSuccessMsg('Vos informations ont été mises à jour avec succès.');
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Impossible de mettre à jour le profil.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getFirstName = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Membre';
  };

  const getPaymentStatusBadge = (status: Order['paymentStatus']) => {
    switch (status) {
      case 'paid_validated':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} />
            Payée et validée
          </span>
        );
      case 'payment_declared':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock size={13} />
            Paiement déclaré
          </span>
        );
      case 'payment_verification':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={13} />
            Vérification en cours
          </span>
        );
      case 'pending_payment':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock size={13} />
            En attente de paiement
          </span>
        );
      case 'failed_cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <AlertCircle size={13} />
            Refusée ou annulée
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            En attente
          </span>
        );
    }
  };

  const navMenuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard size={18} /> },
    { id: 'profile', label: 'Mon profil', icon: <UserIcon size={18} /> },
    { id: 'subscriptions', label: 'Mes abonnements', icon: <CreditCard size={18} /> },
    { id: 'orders', label: 'Mes commandes', icon: <ShoppingBag size={18} /> },
    { id: 'products', label: 'Mes produits numériques', icon: <BookOpen size={18} /> },
    { id: 'resources', label: 'Mes ressources', icon: <Sparkles size={18} /> },
    { id: 'support', label: 'Assistance', icon: <HelpCircle size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-brand-grey pt-24 pb-20">
      {/* Top Welcome Ribbon */}
      <div className="bg-brand-navy text-white py-10 px-6 border-b border-brand-navy/30">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-brand-green font-bold text-xs uppercase tracking-[0.25em] mb-2 block">
              Espace Personnel Sécurisé
            </span>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight uppercase leading-tight">
              Bienvenue, <span className="text-brand-green">{getFirstName()}</span>
            </h1>
            <p className="text-xs md:text-sm text-brand-grey/70 mt-1">
              Connecté avec {user?.email} · Rôle : <span className="font-bold text-white capitalize">{profile?.role || 'Membre'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {profile?.role === 'admin' && (
              <Link to="/admin">
                <Button variant="secondary" size="sm" className="rounded-xl px-4 text-xs font-bold bg-brand-green text-white hover:bg-brand-green/90 border-none">
                  <ShieldCheck size={14} className="mr-1.5" />
                  Espace Administration
                </Button>
              </Link>
            )}
            <Link to="/shop">
              <Button variant="secondary" size="sm" className="rounded-xl px-4 text-xs font-bold">
                Explorer la boutique
              </Button>
            </Link>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 transition-colors"
            >
              <LogOut size={14} />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 mt-8">
        {/* Real in-app validation/refusal notifications */}
        {notifications.length > 0 && (
          <div className="mb-8 space-y-3">
            {notifications.slice(0, 3).map((notif) => (
              <div
                key={notif.id}
                className={`p-5 rounded-3xl border flex items-start gap-4 ${
                  notif.type === 'payment_validated'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : notif.type === 'payment_rejected'
                    ? 'bg-red-50 border-red-200 text-red-950'
                    : notif.type === 'support'
                    ? 'bg-blue-50 border-blue-200 text-blue-950'
                    : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}
              >
                {notif.type === 'payment_validated' ? (
                  <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                ) : notif.type === 'payment_rejected' ? (
                  <XCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
                ) : notif.type === 'support' ? (
                  <MessageCircleQuestion className="text-blue-600 shrink-0 mt-0.5" size={20} />
                ) : (
                  <Bell className="text-amber-600 shrink-0 mt-0.5" size={20} />
                )}
                <div className="flex-grow text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-sm font-bold uppercase tracking-tight">{notif.title}</strong>
                    <span className="text-[10px] opacity-60">
                      {new Date(notif.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="leading-relaxed opacity-90">{notif.message}</p>
                  {notif.type === 'payment_validated' && (
                    <div className="pt-2 flex gap-3">
                      <button
                        onClick={() => setActiveTab('products')}
                        className="font-bold underline text-emerald-700 hover:text-emerald-900"
                      >
                        Accéder à mes produits numériques →
                      </button>
                      <button
                        onClick={() => setActiveTab('subscriptions')}
                        className="font-bold underline text-emerald-700 hover:text-emerald-900"
                      >
                        Voir mon abonnement →
                      </button>
                    </div>
                  )}
                  {notif.type === 'support' && (
                    <div className="pt-2 flex gap-3">
                      <button
                        onClick={() => setActiveTab('support')}
                        className="font-bold underline text-blue-700 hover:text-blue-900"
                      >
                        Consulter la réponse de l'administration →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Supabase unconfigured warning banner */}
        {!isConfigured && (
          <div className="mb-8 p-5 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-4">
            <AlertCircle className="text-amber-500 shrink-0 mt-1" size={22} />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong>Configuration Supabase requise :</strong> Pour charger et synchroniser vos données en temps réel (abonnements, commandes, profil), veuillez renseigner vos variables <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code>. En l'absence de ces clés, les états réels locaux sont utilisés sans inventer de fausses données.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Mobile Tab Trigger */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-brand-grey shadow-sm text-brand-navy font-bold text-sm"
            >
              <div className="flex items-center gap-3">
                <Menu size={18} className="text-brand-green" />
                <span>Rubrique : {navMenuItems.find(i => i.id === activeTab)?.label}</span>
              </div>
              {mobileMenuOpen ? <X size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

          {/* SIDEBAR NAVIGATION (Desktop & Mobile Drawer) */}
          <aside className={`lg:col-span-1 ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-3xl p-4 border border-brand-grey shadow-sm sticky top-28 space-y-1">
              <div className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-brand-navy/40 border-b border-brand-grey mb-2">
                Mon Espace
              </div>

              {navMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as TabType);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === item.id
                      ? 'bg-brand-navy text-white shadow-sm'
                      : 'text-brand-navy/70 hover:bg-brand-grey hover:text-brand-navy'
                  }`}
                >
                  <span className={activeTab === item.id ? 'text-brand-green' : 'text-brand-navy/40'}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}

              <div className="pt-4 mt-4 border-t border-brand-grey">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={18} />
                  Déconnexion
                </button>
              </div>
            </div>
          </aside>

          {/* MAIN TAB CONTENT */}
          <main className="lg:col-span-3">
            {/* 1. TABLEAU DE BORD */}
            {activeTab === 'dashboard' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                {/* Stats & Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Abonnement Card */}
                  <div className="bg-white p-6 rounded-3xl border border-brand-grey shadow-sm">
                    <span className="text-[11px] font-bold text-brand-navy/40 uppercase tracking-wider block mb-2">
                      Formule Actuelle
                    </span>
                    <h3 className="text-xl font-extrabold text-brand-navy mb-3">
                      {userSubscription?.planName || 'Formule Gratuite'}
                    </h3>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-green/10 text-brand-green">
                      <CheckCircle2 size={12} />
                      {userSubscription?.status === 'active' ? 'Active' : 'En attente'}
                    </div>
                  </div>

                  {/* Commandes Card */}
                  <div className="bg-white p-6 rounded-3xl border border-brand-grey shadow-sm">
                    <span className="text-[11px] font-bold text-brand-navy/40 uppercase tracking-wider block mb-2">
                      Commandes
                    </span>
                    <h3 className="text-3xl font-extrabold text-brand-navy mb-2 tabular-nums">
                      {orders.length}
                    </h3>
                    <p className="text-xs text-brand-navy/50">
                      {orders.length === 0 ? 'Aucune commande enregistrée' : `${orders.length} commande(s) au total`}
                    </p>
                  </div>

                  {/* Produits Accessibles Card */}
                  <div className="bg-white p-6 rounded-3xl border border-brand-grey shadow-sm">
                    <span className="text-[11px] font-bold text-brand-navy/40 uppercase tracking-wider block mb-2">
                      Produits Numériques
                    </span>
                    <h3 className="text-3xl font-extrabold text-brand-navy mb-2 tabular-nums">
                      {purchasedProducts.length}
                    </h3>
                    <p className="text-xs text-brand-navy/50">
                      {purchasedProducts.length === 0 ? 'Aucun produit actif' : `${purchasedProducts.length} ressource(s) validée(s)`}
                    </p>
                  </div>
                </div>

                {/* Identity Summary Box */}
                <div className="bg-white p-8 rounded-3xl border border-brand-grey shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-brand-grey">
                    <div>
                      <h2 className="text-xl font-bold text-brand-navy uppercase tracking-tight">
                        Informations du Compte
                      </h2>
                      <p className="text-xs text-brand-navy/60">
                        Données personnelles protégées par sécurité RLS.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="text-xs font-bold text-brand-green hover:underline flex items-center gap-1"
                    >
                      Modifier mon profil
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-brand-navy/40 block mb-1">Nom et Prénom</span>
                      <p className="text-sm font-semibold text-brand-navy">{profile?.full_name || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase text-brand-navy/40 block mb-1">Adresse E-mail</span>
                      <p className="text-sm font-semibold text-brand-navy">{user?.email}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase text-brand-navy/40 block mb-1">Téléphone</span>
                      <p className="text-sm font-semibold text-brand-navy">{profile?.phone || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase text-brand-navy/40 block mb-1">Date d'inscription</span>
                      <p className="text-sm font-semibold text-brand-navy">
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Récemment'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Access to Resources */}
                <div className="bg-brand-navy rounded-3xl p-8 text-white relative overflow-hidden">
                  <div className="relative z-10 max-w-xl">
                    <span className="text-brand-green text-xs font-bold uppercase tracking-widest block mb-2">
                      Bibliothèque SANDRINO
                    </span>
                    <h3 className="text-2xl font-bold uppercase mb-4 tracking-tight">
                      Accédez à vos ressources d'apprentissage
                    </h3>
                    <p className="text-xs md:text-sm text-brand-grey/70 mb-6 leading-relaxed">
                      Retrouvez vos guides PDF, e-books et documents validés dans votre bibliothèque personnelle.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <button
                        onClick={() => setActiveTab('products')}
                        className="px-5 py-3 rounded-xl bg-brand-green text-white text-xs font-bold hover:bg-brand-green/90 transition-colors"
                      >
                        Voir mes produits numériques
                      </button>
                      <button
                        onClick={() => setActiveTab('subscriptions')}
                        className="px-5 py-3 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors"
                      >
                        Gérer mon abonnement
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. MON PROFIL */}
            {activeTab === 'profile' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white p-8 md:p-10 rounded-3xl border border-brand-grey shadow-sm">
                  <div className="mb-8">
                    <h2 className="text-2xl font-black text-brand-navy uppercase tracking-tight mb-2">
                      Mon Profil Membre
                    </h2>
                    <p className="text-xs md:text-sm text-brand-navy/60">
                      Gérez vos informations personnelles. Votre adresse e-mail et votre rôle ne peuvent être modifiés directement pour des raisons de sécurité.
                    </p>
                  </div>

                  {profileSuccessMsg && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold">
                      <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                      {profileSuccessMsg}
                    </div>
                  )}

                  {profileErrorMsg && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-xs font-medium">
                      <AlertCircle size={18} className="shrink-0 text-red-600" />
                      {profileErrorMsg}
                    </div>
                  )}

                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Nom Complet */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                          Nom et Prénom
                        </label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/30" size={18} />
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Votre nom complet"
                            className="w-full pl-12 pr-4 py-3.5 bg-brand-grey border border-brand-grey rounded-2xl text-sm font-medium text-brand-navy focus:outline-none focus:border-brand-green"
                          />
                        </div>
                      </div>

                      {/* Téléphone */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                          Numéro de Téléphone
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/30" size={18} />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+225 0102030405"
                            className="w-full pl-12 pr-4 py-3.5 bg-brand-grey border border-brand-grey rounded-2xl text-sm font-medium text-brand-navy focus:outline-none focus:border-brand-green"
                          />
                        </div>
                      </div>

                      {/* E-mail (Lecture seule) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                            Adresse E-mail
                          </label>
                          <span className="text-[10px] text-brand-navy/40 font-bold uppercase">Sécurisée</span>
                        </div>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/30" size={18} />
                          <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-medium text-brand-navy/60 cursor-not-allowed"
                          />
                        </div>
                        <p className="text-[10px] text-brand-navy/40">
                          Pour modifier votre e-mail, contactez l'assistance avec vérification d'identité.
                        </p>
                      </div>

                      {/* Rôle & Statut (Lecture seule) */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                          Rôle du Compte
                        </label>
                        <div className="relative">
                          <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-green" size={18} />
                          <input
                            type="text"
                            value={profile?.role === 'admin' ? 'Administrateur' : 'Membre certifié'}
                            disabled
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-brand-navy/70 cursor-not-allowed uppercase"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button
                        type="submit"
                        disabled={isUpdatingProfile}
                        variant="secondary"
                        size="md"
                        className="rounded-2xl px-8"
                      >
                        {isUpdatingProfile ? (
                          <>
                            <Loader2 className="animate-spin mr-2" size={16} />
                            Enregistrement...
                          </>
                        ) : (
                          'Enregistrer les modifications'
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* 3. MES ABONNEMENTS */}
            {activeTab === 'subscriptions' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white p-8 md:p-10 rounded-3xl border border-brand-grey shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                      <h2 className="text-2xl font-black text-brand-navy uppercase tracking-tight mb-2">
                        Mon Adhésion SANDRINO
                      </h2>
                      <p className="text-xs md:text-sm text-brand-navy/60">
                        Statut et privilèges associés à votre compte.
                      </p>
                    </div>
                    <Link to="/subscriptions">
                      <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold">
                        Consulter les formules
                        <ExternalLink size={12} className="ml-2" />
                      </Button>
                    </Link>
                  </div>

                  {/* Active plan card */}
                  <div className="p-8 rounded-[2rem] bg-brand-navy text-white relative overflow-hidden mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div>
                        <span className="text-brand-green text-xs font-bold uppercase tracking-widest block mb-1">
                          Formule Actuelle
                        </span>
                        <h3 className="text-3xl font-extrabold uppercase tracking-tight text-white mb-2">
                          {userSubscription?.planName || 'Formule Gratuite'}
                        </h3>
                        <p className="text-xs text-brand-grey/70">
                          Tarif : {userSubscription?.price ? `${userSubscription.price.toLocaleString('fr-FR')} FCFA` : '0 FCFA'}
                        </p>
                      </div>

                      <div className="flex flex-col items-start md:items-end gap-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-brand-grey/50">
                          Statut
                        </span>
                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold ${
                          userSubscription?.status === 'active'
                            ? 'bg-brand-green text-white'
                            : userSubscription?.status === 'expired'
                            ? 'bg-red-500 text-white'
                            : 'bg-amber-500 text-white'
                        }`}>
                          {userSubscription?.status === 'active' ? (
                            <>
                              <CheckCircle2 size={14} />
                              Actif
                            </>
                          ) : userSubscription?.status === 'expired' ? (
                            <>
                              <AlertCircle size={14} />
                              Expiré
                            </>
                          ) : (
                            <>
                              <Clock size={14} />
                              En attente
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-brand-grey/70">
                      <div>
                        Date de début : <strong className="text-white">{userSubscription?.startDate ? new Date(userSubscription.startDate).toLocaleDateString('fr-FR') : 'Date initiale'}</strong>
                      </div>
                      <div>
                        Expiration : <strong className="text-white">{userSubscription?.expiryDate ? new Date(userSubscription.expiryDate).toLocaleDateString('fr-FR') : 'Accès illimité'}</strong>
                      </div>
                    </div>
                  </div>

                  {userSubscription?.status === 'expired' && (
                    <div className="mb-6 p-5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4">
                      <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
                      <div className="text-xs text-red-950 leading-relaxed">
                        <strong>Votre abonnement est arrivé à expiration :</strong> Vos privilèges membres liés à cette formule ont pris fin. Notez toutefois que <strong>tous vos produits numériques achetés restent acquis et téléchargeables à vie</strong> dans votre bibliothèque numérique.
                      </div>
                    </div>
                  )}

                  {/* Accessible Privileges */}
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-brand-navy mb-4">
                      Avantages réellement accessibles :
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userSubscription?.features.map((feat, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-brand-grey border border-brand-grey flex items-center gap-3">
                          <CheckCircle2 size={16} className="text-brand-green shrink-0" />
                          <span className="text-xs font-semibold text-brand-navy">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Renewal Action Notice */}
                  <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-slate-700 leading-relaxed">
                      <strong>Renouvellement ou Surclassement :</strong> L'activation des formules Standard ou Premium est validée après confirmation du paiement Mobile Money par l'administration.
                    </div>
                    <Link to="/subscriptions">
                      <Button variant="secondary" size="sm" className="rounded-xl whitespace-nowrap text-xs font-bold">
                        Changer de formule
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. MES COMMANDES */}
            {activeTab === 'orders' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white p-8 md:p-10 rounded-3xl border border-brand-grey shadow-sm">
                  <div className="mb-8">
                    <h2 className="text-2xl font-black text-brand-navy uppercase tracking-tight mb-2">
                      Historique des Commandes
                    </h2>
                    <p className="text-xs md:text-sm text-brand-navy/60">
                      Suivez l'état de validation de vos commandes de ressources et produits numériques.
                    </p>
                  </div>

                  {orders.length > 0 ? (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="p-6 rounded-2xl border border-brand-grey hover:border-brand-navy/20 transition-all bg-brand-grey/30">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-brand-grey">
                            <div>
                              <span className="text-xs font-bold text-brand-navy/50 block">Numéro : {order.orderNumber}</span>
                              <span className="text-sm font-extrabold text-brand-navy">
                                {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                              </span>
                            </div>
                            <div>{getPaymentStatusBadge(order.paymentStatus)}</div>
                          </div>

                          <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <span className="text-xs text-brand-navy/60 block mb-1">
                                {order.items.length > 0 ? order.items.map(i => i.productName).join(', ') : 'Ressource numérique'}
                              </span>
                              {order.paymentMethod && (
                                <span className="inline-block text-[11px] font-semibold text-brand-navy/70 uppercase bg-brand-navy/5 px-2.5 py-0.5 rounded-md">
                                  Moyen : {order.paymentMethod === 'tmoney' ? 'T-Money (Togocom)' : order.paymentMethod === 'moov' ? 'Moov Money (Togo)' : order.paymentMethod}
                                </span>
                              )}
                            </div>
                            <div className="text-left md:text-right">
                              <span className="text-xs text-brand-navy/40 uppercase block">Total</span>
                              <span className="text-base font-black text-brand-navy tabular-nums">
                                {order.totalAmount.toLocaleString('fr-FR')} FCFA
                              </span>
                            </div>
                          </div>

                          {/* Order Payment Status Details & Actions */}
                          {order.paymentStatus === 'pending_payment' && (
                            <div className="mt-4 pt-4 border-t border-brand-grey flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                              <div className="flex items-center gap-2 text-xs text-blue-900">
                                <Clock size={15} className="text-blue-600 shrink-0" />
                                <span>Commande enregistrée. Vous pouvez finaliser le paiement par T-Money ou Moov Money.</span>
                              </div>
                              <Link to={`/checkout?order=${order.id}`} className="shrink-0 w-full sm:w-auto">
                                <Button variant="secondary" size="sm" className="w-full sm:w-auto rounded-xl text-xs font-bold">
                                  Payer maintenant
                                </Button>
                              </Link>
                            </div>
                          )}

                          {(order.paymentStatus === 'payment_declared' || order.paymentStatus === 'payment_verification') && (
                            <div className="mt-4 pt-3 border-t border-brand-grey">
                              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                                <div className="flex items-center gap-2 font-bold text-amber-950">
                                  <Clock size={15} className="text-amber-700 shrink-0" />
                                  <span>Transfert déclaré — En attente de validation manuelle</span>
                                </div>
                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                  Votre déclaration a bien été transmise à l'administrateur SANDRINO. Conformément à notre politique, l'accès ou l'abonnement sera activé manuellement après vérification du reçu ou SMS de paiement.
                                </p>
                                {order.paymentDetails?.transactionRef && (
                                  <div className="text-[11px] text-amber-900 font-mono pt-1">
                                    ID Transaction déclaré : <strong>{order.paymentDetails.transactionRef}</strong>
                                    {order.paymentDetails.senderPhone && ` · N° : ${order.paymentDetails.senderPhone}`}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {order.paymentStatus === 'paid_validated' && (
                            <div className="mt-4 pt-3 border-t border-brand-grey">
                              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                                <span>Paiement validé par l'administration SANDRINO. Vos ressources sont accessibles.</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Real Empty State */
                    <div className="text-center py-16 px-4 border border-dashed border-brand-grey rounded-3xl bg-slate-50/50">
                      <div className="h-16 w-16 rounded-full bg-brand-navy/5 flex items-center justify-center mx-auto mb-4 text-brand-navy/30">
                        <ShoppingBag size={28} />
                      </div>
                      <h3 className="text-base font-bold text-brand-navy mb-2">Aucune commande enregistrée</h3>
                      <p className="text-xs text-brand-navy/50 max-w-sm mx-auto mb-6">
                        Vous n'avez pas encore passé de commande. Découvrez notre catalogue de guides et livres numériques.
                      </p>
                      <Link to="/shop">
                        <Button variant="secondary" size="sm" className="rounded-xl text-xs font-bold">
                          Visiter la boutique
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 5. MES PRODUITS NUMÉRIQUES */}
            {activeTab === 'products' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white p-8 md:p-10 rounded-3xl border border-brand-grey shadow-sm">
                  <div className="mb-8">
                    <h2 className="text-2xl font-black text-brand-navy uppercase tracking-tight mb-2">
                      Ma Bibliothèque Numérique
                    </h2>
                    <p className="text-xs md:text-sm text-brand-navy/60">
                      Vos e-books et guides pratiques achetés et validés par l'administration SANDRINO.
                    </p>
                  </div>

                  {downloadErrorMsg && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-xs">
                      <AlertCircle size={18} className="shrink-0 mt-0.5" />
                      <span>{downloadErrorMsg}</span>
                    </div>
                  )}

                  {purchasedProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {purchasedProducts.map((item) => (
                        <div key={item.id} className="p-6 rounded-3xl bg-brand-grey border border-brand-grey flex flex-col justify-between">
                          <div className="flex gap-4 mb-4">
                            <div className="w-16 h-20 bg-white rounded-xl overflow-hidden shrink-0 shadow-sm border border-brand-grey">
                              <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-md">
                                {item.format}
                              </span>
                              <h4 className="text-sm font-extrabold text-brand-navy mt-1 leading-snug">
                                {item.productName}
                              </h4>
                              <span className="text-[11px] text-brand-navy/40 block mt-1">
                                Acquis le {new Date(item.purchaseDate).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-brand-navy/10 flex items-center justify-between">
                            {item.fileAvailable ? (
                              <button
                                onClick={() => handleDownloadProduct(item)}
                                disabled={downloadingId === item.id}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green text-white text-xs font-bold hover:bg-brand-green/90 transition-colors disabled:opacity-50"
                              >
                                {downloadingId === item.id ? (
                                  <>
                                    <Loader2 className="animate-spin" size={14} />
                                    Téléchargement...
                                  </>
                                ) : (
                                  <>
                                    <Download size={14} />
                                    Télécharger mon fichier
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                                <Lock size={12} />
                                Validation fichier en cours
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Real Empty State */
                    <div className="text-center py-16 px-4 border border-dashed border-brand-grey rounded-3xl bg-slate-50/50">
                      <div className="h-16 w-16 rounded-full bg-brand-navy/5 flex items-center justify-center mx-auto mb-4 text-brand-navy/30">
                        <BookOpen size={28} />
                      </div>
                      <h3 className="text-base font-bold text-brand-navy mb-2">Aucun produit dans votre bibliothèque</h3>
                      <p className="text-xs text-brand-navy/50 max-w-md mx-auto mb-6">
                        Les produits numériques achetés apparaîtront ici dès que leur commande et paiement auront été validés.
                      </p>
                      <Link to="/shop">
                        <Button variant="secondary" size="sm" className="rounded-xl text-xs font-bold">
                          Découvrir les produits numériques
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 6. MES RESSOURCES */}
            {activeTab === 'resources' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white p-8 md:p-10 rounded-3xl border border-brand-grey shadow-sm">
                  <div className="mb-8">
                    <h2 className="text-2xl font-black text-brand-navy uppercase tracking-tight mb-2">
                      Ressources Disponibles
                    </h2>
                    <p className="text-xs md:text-sm text-brand-navy/60">
                      Supports d'apprentissage et fiches pratiques associés à votre statut de membre.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        title: "Charte de réussite et d'apprentissage SANDRINO",
                        type: "Guide PDF gratuit",
                        desc: "Document de cadrage pour organiser vos objectifs et vos séances d'apprentissage personnel."
                      },
                      {
                        title: "Grille d'objectifs hebdomadaire (Template)",
                        type: "Fiche pratique",
                        desc: "Outil pratique d'organisation personnelle pour suivre votre progression pas à pas."
                      }
                    ].map((res, i) => (
                      <div key={i} className="p-6 rounded-2xl bg-brand-grey border border-brand-grey flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-brand-green shrink-0 shadow-sm">
                            <FileCheck2 size={20} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-green">
                              {res.type}
                            </span>
                            <h4 className="text-sm font-bold text-brand-navy mt-0.5">
                              {res.title}
                            </h4>
                            <p className="text-xs text-brand-navy/60 mt-1 leading-relaxed">
                              {res.desc}
                            </p>
                          </div>
                        </div>

                        <Link to="/domains">
                          <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold whitespace-nowrap">
                            Consulter
                            <ArrowRight size={12} className="ml-1.5" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 7. ASSISTANCE (PARTIE 14) */}
            {activeTab === 'support' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <MemberSupportView orders={orders} />
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
