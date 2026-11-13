import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { 
  adminService, 
  AdminOrder, 
  AdminDeclaration, 
  MemberProfile, 
  StoredPaymentSettings, 
  AuditLog 
} from '../lib/adminService';
import { PRODUCTS, Product, Category } from '../data/products';
import { SERVICES, Service, ServiceCategory } from '../data/services';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../data/subscriptions';
import { deliveryService } from '../lib/deliveryService';
import { supportService } from '../lib/supportService';
import { productService } from '../lib/productService';
import { subscriptionService } from '../lib/subscriptionService';
import { Button } from '../components/ui/Button';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Receipt, 
  Package, 
  Briefcase, 
  CreditCard, 
  Users, 
  Settings, 
  History, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  X, 
  Search, 
  Filter, 
  Eye, 
  Check, 
  Ban, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  Menu, 
  ChevronRight, 
  Smartphone, 
  DollarSign, 
  FileText, 
  Info, 
  Loader2,
  Database,
  Copy,
  MessageCircle,
  BarChart2,
  TrendingUp,
  MessageSquare,
  Upload,
  Image,
  Paperclip
} from 'lucide-react';
import { AnalyticsView } from '../components/admin/AnalyticsView';
import { AdminSupportView } from '../components/admin/AdminSupportView';

type AdminTab = 
  | 'overview' 
  | 'analytics'
  | 'support'
  | 'orders' 
  | 'declarations' 
  | 'products' 
  | 'services' 
  | 'subscriptions' 
  | 'members' 
  | 'settings' 
  | 'logs' 
  | 'sql_guide';

export const AdminPage = () => {
  const { user, profile, isConfigured } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [overview, setOverview] = useState({
    totalMembers: 0,
    totalOrders: 0,
    pendingOrders: 0,
    paymentsToVerify: 0,
    activeProducts: 0,
    activeSubscriptions: 0,
    totalValidatedRevenue: 0
  });

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [declarations, setDeclarations] = useState<AdminDeclaration[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<StoredPaymentSettings>({
    tmoney: { recipientNumber: '', recipientName: '', instructions: '', isEnabled: true },
    moov: { recipientNumber: '', recipientName: '', instructions: '', isEnabled: true }
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Products and Services in memory / admin state
  const [productsList, setProductsList] = useState<Product[]>(() => productService.getProductsSync());
  const [servicesList, setServicesList] = useState<Service[]>(SERVICES);
  const [plansList, setPlansList] = useState<SubscriptionPlan[]>(() => subscriptionService.getPlansSync());

  // Search and filter states
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [memberSearch, setMemberSearch] = useState('');

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [validationModalOrder, setValidationModalOrder] = useState<AdminOrder | null>(null);
  const [refusalModalOrder, setRefusalModalOrder] = useState<AdminOrder | null>(null);
  const [refusalReason, setRefusalReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Product edit/add modal
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [productDeleteConfirmId, setProductDeleteConfirmId] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingProductFile, setIsUploadingProductFile] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState<number | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productModalError, setProductModalError] = useState<string | null>(null);

  // Service edit/add modal
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [isNewService, setIsNewService] = useState(false);

  // Subscription plan edit modal
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editingPlanPrice, setEditingPlanPrice] = useState<string>('0');
  const [editingPlanFeaturesText, setEditingPlanFeaturesText] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planModalError, setPlanModalError] = useState<string | null>(null);

  // Settings saving state
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [openSupportCount, setOpenSupportCount] = useState(0);

  // Load all initial admin data
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [
        overviewData,
        ordersData,
        declarationsData,
        membersData,
        settingsData,
        logsData,
        subsData,
        ticketsData,
        liveProducts,
        livePlans
      ] = await Promise.all([
        adminService.getOverview(),
        adminService.getOrders(),
        adminService.getDeclarations(),
        adminService.getMembers(),
        adminService.getPaymentSettings(),
        adminService.getAuditLogs(),
        adminService.getSubscriptions(),
        supportService.getAllTickets(),
        productService.getProducts(),
        subscriptionService.getPlans()
      ]);

      setOverview({
        ...overviewData,
        activeProducts: liveProducts.length
      });
      setOrders(ordersData);
      setDeclarations(declarationsData);
      setMembers(membersData);
      setPaymentSettings(settingsData);
      setAuditLogs(logsData);
      setSubscriptionsList(subsData || []);
      setProductsList(liveProducts);
      if (livePlans.length > 0) {
        setPlansList(livePlans);
      }
      setOpenSupportCount(
        (ticketsData || []).filter(t => t.status === 'new' || t.status === 'in_progress').length
      );
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [isConfigured]);

  // Flash message auto-dismiss
  useEffect(() => {
    if (actionSuccessMsg) {
      const timer = setTimeout(() => setActionSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccessMsg]);

  useEffect(() => {
    if (actionErrorMsg) {
      const timer = setTimeout(() => setActionErrorMsg(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [actionErrorMsg]);

  useEffect(() => {
    if (settingsSavedMsg) {
      const timer = setTimeout(() => setSettingsSavedMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [settingsSavedMsg]);

  // Action: Validate Payment & Automated Delivery (Part 12 + Email Confirmation)
  const handleConfirmValidation = async () => {
    if (!validationModalOrder || !user) return;
    setIsProcessingAction(true);
    try {
      const res = await deliveryService.validateAndDeliver(validationModalOrder, {
        id: user.id,
        email: user.email || 'petitsandrino1@gmail.com',
        name: profile?.full_name
      });

      let successMsg = `Commande ${validationModalOrder.orderNumber} validée avec succès.`;
      if (res.deliveredProducts && res.deliveredProducts.length > 0) {
        successMsg += ` Accès délivré : ${res.deliveredProducts.join(', ')}.`;
      }
      if (res.activatedSubscription) {
        successMsg += ` Formule ${res.activatedSubscription} activée.`;
      }
      if (res.emailResult?.sent) {
        successMsg += ` E-mail de confirmation envoyé (${res.emailResult.provider === 'sendgrid' ? 'SendGrid' : 'Resend'}).`;
      } else if (res.emailResult && !res.emailResult.configured) {
        successMsg += ` Notification interne créée (e-mail externe non envoyé : clé RESEND_API_KEY ou SENDGRID_API_KEY non configurée).`;
      } else if (res.emailResult?.error) {
        successMsg += ` Notification interne créée (erreur d'envoi e-mail : ${res.emailResult.error}).`;
      }

      setActionSuccessMsg(successMsg);
      setValidationModalOrder(null);
      await loadAdminData();
    } catch (err: any) {
      setActionErrorMsg(`Erreur lors de la validation : ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Action: Refuse Payment with Clear Motif (Part 12)
  const handleConfirmRefusal = async () => {
    if (!refusalModalOrder || !user) return;
    if (!refusalReason.trim()) {
      setActionErrorMsg('Veuillez renseigner un motif de refus explicite pour le client.');
      return;
    }
    setIsProcessingAction(true);
    try {
      await deliveryService.rejectPayment(
        refusalModalOrder,
        {
          id: user.id,
          email: user.email || 'petitsandrino1@gmail.com'
        },
        refusalReason
      );
      setActionSuccessMsg(`Le paiement de la commande ${refusalModalOrder.orderNumber} a été refusé. Notification transmise au client.`);
      setRefusalModalOrder(null);
      setRefusalReason('');
      await loadAdminData();
    } catch (err: any) {
      setActionErrorMsg(`Erreur lors du refus : ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Action: Save Payment Settings
  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingSettings(true);
    try {
      await adminService.updatePaymentSettings(paymentSettings, {
        id: user.id,
        email: user.email || 'petitsandrino1@gmail.com'
      });
      setSettingsSavedMsg('Les coordonnées et paramètres de paiement Mobile Money ont été enregistrés.');
      await loadAdminData();
    } catch (err: any) {
      setActionErrorMsg(`Erreur d'enregistrement : ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Action: Toggle Member Status
  const handleToggleMember = async (member: MemberProfile) => {
    if (!user) return;
    const newStatus = member.status === 'active' ? 'suspended' : 'active';
    const confirmChange = window.confirm(
      `Confirmez-vous le changement de statut pour ${member.full_name || member.email} vers "${newStatus}" ?`
    );
    if (!confirmChange) return;

    try {
      await adminService.toggleMemberStatus(member.id, newStatus, {
        id: user.id,
        email: user.email || 'petitsandrino1@gmail.com'
      });
      setActionSuccessMsg(`Le statut du membre a été mis à jour : ${newStatus}`);
      await loadAdminData();
    } catch (err: any) {
      setActionErrorMsg(`Erreur : ${err.message}`);
    }
  };

  // Action: Upload Product Cover
  const handleProductCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;
    setProductModalError(null);
    setIsUploadingCover(true);
    try {
      const targetId = editingProduct.id || `prod-${Date.now()}`;
      const result = await productService.uploadProductCover(file, targetId);
      setEditingProduct(prev => (prev ? { ...prev, id: targetId, image: result.url } : prev));
    } catch (err: any) {
      setProductModalError(err?.message || "Erreur lors du téléversement de l'image de couverture.");
    } finally {
      setIsUploadingCover(false);
      e.target.value = '';
    }
  };

  // Action: Upload Product Digital File
  const handleProductFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;
    setProductModalError(null);
    setIsUploadingProductFile(true);
    setFileUploadProgress(0);
    try {
      const targetId = editingProduct.id || `prod-${Date.now()}`;
      const result = await productService.uploadProductFile(file, targetId, (pct) => {
        setFileUploadProgress(pct);
      });
      setEditingProduct(prev =>
        prev
          ? {
              ...prev,
              id: targetId,
              filePath: result.filePath,
              fileUrl: result.fileUrl,
              fileName: result.fileName,
              fileSize: result.size,
              format: result.format || prev.format || 'PDF'
            }
          : prev
      );
    } catch (err: any) {
      setProductModalError(err?.message || 'Erreur lors du téléversement du fichier du produit.');
    } finally {
      setIsUploadingProductFile(false);
      setFileUploadProgress(null);
      e.target.value = '';
    }
  };

  // Action: Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name) return;
    setIsSavingProduct(true);
    setProductModalError(null);

    try {
      const productId = editingProduct.id || `prod-${Date.now()}`;
      const finalProduct: Product = {
        id: productId,
        name: editingProduct.name || 'Nouveau Produit',
        category: (editingProduct.category as Category) || 'Guides pratiques',
        price: Number(editingProduct.price) || 0,
        fullDescription: editingProduct.fullDescription || '',
        shortDescription: editingProduct.shortDescription || '',
        format: editingProduct.format || 'PDF',
        image: editingProduct.image || '/src/assets/images/shop_banner_learning_resources_1794250357467.jpg',
        whatWillYouLearn:
          editingProduct.whatWillYouLearn && editingProduct.whatWillYouLearn.length > 0
            ? editingProduct.whatWillYouLearn
            : ['Compétences pratiques', 'Méthodologie clé'],
        advantages:
          editingProduct.advantages && editingProduct.advantages.length > 0
            ? editingProduct.advantages
            : ['Accès permanent', 'Support numérique'],
        fileUrl: editingProduct.fileUrl,
        filePath: editingProduct.filePath,
        fileName: editingProduct.fileName,
        fileSize: editingProduct.fileSize
      };

      const updatedList = await productService.saveProduct(finalProduct, isNewProduct, productsList);
      setProductsList(updatedList);
      setOverview(prev => ({ ...prev, activeProducts: updatedList.length }));

      adminService.logAudit({
        action: isNewProduct ? `Produit ajouté : ${finalProduct.name}` : `Produit modifié : ${finalProduct.name}`,
        target_type: 'product',
        target_id: finalProduct.id,
        admin_id: user?.id || 'admin',
        admin_email: user?.email || 'petitsandrino1@gmail.com',
        details: {
          name: finalProduct.name,
          price: finalProduct.price,
          hasFile: Boolean(finalProduct.filePath || finalProduct.fileUrl)
        }
      });

      setActionSuccessMsg(
        isNewProduct
          ? `Le produit "${finalProduct.name}" a été ajouté au catalogue.`
          : `Le produit "${finalProduct.name}" a été mis à jour.`
      );
      setEditingProduct(null);
    } catch (err: any) {
      setProductModalError(err?.message || "Erreur lors de l'enregistrement du produit.");
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Action: Delete Product
  const handleDeleteProduct = async (id: string) => {
    const prod = productsList.find(p => p.id === id);
    const updatedList = await productService.deleteProduct(id, productsList);
    setProductsList(updatedList);
    setOverview(prev => ({ ...prev, activeProducts: updatedList.length }));
    setProductDeleteConfirmId(null);
    if (prod) {
      adminService.logAudit({
        action: `Produit supprimé : ${prod.name}`,
        target_type: 'product',
        target_id: id,
        admin_id: user?.id || 'admin',
        admin_email: user?.email || 'petitsandrino1@gmail.com',
        details: { name: prod.name }
      });
      setActionSuccessMsg(`Le produit "${prod.name}" a été supprimé.`);
    }
  };

  // Action: Save Service
  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService || !editingService.name) return;

    if (isNewService) {
      const newSrv: Service = {
        id: `service-${Date.now()}`,
        name: editingService.name || 'Nouveau Service',
        category: (editingService.category as ServiceCategory) || 'Accompagnement entrepreneurial',
        shortDescription: editingService.shortDescription || '',
        fullDescription: editingService.fullDescription || '',
        targetAudience: editingService.targetAudience || 'Tous publics',
        included: editingService.included || ['Conseil personnalisé', 'Suivi orienté résultats'],
        objectives: editingService.objectives || ['Développement de compétences'],
        advantages: editingService.advantages || ['Accompagnement pratique'],
        duration: editingService.duration || 'Sur mesure',
        format: editingService.format || 'Séance individuelle'
      };
      setServicesList([...servicesList, newSrv]);
      adminService.logAudit({
        action: `Service ajouté : ${newSrv.name}`,
        target_type: 'service',
        target_id: newSrv.id,
        admin_id: user?.id || 'admin',
        admin_email: user?.email || 'admin',
        details: { name: newSrv.name }
      });
      setActionSuccessMsg(`Le service "${newSrv.name}" a été ajouté.`);
    } else {
      setServicesList(servicesList.map(s => s.id === editingService.id ? { ...s, ...editingService } as Service : s));
      adminService.logAudit({
        action: `Service modifié : ${editingService.name}`,
        target_type: 'service',
        target_id: editingService.id || '',
        admin_id: user?.id || 'admin',
        admin_email: user?.email || 'admin',
        details: { name: editingService.name }
      });
      setActionSuccessMsg(`Le service "${editingService.name}" a été modifié.`);
    }
    setEditingService(null);
  };

  // Action: Save Subscription Plan (Tarif, Cycle & Avantages)
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setPlanModalError(null);
    setIsSavingPlan(true);
    try {
      const normalizedPriceStr = String(editingPlanPrice || '0')
        .replace(/\s+/g, '')
        .replace(',', '.');
      const numericPrice = Number(normalizedPriceStr);
      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        setPlanModalError('Veuillez saisir un montant valide en FCFA (0 ou supérieur).');
        setIsSavingPlan(false);
        return;
      }

      const features = editingPlanFeaturesText
        .split('\n')
        .map(f => f.trim())
        .filter(Boolean);
      const updatedPlan: SubscriptionPlan = {
        ...editingPlan,
        name: editingPlan.name.trim() || 'Formule',
        price: Math.round(numericPrice),
        billingCycle: editingPlan.billingCycle?.trim() || 'Mensuel',
        features: features.length > 0 ? features : editingPlan.features
      };

      const updatedList = await subscriptionService.savePlan(updatedPlan, plansList);
      setPlansList(updatedList);
      setOverview(prev => ({ ...prev, activeSubscriptions: updatedList.length }));

      adminService.logAudit({
        action: `Formule d'abonnement modifiée : ${updatedPlan.name} (${updatedPlan.price.toLocaleString('fr-FR')} FCFA)`,
        target_type: 'subscription',
        target_id: updatedPlan.id,
        admin_id: user?.id || 'admin',
        admin_email: user?.email || 'petitsandrino1@gmail.com',
        details: {
          price: updatedPlan.price,
          billingCycle: updatedPlan.billingCycle,
          featuresCount: updatedPlan.features.length
        }
      });

      setActionSuccessMsg(
        `La formule "${updatedPlan.name}" (${updatedPlan.price.toLocaleString('fr-FR')} FCFA) a été enregistrée.`
      );
      setEditingPlan(null);
    } catch (err: any) {
      setPlanModalError(`Erreur lors de l'enregistrement de la formule : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Navigation Items
  const navTabs = [
    { id: 'overview', label: 'Vue d’ensemble', icon: <LayoutDashboard size={18} /> },
    { id: 'analytics', label: 'Statistiques & Performance', icon: <BarChart2 size={18} /> },
    { 
      id: 'support', 
      label: 'Messages & Assistance', 
      icon: <MessageSquare size={18} />,
      badge: openSupportCount > 0 ? openSupportCount : undefined
    },
    { 
      id: 'declarations', 
      label: 'Paiements à vérifier', 
      icon: <Receipt size={18} />, 
      badge: overview.paymentsToVerify > 0 ? overview.paymentsToVerify : undefined 
    },
    { 
      id: 'orders', 
      label: 'Commandes', 
      icon: <ShoppingBag size={18} />,
      badge: overview.pendingOrders > 0 ? overview.pendingOrders : undefined
    },
    { id: 'products', label: 'Produits numériques', icon: <Package size={18} /> },
    { id: 'services', label: 'Services', icon: <Briefcase size={18} /> },
    { id: 'subscriptions', label: 'Abonnements', icon: <CreditCard size={18} /> },
    { id: 'members', label: 'Membres', icon: <Users size={18} /> },
    { id: 'settings', label: 'Paramètres Mobile Money', icon: <Settings size={18} /> },
    { id: 'logs', label: 'Journal d’audit', icon: <History size={18} /> },
    { id: 'sql_guide', label: 'Configuration Supabase', icon: <Database size={18} /> }
  ];

  // Helper status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'paid_validated':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} />
            Payée et validée
          </span>
        );
      case 'payment_declared':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <Clock size={12} />
            Paiement déclaré
          </span>
        );
      case 'payment_verification':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} />
            En vérification
          </span>
        );
      case 'pending_payment':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock size={12} />
            Attente paiement
          </span>
        );
      case 'failed_cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            <Ban size={12} />
            Refusée / Annulée
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.userName && o.userName.toLowerCase().includes(orderSearch.toLowerCase())) ||
      (o.userEmail && o.userEmail.toLowerCase().includes(orderSearch.toLowerCase()));

    const matchesStatus = 
      orderStatusFilter === 'all' || o.paymentStatus === orderStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filtered Members
  const filteredMembers = members.filter(m => 
    m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.phone.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-brand-grey pt-20 pb-20">
      {/* Top Admin Bar */}
      <div className="bg-brand-navy text-white py-6 px-4 sm:px-6 border-b border-brand-navy/30">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-brand-green/20 border border-brand-green/40 flex items-center justify-center text-brand-green">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                  Administration SANDRINO
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-brand-green text-white">
                  Privé
                </span>
              </div>
              <p className="text-xs text-brand-grey/60 mt-0.5">
                Connecté en tant que <strong className="text-white">{profile?.full_name || user?.email}</strong> (Rôle Administrateur)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAdminData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/20 transition-colors"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <History size={14} />}
              Actualiser les données
            </button>
          </div>
        </div>
      </div>

      {/* Action Toast Feedback */}
      <AnimatePresence>
        {actionSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 right-4 z-50 p-4 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold max-w-md"
          >
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{actionSuccessMsg}</span>
          </motion.div>
        )}
        {actionErrorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 right-4 z-50 p-4 bg-red-600 text-white rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold max-w-md"
          >
            <AlertCircle size={18} className="shrink-0" />
            <span>{actionErrorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-8">
        {/* Supabase Schema Setup Reminder Banner */}
        <div className="mb-8 p-5 bg-blue-50 border border-blue-200 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shrink-0 mt-0.5 shadow-sm">
              <Database size={20} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-blue-950 tracking-wider">
                Configuration des Tables Supabase (Script SQL disponible)
              </h4>
              <p className="text-xs text-blue-900/80 mt-1 leading-relaxed">
                Si vous venez de connecter un projet Supabase, copiez le script SQL prêt à l'emploi (<code>public.profiles</code>, <code>public.orders</code>, <code>public.subscriptions</code>, etc.) et exécutez-le dans l'éditeur SQL de votre tableau de bord Supabase. En attendant, le site fonctionne de façon sécurisée en mode local.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('sql_guide')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shrink-0 shadow-sm"
          >
            <Database size={14} />
            Voir le script SQL
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Mobile Drawer Trigger */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-brand-grey shadow-sm text-brand-navy font-bold text-sm"
            >
              <div className="flex items-center gap-3">
                <Menu size={18} className="text-brand-green" />
                <span>Rubrique : {navTabs.find(t => t.id === activeTab)?.label}</span>
              </div>
              {mobileMenuOpen ? <X size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

          {/* SIDEBAR NAVIGATION (Desktop & Mobile) */}
          <aside className={`lg:col-span-1 ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-3xl p-4 border border-brand-grey shadow-sm sticky top-28 space-y-1">
              <div className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-brand-navy/40 border-b border-brand-grey mb-2">
                Gestion & Contrôle
              </div>

              {navTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as AdminTab);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-brand-navy text-white shadow-sm'
                      : 'text-brand-navy/70 hover:bg-brand-grey hover:text-brand-navy'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={activeTab === tab.id ? 'text-brand-green' : 'text-brand-navy/40'}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </div>

                  {tab.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      activeTab === tab.id
                        ? 'bg-brand-green text-white'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}

              <div className="pt-4 mt-4 border-t border-brand-grey">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div className="font-bold text-brand-navy flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-brand-green" />
                    Sécurité Active
                  </div>
                  <p>Protection RLS Supabase activée. Rôle certifié administrateur.</p>
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN TAB CONTENT */}
          <main className="lg:col-span-3 space-y-8">
            {/* 1. VUE D'ENSEMBLE (OVERVIEW) */}
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                {/* Metric Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {/* Total Membres */}
                  <div className="bg-white p-6 rounded-3xl border border-brand-grey shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold text-brand-navy/40 uppercase tracking-wider">
                        Total Membres
                      </span>
                      <Users size={18} className="text-brand-navy/40" />
                    </div>
                    <div className="text-3xl font-black text-brand-navy tabular-nums">
                      {overview.totalMembers}
                    </div>
                    <p className="text-[11px] text-brand-navy/50 mt-1">Comptes enregistrés</p>
                  </div>

                  {/* Commandes Totales */}
                  <div className="bg-white p-6 rounded-3xl border border-brand-grey shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold text-brand-navy/40 uppercase tracking-wider">
                        Commandes
                      </span>
                      <ShoppingBag size={18} className="text-brand-navy/40" />
                    </div>
                    <div className="text-3xl font-black text-brand-navy tabular-nums">
                      {overview.totalOrders}
                    </div>
                    <p className="text-[11px] text-brand-navy/50 mt-1">
                      {overview.pendingOrders} en attente de paiement
                    </p>
                  </div>

                  {/* Paiements à vérifier */}
                  <div className="bg-white p-6 rounded-3xl border border-amber-200 bg-amber-50/20 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                        Paiements à vérifier
                      </span>
                      <Receipt size={18} className="text-amber-600" />
                    </div>
                    <div className="text-3xl font-black text-amber-900 tabular-nums">
                      {overview.paymentsToVerify}
                    </div>
                    <p className="text-[11px] text-amber-700 mt-1">Déclarations Mobile Money</p>
                  </div>

                  {/* Revenus validés */}
                  <div className="bg-white p-6 rounded-3xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                        Revenus Validés
                      </span>
                      <DollarSign size={18} className="text-emerald-600" />
                    </div>
                    <div className="text-2xl font-black text-emerald-950 tabular-nums">
                      {overview.totalValidatedRevenue.toLocaleString('fr-FR')} <span className="text-xs">FCFA</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-1">Paiements certifiés réels</p>
                  </div>
                </div>

                {/* Secondary counts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-brand-grey flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-brand-navy/40 uppercase tracking-wider block">
                        Produits Numériques Actifs
                      </span>
                      <div className="text-2xl font-extrabold text-brand-navy mt-1">
                        {productsList.length} articles
                      </div>
                    </div>
                    <Package size={28} className="text-brand-green/60" />
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-brand-grey flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-brand-navy/40 uppercase tracking-wider block">
                        Formules d'Abonnement
                      </span>
                      <div className="text-2xl font-extrabold text-brand-navy mt-1">
                        {plansList.length} formules
                      </div>
                    </div>
                    <CreditCard size={28} className="text-brand-green/60" />
                  </div>
                </div>

                {/* Actionable Notice for Pending Payments */}
                {overview.paymentsToVerify > 0 && (
                  <div className="p-6 bg-amber-50 rounded-3xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Clock size={20} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-950">
                          {overview.paymentsToVerify} transfert(s) Mobile Money en attente de vérification
                        </h4>
                        <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                          Des membres ont déclaré avoir envoyé des fonds via T-Money ou Moov Money. Vérifiez la réception sur votre téléphone avant de valider.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setActiveTab('declarations')}
                      variant="secondary"
                      size="sm"
                      className="rounded-xl text-xs font-bold whitespace-nowrap"
                    >
                      Consulter les déclarations
                    </Button>
                  </div>
                )}

                {/* Quick Link to Analytics & Real Revenue Tracking (Part 13) */}
                <div className="p-6 bg-brand-navy rounded-3xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-brand-green/20 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-green/20 border border-brand-green/40 flex items-center justify-center text-brand-green shrink-0">
                      <BarChart2 size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        Statistiques & Performance en temps réel
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-brand-green text-white">
                          Partie 13
                        </span>
                      </h4>
                      <p className="text-xs text-brand-grey/70 mt-0.5">
                        Filtres par période, calcul strict des revenus validés, graphiques d'évolution et classement des ventes.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setActiveTab('analytics')}
                    variant="primary"
                    size="sm"
                    className="rounded-xl text-xs font-bold whitespace-nowrap shadow-sm"
                  >
                    Ouvrir les statistiques complètes
                  </Button>
                </div>

                {/* Quick Link to Messages & Assistance (Part 14) */}
                <div className="p-6 bg-white rounded-3xl border border-brand-grey shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                      <MessageSquare size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-brand-navy flex items-center gap-2">
                        Messages et Assistance Membres & Visiteurs
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          Partie 14
                        </span>
                      </h4>
                      <p className="text-xs text-brand-navy/60 mt-0.5">
                        Consultez les demandes reçues, répondez aux messages et configurez le numéro WhatsApp direct.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setActiveTab('support')}
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs font-bold whitespace-nowrap"
                  >
                    Gérer l'assistance
                  </Button>
                </div>

                {/* Empty State when no real database records exist */}
                {overview.totalOrders === 0 && overview.totalMembers === 0 && (
                  <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-brand-grey">
                    <Info size={32} className="text-brand-navy/30 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-brand-navy mb-1">
                      Aucune donnée disponible pour le moment
                    </h3>
                    <p className="text-xs text-brand-navy/50 max-w-md mx-auto mb-6">
                      Les indicateurs se mettront à jour dès que des membres créeront des comptes et passeront des commandes dans la boutique SANDRINO.
                    </p>
                    <button
                      onClick={() => setActiveTab('sql_guide')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-xl text-xs font-bold hover:bg-brand-navy/90"
                    >
                      <Database size={14} />
                      Vérifier la configuration des tables Supabase
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* STATISTIQUES ET PERFORMANCE (PARTIE 13) */}
            {activeTab === 'analytics' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <AnalyticsView
                  orders={orders}
                  members={members}
                  declarations={declarations}
                  products={productsList}
                  plans={plansList}
                  subscriptions={subscriptionsList}
                />
              </motion.div>
            )}

            {/* MESSAGES ET ASSISTANCE (PARTIE 14) */}
            {activeTab === 'support' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <AdminSupportView />
              </motion.div>
            )}

            {/* 2. GESTION DES COMMANDES (ORDERS) */}
            {activeTab === 'orders' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-grey shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-brand-navy uppercase tracking-tight">
                        Gestion des Commandes
                      </h2>
                      <p className="text-xs text-brand-navy/60">
                        Consultez et suivez toutes les commandes passées sur la plateforme.
                      </p>
                    </div>

                    <div className="text-xs text-brand-navy/50 font-bold">
                      {filteredOrders.length} commande(s) affichée(s)
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/30" size={16} />
                      <input
                        type="text"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        placeholder="Rechercher par N° commande, nom ou email..."
                        className="w-full pl-11 pr-4 py-3 bg-brand-grey border border-brand-grey rounded-2xl text-xs font-medium text-brand-navy focus:outline-none focus:border-brand-green"
                      />
                    </div>

                    <div className="relative">
                      <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/30" size={16} />
                      <select
                        value={orderStatusFilter}
                        onChange={(e) => setOrderStatusFilter(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-brand-grey border border-brand-grey rounded-2xl text-xs font-bold text-brand-navy focus:outline-none focus:border-brand-green uppercase"
                      >
                        <option value="all">Tous les statuts</option>
                        <option value="payment_declared">Paiement déclaré (à vérifier)</option>
                        <option value="pending_payment">En attente de paiement</option>
                        <option value="paid_validated">Payée et validée</option>
                        <option value="failed_cancelled">Refusée / Annulée</option>
                      </select>
                    </div>
                  </div>

                  {/* Orders Table */}
                  {filteredOrders.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-brand-grey text-brand-navy/50 uppercase font-black tracking-wider text-[10px]">
                          <tr>
                            <th className="py-3 px-4 rounded-l-xl">N° Commande</th>
                            <th className="py-3 px-4">Client</th>
                            <th className="py-3 px-4">Article</th>
                            <th className="py-3 px-4">Montant</th>
                            <th className="py-3 px-4">Moyen</th>
                            <th className="py-3 px-4">Statut</th>
                            <th className="py-3 px-4 rounded-r-xl text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-grey">
                          {filteredOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-brand-grey/40 transition-colors">
                              <td className="py-4 px-4 font-mono font-bold text-brand-navy">
                                {order.orderNumber}
                                <span className="block text-[10px] font-sans text-brand-navy/40 font-normal">
                                  {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <strong className="text-brand-navy block">{order.userName || 'Membre'}</strong>
                                <span className="text-[11px] text-brand-navy/60">{order.userEmail || order.userId.slice(0, 8)}</span>
                              </td>
                              <td className="py-4 px-4 text-brand-navy font-medium max-w-xs truncate">
                                {order.items.length > 0 ? order.items.map(i => i.productName).join(', ') : 'Ressource'}
                              </td>
                              <td className="py-4 px-4 font-black text-brand-navy tabular-nums">
                                {order.totalAmount.toLocaleString('fr-FR')} FCFA
                              </td>
                              <td className="py-4 px-4 uppercase font-bold text-[10px] text-brand-navy/70">
                                {order.paymentMethod === 'tmoney' ? 'T-Money' : order.paymentMethod === 'moov' ? 'Moov Money' : (order.paymentMethod || 'Non défini')}
                              </td>
                              <td className="py-4 px-4">
                                {renderStatusBadge(order.paymentStatus)}
                              </td>
                              <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedOrder(order)}
                                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-brand-navy transition-colors inline-block"
                                  title="Voir les détails"
                                >
                                  <Eye size={14} />
                                </button>

                                {(order.paymentStatus === 'payment_declared' || order.paymentStatus === 'payment_verification') && (
                                  <>
                                    <button
                                      onClick={() => setValidationModalOrder(order)}
                                      className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors inline-block"
                                      title="Valider le paiement"
                                    >
                                      <Check size={14} />
                                    </button>
                                    <button
                                      onClick={() => setRefusalModalOrder(order)}
                                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 transition-colors inline-block"
                                      title="Refuser le paiement"
                                    >
                                      <Ban size={14} />
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-16 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-brand-grey">
                      <ShoppingBag size={32} className="text-brand-navy/30 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-brand-navy mb-1">Aucune commande trouvée</h4>
                      <p className="text-xs text-brand-navy/50">
                        {orderSearch || orderStatusFilter !== 'all' 
                          ? 'Modifiez vos critères de recherche ou réinitialisez le filtre.' 
                          : 'Aucune commande enregistrée pour le moment.'}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 3. DÉCLARATIONS DE PAIEMENT MOBILE MONEY */}
            {activeTab === 'declarations' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-grey shadow-sm">
                  <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-black text-brand-navy uppercase tracking-tight mb-2">
                      Déclarations de Paiement Mobile Money
                    </h2>
                    <p className="text-xs text-brand-navy/60 leading-relaxed">
                      Vérifiez les transferts déclarés par les membres. <strong>Important :</strong> Comparez la référence SMS et le montant avec les notifications reçues sur votre téléphone avant toute validation.
                    </p>
                  </div>

                  {/* Security Notice */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 mb-6 text-xs text-blue-900 leading-relaxed">
                    <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Principe de vérification manuelle :</strong> Aucune validation automatique n'est effectuée. Vous devez confirmer vous-même la bonne réception des fonds en FCFA sur le compte T-Money ou Moov Money officiel de SANDRINO.
                    </div>
                  </div>

                  {declarations.length > 0 ? (
                    <div className="space-y-4">
                      {declarations.map((decl) => (
                        <div
                          key={decl.id}
                          className="p-6 rounded-2xl border border-brand-grey bg-brand-grey/30 hover:border-brand-navy/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                        >
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-black text-sm text-brand-navy">
                                {decl.orderNumber}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-navy/10 text-brand-navy">
                                {decl.paymentMethod === 'tmoney' ? 'T-Money (Togocom)' : 'Moov Money (Togo)'}
                              </span>
                              {renderStatusBadge(decl.status)}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-xs">
                              <div>
                                <span className="text-brand-navy/40 uppercase text-[10px] font-bold block">Client</span>
                                <strong className="text-brand-navy">{decl.userName || 'Membre'}</strong>
                                <span className="text-[11px] text-brand-navy/60 block">{decl.userEmail}</span>
                              </div>
                              <div>
                                <span className="text-brand-navy/40 uppercase text-[10px] font-bold block">N° Expéditeur</span>
                                <strong className="text-brand-navy font-mono text-sm">{decl.senderPhone}</strong>
                              </div>
                              <div>
                                <span className="text-brand-navy/40 uppercase text-[10px] font-bold block">Montant Déclaré</span>
                                <strong className="text-brand-green font-black text-sm tabular-nums">
                                  {decl.amountSent.toLocaleString('fr-FR')} FCFA
                                </strong>
                              </div>
                              <div>
                                <span className="text-brand-navy/40 uppercase text-[10px] font-bold block">Réf. SMS / Transaction</span>
                                <strong className="text-brand-navy font-mono text-xs">
                                  {decl.transactionRef || 'Non renseignée'}
                                </strong>
                              </div>
                            </div>

                            <div className="text-[11px] text-brand-navy/50">
                              Date déclarée : {new Date(decl.paymentDate).toLocaleDateString('fr-FR')}
                              {decl.receiptUrl && (
                                <a
                                  href={decl.receiptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-3 text-brand-green font-bold hover:underline"
                                >
                                  Voir le reçu téléversé
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {(decl.status === 'payment_declared' || decl.status === 'payment_verification') && (
                              <>
                                <Button
                                  onClick={() => {
                                    const matchOrder = orders.find(o => o.id === decl.orderId || o.orderNumber === decl.orderNumber);
                                    if (matchOrder) {
                                      setValidationModalOrder(matchOrder);
                                    } else {
                                      setValidationModalOrder({
                                        id: decl.orderId,
                                        orderNumber: decl.orderNumber,
                                        userId: decl.userId,
                                        createdAt: decl.createdAt,
                                        items: [],
                                        totalAmount: decl.amountSent,
                                        orderStatus: 'pending',
                                        paymentStatus: decl.status,
                                        paymentMethod: decl.paymentMethod,
                                        paymentDetails: {
                                          senderPhone: decl.senderPhone,
                                          transactionRef: decl.transactionRef,
                                          paymentDate: decl.paymentDate
                                        }
                                      });
                                    }
                                  }}
                                  variant="secondary"
                                  size="sm"
                                  className="rounded-xl text-xs font-bold"
                                >
                                  <Check size={14} className="mr-1.5" />
                                  Valider
                                </Button>

                                <Button
                                  onClick={() => {
                                    const matchOrder = orders.find(o => o.id === decl.orderId || o.orderNumber === decl.orderNumber);
                                    if (matchOrder) {
                                      setRefusalModalOrder(matchOrder);
                                    } else {
                                      setRefusalModalOrder({
                                        id: decl.orderId,
                                        orderNumber: decl.orderNumber,
                                        userId: decl.userId,
                                        createdAt: decl.createdAt,
                                        items: [],
                                        totalAmount: decl.amountSent,
                                        orderStatus: 'pending',
                                        paymentStatus: decl.status,
                                        paymentMethod: decl.paymentMethod
                                      });
                                    }
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="rounded-xl text-xs font-bold text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <Ban size={14} className="mr-1.5" />
                                  Refuser
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-brand-grey">
                      <Receipt size={32} className="text-brand-navy/30 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-brand-navy mb-1">
                        Aucune déclaration de paiement pour le moment
                      </h4>
                      <p className="text-xs text-brand-navy/50 max-w-sm mx-auto">
                        Dès qu'un client aura déclaré son transfert T-Money ou Moov Money à l'étape 3 du checkout, son signalement apparaîtra ici.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 4. GESTION DES PRODUITS NUMÉRIQUES */}
            {activeTab === 'products' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-grey shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-brand-navy uppercase tracking-tight">
                        Gestion des Produits Numériques
                      </h2>
                      <p className="text-xs text-brand-navy/60">
                        Ajoutez, modifiez ou désactivez les guides, e-books et supports de formation de la boutique.
                      </p>
                    </div>

                    <Button
                      onClick={() => {
                        setIsNewProduct(true);
                        setProductModalError(null);
                        setEditingProduct({
                          id: `prod-${Date.now()}`,
                          name: '',
                          category: 'Guides pratiques',
                          price: 5000,
                          format: 'PDF',
                          shortDescription: '',
                          fullDescription: '',
                          image: '/src/assets/images/shop_banner_learning_resources_1794250357467.jpg',
                          advantages: ['Téléchargement permanent', 'Explications pas à pas'],
                          whatWillYouLearn: ['Compétence clé 1', 'Compétence clé 2']
                        });
                      }}
                      variant="secondary"
                      size="sm"
                      className="rounded-xl text-xs font-bold"
                    >
                      <Plus size={16} className="mr-1.5" />
                      Ajouter un produit
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {productsList.map((prod) => (
                      <div key={prod.id} className="p-6 rounded-3xl bg-brand-grey/40 border border-brand-grey flex flex-col justify-between">
                        <div>
                          <div className="flex gap-4 mb-4">
                            <div className="w-16 h-20 bg-white rounded-xl overflow-hidden shrink-0 shadow-sm border border-brand-grey">
                              <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-grow min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-md">
                                {prod.category} · {prod.format}
                              </span>
                              <h4 className="text-sm font-extrabold text-brand-navy mt-1 leading-snug break-words">
                                {prod.name}
                              </h4>
                              <p className="text-xs font-black mt-1 text-brand-green">
                                {prod.price.toLocaleString('fr-FR')} FCFA
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-brand-navy/60 line-clamp-2 mb-4 leading-relaxed">
                            {prod.shortDescription}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-brand-navy/10 flex items-center justify-between gap-2">
                          {prod.fileName || prod.filePath ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold truncate">
                              <Paperclip size={13} className="shrink-0" />
                              <span className="truncate">{prod.fileName || prod.filePath}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
                              <AlertCircle size={13} className="shrink-0" />
                              <span>Aucun fichier joint</span>
                            </span>
                          )}
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setIsNewProduct(false);
                                setProductModalError(null);
                                setEditingProduct(prod);
                              }}
                              className="p-2 bg-white rounded-xl text-brand-navy hover:text-brand-green border border-brand-grey transition-colors"
                              title="Modifier (couverture, fichier, infos)"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => setProductDeleteConfirmId(prod.id)}
                              className="p-2 bg-white rounded-xl text-red-600 hover:bg-red-50 border border-brand-grey transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 5. GESTION DES SERVICES */}
            {activeTab === 'services' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-grey shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-brand-navy uppercase tracking-tight">
                        Gestion des Services & Accompagnements
                      </h2>
                      <p className="text-xs text-brand-navy/60">
                        Configurez les offres d'accompagnement proposées aux visiteurs.
                      </p>
                    </div>

                    <Button
                      onClick={() => {
                        setIsNewService(true);
                        setEditingService({
                          name: '',
                          category: 'Accompagnement entrepreneurial',
                          shortDescription: '',
                          fullDescription: '',
                          included: ['Point fort 1', 'Point fort 2'],
                          objectives: ['Objectif principal'],
                          advantages: ['Avantage clé'],
                          duration: 'Sur mesure',
                          format: 'En ligne ou présentiel'
                        });
                      }}
                      variant="secondary"
                      size="sm"
                      className="rounded-xl text-xs font-bold"
                    >
                      <Plus size={16} className="mr-1.5" />
                      Ajouter un service
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {servicesList.map((srv) => (
                      <div key={srv.id} className="p-6 rounded-2xl border border-brand-grey bg-brand-grey/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-green">
                            {srv.category}
                          </span>
                          <h4 className="text-base font-bold text-brand-navy mt-0.5">
                            {srv.name}
                          </h4>
                          <p className="text-xs text-brand-navy/60 mt-1 max-w-xl leading-relaxed">
                            {srv.shortDescription}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setIsNewService(false);
                              setEditingService(srv);
                            }}
                            className="px-4 py-2 bg-white rounded-xl text-xs font-bold text-brand-navy border border-brand-grey hover:bg-slate-50 transition-colors"
                          >
                            Modifier
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 6. GESTION DES FORMULES D'ABONNEMENT */}
            {activeTab === 'subscriptions' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-grey shadow-sm">
                  <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-black text-brand-navy uppercase tracking-tight mb-2">
                      Gestion des Formules d'Abonnement
                    </h2>
                    <p className="text-xs text-brand-navy/60 leading-relaxed">
                      Définissez le prix en FCFA, la périodicité (Mensuel, Trimestriel, Annuel...) et les avantages de chaque formule. Les modifications sont immédiatement visibles sur la page Abonnements et au paiement.
                    </p>
                  </div>

                  {plansList.some(p => p.id !== 'free' && p.price <= 0) && (
                    <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
                      <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Tarifs payants à définir :</strong> Certaines formules (Standard ou Premium) ont actuellement un prix à <strong>0 FCFA</strong>. Cliquez sur <strong>« Définir le prix / Modifier »</strong> ci-dessous pour fixer vos tarifs en FCFA.
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plansList.map((plan) => (
                      <div key={plan.id} className={`p-6 rounded-3xl border flex flex-col justify-between ${plan.isHighlighted ? 'border-brand-green bg-emerald-50/20' : 'border-brand-grey bg-brand-grey/20'}`}>
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-green">
                              {plan.id.toUpperCase()}
                            </span>
                            {plan.isHighlighted && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-green text-white">
                                Recommandé
                              </span>
                            )}
                          </div>
                          <h4 className="text-lg font-extrabold text-brand-navy mb-2">
                            {plan.name}
                          </h4>
                          <div className="text-2xl font-black text-brand-navy mb-1">
                            {plan.id !== 'free' && plan.price <= 0 ? (
                              <span className="text-sm font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg inline-block">
                                Prix non défini (0 FCFA)
                              </span>
                            ) : (
                              `${plan.price.toLocaleString('fr-FR')} FCFA`
                            )}
                          </div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-brand-navy/50 mb-4">
                            Cycle : {plan.billingCycle}
                          </div>
                          <ul className="space-y-2 mb-6">
                            {plan.features.map((feat, i) => (
                              <li key={i} className="text-xs text-brand-navy/70 flex items-start gap-2">
                                <Check size={14} className="text-brand-green shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-4 border-t border-brand-navy/10">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPlan({ ...plan });
                              setEditingPlanPrice(String(plan.price ?? 0));
                              setEditingPlanFeaturesText((plan.features || []).join('\n'));
                              setPlanModalError(null);
                            }}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-navy hover:bg-brand-navy/90 text-white text-xs font-bold transition-colors"
                          >
                            <Edit3 size={14} />
                            <span>{plan.id !== 'free' && plan.price <= 0 ? 'Définir le prix / Modifier' : 'Modifier tarif & avantages'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 7. GESTION DES MEMBRES */}
            {activeTab === 'members' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-grey shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-brand-navy uppercase tracking-tight">
                        Gestion des Membres
                      </h2>
                      <p className="text-xs text-brand-navy/60">
                        Consultez la liste des comptes enregistrés. Les mots de passe ne sont jamais consultables ni modifiables.
                      </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-navy/30" size={14} />
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Rechercher membre..."
                        className="w-full pl-9 pr-3 py-2 bg-brand-grey border border-brand-grey rounded-xl text-xs font-medium text-brand-navy focus:outline-none focus:border-brand-green"
                      />
                    </div>
                  </div>

                  {filteredMembers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-brand-grey text-brand-navy/50 uppercase font-black tracking-wider text-[10px]">
                          <tr>
                            <th className="py-3 px-4 rounded-l-xl">Nom & Prénom</th>
                            <th className="py-3 px-4">Adresse E-mail</th>
                            <th className="py-3 px-4">Téléphone</th>
                            <th className="py-3 px-4">Rôle</th>
                            <th className="py-3 px-4">Statut</th>
                            <th className="py-3 px-4 rounded-r-xl text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-grey">
                          {filteredMembers.map((m) => (
                            <tr key={m.id} className="hover:bg-brand-grey/40 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-brand-navy">
                                {m.full_name || 'Non renseigné'}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-brand-navy/70">
                                {m.email}
                              </td>
                              <td className="py-3.5 px-4 font-medium text-brand-navy/70">
                                {m.phone || 'Non renseigné'}
                              </td>
                              <td className="py-3.5 px-4 uppercase text-[10px] font-bold">
                                <span className={m.role === 'admin' ? 'text-brand-green' : 'text-brand-navy/60'}>
                                  {m.role}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  m.status === 'active' 
                                    ? 'bg-emerald-50 text-emerald-700' 
                                    : 'bg-red-50 text-red-700'
                                }`}>
                                  {m.status === 'active' ? 'Actif' : 'Suspendu'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {m.role !== 'admin' && (
                                  <button
                                    onClick={() => handleToggleMember(m)}
                                    className="text-[11px] font-bold text-brand-navy/60 hover:text-brand-navy underline"
                                  >
                                    {m.status === 'active' ? 'Suspendre' : 'Réactiver'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-16 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-brand-grey">
                      <Users size={32} className="text-brand-navy/30 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-brand-navy mb-1">Aucun membre répertorié</h4>
                      <p className="text-xs text-brand-navy/50">
                        Les utilisateurs s'inscrivant sur le site apparaîtront directement ici.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 8. PARAMÈTRES DE PAIEMENT MOBILE MONEY */}
            {activeTab === 'settings' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-grey shadow-sm">
                  <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-black text-brand-navy uppercase tracking-tight mb-2">
                      Paramètres des Coordonnées Mobile Money
                    </h2>
                    <p className="text-xs text-brand-navy/60 leading-relaxed">
                      Configurez les numéros réels de réception T-Money et Moov Money ainsi que le nom du bénéficiaire. Ces coordonnées sont immédiatement répercutées sur la page de paiement public.
                    </p>
                  </div>

                  {/* WhatsApp Quick Link for Owner */}
                  <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <MessageCircle size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-950 uppercase">
                          Contact Propriétaire & Support WhatsApp (+228 92 39 57 27)
                        </h4>
                        <p className="text-[11px] text-emerald-800">
                          Numéro WhatsApp officiel de Pétit SANDRINO pour l'assistance et les tests directs.
                        </p>
                      </div>
                    </div>
                    <a
                      href="https://wa.me/22892395727"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shrink-0"
                    >
                      <MessageCircle size={14} />
                      Ouvrir WhatsApp
                    </a>
                  </div>

                  {settingsSavedMsg && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold">
                      <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                      {settingsSavedMsg}
                    </div>
                  )}

                  <form onSubmit={handleSavePaymentSettings} className="space-y-8">
                    {/* SECTION T-MONEY */}
                    <div className="p-6 rounded-2xl border border-brand-grey bg-brand-grey/20 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-brand-grey">
                        <div className="flex items-center gap-3">
                          <Smartphone className="text-brand-navy" size={20} />
                          <h3 className="text-base font-extrabold text-brand-navy uppercase">
                            Configuration T-Money (Togocom)
                          </h3>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-navy">
                          <input
                            type="checkbox"
                            checked={paymentSettings.tmoney.isEnabled}
                            onChange={(e) => setPaymentSettings({
                              ...paymentSettings,
                              tmoney: { ...paymentSettings.tmoney, isEnabled: e.target.checked }
                            })}
                            className="rounded text-brand-green focus:ring-brand-green h-4 w-4"
                          />
                          Activer T-Money
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                            Numéro T-Money de réception
                          </label>
                          <input
                            type="text"
                            value={paymentSettings.tmoney.recipientNumber}
                            onChange={(e) => setPaymentSettings({
                              ...paymentSettings,
                              tmoney: { ...paymentSettings.tmoney, recipientNumber: e.target.value }
                            })}
                            placeholder="Ex: +228 90 00 00 00"
                            className="w-full px-4 py-3 bg-white border border-brand-grey rounded-xl text-sm font-bold text-brand-navy focus:outline-none focus:border-brand-green"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                            Nom affiché du bénéficiaire
                          </label>
                          <input
                            type="text"
                            value={paymentSettings.tmoney.recipientName}
                            onChange={(e) => setPaymentSettings({
                              ...paymentSettings,
                              tmoney: { ...paymentSettings.tmoney, recipientName: e.target.value }
                            })}
                            placeholder="Ex: SANDRINO / Pétit Sandrino"
                            className="w-full px-4 py-3 bg-white border border-brand-grey rounded-xl text-sm font-bold text-brand-navy focus:outline-none focus:border-brand-green"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                          Instructions affichées au client
                        </label>
                        <textarea
                          rows={2}
                          value={paymentSettings.tmoney.instructions}
                          onChange={(e) => setPaymentSettings({
                            ...paymentSettings,
                            tmoney: { ...paymentSettings.tmoney, instructions: e.target.value }
                          })}
                          className="w-full px-4 py-3 bg-white border border-brand-grey rounded-xl text-xs font-medium text-brand-navy focus:outline-none focus:border-brand-green"
                        />
                      </div>
                    </div>

                    {/* SECTION MOOV MONEY */}
                    <div className="p-6 rounded-2xl border border-brand-grey bg-brand-grey/20 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-brand-grey">
                        <div className="flex items-center gap-3">
                          <Smartphone className="text-brand-navy" size={20} />
                          <h3 className="text-base font-extrabold text-brand-navy uppercase">
                            Configuration Moov Money (Togo)
                          </h3>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-navy">
                          <input
                            type="checkbox"
                            checked={paymentSettings.moov.isEnabled}
                            onChange={(e) => setPaymentSettings({
                              ...paymentSettings,
                              moov: { ...paymentSettings.moov, isEnabled: e.target.checked }
                            })}
                            className="rounded text-brand-green focus:ring-brand-green h-4 w-4"
                          />
                          Activer Moov Money
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                            Numéro Moov Money de réception
                          </label>
                          <input
                            type="text"
                            value={paymentSettings.moov.recipientNumber}
                            onChange={(e) => setPaymentSettings({
                              ...paymentSettings,
                              moov: { ...paymentSettings.moov, recipientNumber: e.target.value }
                            })}
                            placeholder="Ex: +228 99 00 00 00"
                            className="w-full px-4 py-3 bg-white border border-brand-grey rounded-xl text-sm font-bold text-brand-navy focus:outline-none focus:border-brand-green"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                            Nom affiché du bénéficiaire
                          </label>
                          <input
                            type="text"
                            value={paymentSettings.moov.recipientName}
                            onChange={(e) => setPaymentSettings({
                              ...paymentSettings,
                              moov: { ...paymentSettings.moov, recipientName: e.target.value }
                            })}
                            placeholder="Ex: SANDRINO / Pétit Sandrino"
                            className="w-full px-4 py-3 bg-white border border-brand-grey rounded-xl text-sm font-bold text-brand-navy focus:outline-none focus:border-brand-green"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                          Instructions affichées au client
                        </label>
                        <textarea
                          rows={2}
                          value={paymentSettings.moov.instructions}
                          onChange={(e) => setPaymentSettings({
                            ...paymentSettings,
                            moov: { ...paymentSettings.moov, instructions: e.target.value }
                          })}
                          className="w-full px-4 py-3 bg-white border border-brand-grey rounded-xl text-xs font-medium text-brand-navy focus:outline-none focus:border-brand-green"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        disabled={isSavingSettings}
                        variant="secondary"
                        size="md"
                        className="rounded-2xl px-8"
                      >
                        {isSavingSettings ? (
                          <>
                            <Loader2 className="animate-spin mr-2" size={16} />
                            Enregistrement...
                          </>
                        ) : (
                          <>
                            <Save size={16} className="mr-2" />
                            Enregistrer les coordonnées de paiement
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* 9. JOURNAL D'AUDIT ET TRAÇABILITÉ */}
            {activeTab === 'logs' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-grey shadow-sm">
                  <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-black text-brand-navy uppercase tracking-tight mb-2">
                      Journal d’Audit et Traçabilité
                    </h2>
                    <p className="text-xs text-brand-navy/60 leading-relaxed">
                      Historique chronologique et immuable des actions sensibles réalisées par les administrateurs (validations, refus, modifications de tarifs et de coordonnées).
                    </p>
                  </div>

                  {auditLogs.length > 0 ? (
                    <div className="space-y-3">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-4 rounded-2xl bg-brand-grey/30 border border-brand-grey flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-brand-navy">{log.action}</span>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-brand-navy/10 text-brand-navy/70">
                                {log.target_type}
                              </span>
                            </div>
                            <div className="text-[11px] text-brand-navy/60">
                              Par <strong className="text-brand-navy">{log.admin_email}</strong> · Cible : {log.target_id}
                            </div>
                            {log.details && (
                              <pre className="text-[10px] font-mono text-brand-navy/50 bg-white/60 p-2 rounded-lg mt-1 overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>

                          <div className="text-[10px] font-mono text-brand-navy/40 shrink-0">
                            {new Date(log.created_at).toLocaleString('fr-FR')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-brand-grey">
                      <History size={32} className="text-brand-navy/30 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-brand-navy mb-1">Aucune action enregistrée</h4>
                      <p className="text-xs text-brand-navy/50">
                        Les futures validations, refus ou modifications de paramètres généreront automatiquement des entrées de journal ici.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 10. GUIDE DE CONFIGURATION SUPABASE */}
            {activeTab === 'sql_guide' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-grey shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-brand-navy uppercase tracking-tight mb-1">
                        Schéma de Base de Données Supabase & RLS
                      </h2>
                      <p className="text-xs text-brand-navy/60 leading-relaxed">
                        Ce script SQL complet initialise toutes les tables (profiles, orders, subscriptions, purchased_products, payment_declarations, etc.) dans votre projet Supabase.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        const sqlCode = `-- Utilisez le fichier complet supabase-schema.sql à la racine du projet.
-- Extrait principal sécurisé (RLS + is_admin() + Triggers + Storage + Support) :

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public set row_security = off stable as $$
  select (lower(coalesce(auth.jwt() ->> 'email', '')) = 'petitsandrino1@gmail.com')
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Nettoyage des anciennes politiques RLS récursives éventuelles :
do $$
declare pol record;
begin
  for pol in select tablename, policyname from pg_policies where schemaname = 'public'
    and tablename in ('profiles','orders','payment_declarations','purchased_products','subscriptions','member_notifications','payment_settings','admin_audit_logs','support_tickets','support_messages','products','subscription_plans')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- 1. PROFILES & ROLES
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text unique,
  phone text,
  role text not null default 'member' check (role in ('member', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. ORDERS & DECLARATIONS
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  items jsonb not null default '[]'::jsonb,
  total_amount numeric not null check (total_amount >= 0),
  order_status text not null default 'pending',
  payment_status text not null default 'pending_payment',
  payment_method text,
  payment_details jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_declarations (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  order_number text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  user_email text,
  payment_method text not null,
  sender_phone text not null,
  amount_sent numeric not null check (amount_sent >= 0),
  transaction_ref text,
  payment_date date not null default current_date,
  receipt_url text,
  status text not null default 'payment_declared',
  admin_note text,
  created_at timestamptz not null default now()
);

-- 3. PURCHASED PRODUCTS & SUBSCRIPTIONS
create table if not exists public.purchased_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id text not null,
  product_name text not null,
  category text,
  image text,
  format text default 'PDF',
  order_id text,
  file_available boolean default true,
  file_path text,
  purchase_date timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  plan_id text not null default 'free',
  plan_name text not null default 'Formule Gratuite',
  price numeric default 0,
  status text not null default 'active',
  start_date timestamptz not null default now(),
  expiry_date timestamptz,
  features text[] default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. SUPPORT TICKETS & MESSAGES (PARTIE 14)
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  sender_name text not null,
  sender_email text not null,
  sender_phone text,
  category text not null default 'Autre demande',
  subject text not null,
  order_id text,
  status text not null default 'new' check (status in ('new', 'in_progress', 'answered', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.support_tickets(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role text not null check (sender_role in ('visitor', 'member', 'admin')),
  sender_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- 5. CATALOGUE PRODUITS & TARIFS ABONNEMENTS (Visibles publiquement)
create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null default 'Guides pratiques',
  short_description text not null default '',
  full_description text not null default '',
  price numeric not null check (price >= 0),
  image text,
  format text not null default 'PDF',
  what_will_you_learn text[] default array[]::text[],
  advantages text[] default array[]::text[],
  file_url text,
  file_path text,
  file_name text,
  file_size bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
drop policy if exists "Products public read" on public.products;
create policy "Products public read" on public.products for select using (true);
drop policy if exists "Products admin write" on public.products;
create policy "Products admin write" on public.products for all using (public.is_admin());

create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  price numeric not null default 0 check (price >= 0),
  billing_cycle text not null default 'Mensuel',
  features text[] default array[]::text[],
  is_highlighted boolean not null default false,
  sort_order integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.subscription_plans enable row level security;
drop policy if exists "Subscription plans public read" on public.subscription_plans;
create policy "Subscription plans public read" on public.subscription_plans for select using (true);
drop policy if exists "Subscription plans admin write" on public.subscription_plans;
create policy "Subscription plans admin write" on public.subscription_plans for all using (public.is_admin());

-- Attribution administrateur propriétaire :
update public.profiles set role = 'admin' where lower(email) = 'petitsandrino1@gmail.com';`;
                        navigator.clipboard.writeText(sqlCode);
                        setCopiedSql(true);
                        setTimeout(() => setCopiedSql(false), 2500);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-navy hover:bg-brand-navy/90 text-white text-xs font-bold transition-colors shrink-0 shadow-sm"
                    >
                      {copiedSql ? (
                        <>
                          <Check size={14} className="text-brand-green" />
                          <span>Copié dans le presse-papiers !</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copier l'extrait SQL</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mb-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 leading-relaxed">
                    <strong>Note de mise en production :</strong> Pour initialiser l'intégralité de la base (10 tables, fonction sécurisée <code className="font-mono font-bold">is_admin()</code>, triggers anti-escalade de privilèges, synchronisation des déclarations et buckets privés <code className="font-mono font-bold">digital-products</code> / <code className="font-mono font-bold">private_receipts</code>), exécutez le fichier complet <code className="font-mono font-bold">supabase-schema.sql</code> présent à la racine du projet dans votre <strong>Supabase SQL Editor</strong>.
                  </div>

                  <div className="relative">
                    <pre className="p-4 bg-brand-navy text-brand-green font-mono text-xs rounded-2xl overflow-x-auto leading-relaxed max-h-96">
{`-- FONCTION SÉCURISÉE ANTI-RÉCURSION RLS + NETTOYAGE
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public set row_security = off stable as $$
  select (lower(coalesce(auth.jwt() ->> 'email', '')) = 'petitsandrino1@gmail.com')
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

do $$
declare pol record;
begin
  for pol in select tablename, policyname from pg_policies where schemaname = 'public'
    and tablename in ('profiles','orders','payment_declarations','purchased_products','subscriptions','member_notifications','payment_settings','admin_audit_logs','support_tickets','support_messages','products','subscription_plans')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- 1. PROFILES & ROLES
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text unique,
  phone text,
  role text not null default 'member' check (role in ('member', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. ORDERS & PAYMENT DECLARATIONS
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  items jsonb not null default '[]'::jsonb,
  total_amount numeric not null check (total_amount >= 0),
  order_status text not null default 'pending',
  payment_status text not null default 'pending_payment',
  payment_method text,
  payment_details jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_declarations (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  order_number text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  user_email text,
  payment_method text not null,
  sender_phone text not null,
  amount_sent numeric not null check (amount_sent >= 0),
  transaction_ref text,
  payment_date date not null default current_date,
  receipt_url text,
  status text not null default 'payment_declared',
  admin_note text,
  created_at timestamptz not null default now()
);

-- 3. PURCHASED PRODUCTS & SUBSCRIPTIONS
create table if not exists public.purchased_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id text not null,
  product_name text not null,
  category text,
  image text,
  format text default 'PDF',
  order_id text,
  file_available boolean default true,
  file_path text,
  purchase_date timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  plan_id text not null default 'free',
  plan_name text not null default 'Formule Gratuite',
  price numeric default 0,
  status text not null default 'active',
  start_date timestamptz not null default now(),
  expiry_date timestamptz,
  features text[] default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. SUPPORT TICKETS & MESSAGES (PARTIE 14)
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  sender_name text not null,
  sender_email text not null,
  sender_phone text,
  category text not null default 'Autre demande',
  subject text not null,
  order_id text,
  status text not null default 'new' check (status in ('new', 'in_progress', 'answered', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.support_tickets(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role text not null check (sender_role in ('visitor', 'member', 'admin')),
  sender_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- 5. CATALOGUE PRODUITS & TARIFS ABONNEMENTS (Visibles publiquement)
create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null default 'Guides pratiques',
  short_description text not null default '',
  full_description text not null default '',
  price numeric not null check (price >= 0),
  image text,
  format text not null default 'PDF',
  what_will_you_learn text[] default array[]::text[],
  advantages text[] default array[]::text[],
  file_url text,
  file_path text,
  file_name text,
  file_size bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
drop policy if exists "Products public read" on public.products;
create policy "Products public read" on public.products for select using (true);
drop policy if exists "Products admin write" on public.products;
create policy "Products admin write" on public.products for all using (public.is_admin());

create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  price numeric not null default 0 check (price >= 0),
  billing_cycle text not null default 'Mensuel',
  features text[] default array[]::text[],
  is_highlighted boolean not null default false,
  sort_order integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.subscription_plans enable row level security;
drop policy if exists "Subscription plans public read" on public.subscription_plans;
create policy "Subscription plans public read" on public.subscription_plans for select using (true);
drop policy if exists "Subscription plans admin write" on public.subscription_plans;
create policy "Subscription plans admin write" on public.subscription_plans for all using (public.is_admin());

-- 6. RLS, TRIGGERS & STORAGE PRIVÉ
-- Exécuter le fichier complet supabase-schema.sql pour créer :
-- * protect_profile_role_on_update (bloque toute modification de rôle côté client)
-- * sync_order_on_declaration (passe la commande à payment_declared automatiquement)
-- * handle_new_user (crée profil + abonnement gratuit à l'inscription)
-- * buckets 'digital-products', 'product-covers' & 'private_receipts' et leurs politiques RLS

update public.profiles set role = 'admin' where lower(email) = 'petitsandrino1@gmail.com';`}
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}
          </main>
        </div>
      </div>

      {/* MODAL 1: ORDER DETAIL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-brand-grey mb-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-green">Détail Commande</span>
                <h3 className="text-lg font-black text-brand-navy">{selectedOrder.orderNumber}</h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 text-brand-navy/40 hover:text-brand-navy">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 bg-brand-grey/40 rounded-2xl">
                <div>
                  <span className="text-brand-navy/40 uppercase text-[10px] font-bold block">Client</span>
                  <strong className="text-brand-navy">{selectedOrder.userName || 'Membre'}</strong>
                  <span className="text-[11px] text-brand-navy/60 block">{selectedOrder.userEmail}</span>
                </div>
                <div>
                  <span className="text-brand-navy/40 uppercase text-[10px] font-bold block">Date</span>
                  <strong className="text-brand-navy">{new Date(selectedOrder.createdAt).toLocaleString('fr-FR')}</strong>
                </div>
                <div>
                  <span className="text-brand-navy/40 uppercase text-[10px] font-bold block">Total</span>
                  <strong className="text-brand-navy font-bold text-sm">{selectedOrder.totalAmount.toLocaleString('fr-FR')} FCFA</strong>
                </div>
                <div>
                  <span className="text-brand-navy/40 uppercase text-[10px] font-bold block">Statut paiement</span>
                  <div>{renderStatusBadge(selectedOrder.paymentStatus)}</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-brand-navy mb-2 uppercase text-[11px]">Articles commandés</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="p-3 bg-brand-grey rounded-xl flex justify-between items-center">
                      <span className="font-medium text-brand-navy">{it.productName}</span>
                      <strong className="font-bold text-brand-navy">{it.price.toLocaleString('fr-FR')} FCFA</strong>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.paymentDetails && (
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-1.5">
                  <h4 className="font-bold text-blue-950 uppercase text-[11px]">Informations de paiement déclarées</h4>
                  {selectedOrder.paymentDetails.senderPhone && (
                    <div className="text-blue-900">N° Expéditeur : <strong>{selectedOrder.paymentDetails.senderPhone}</strong></div>
                  )}
                  {selectedOrder.paymentDetails.transactionRef && (
                    <div className="text-blue-900 font-mono">Réf SMS : <strong>{selectedOrder.paymentDetails.transactionRef}</strong></div>
                  )}
                  {selectedOrder.paymentDetails.validatedAt && (
                    <div className="text-emerald-800 text-[11px]">
                      Validé le {new Date(selectedOrder.paymentDetails.validatedAt).toLocaleString('fr-FR')} par {selectedOrder.paymentDetails.validatedBy}
                    </div>
                  )}
                  {selectedOrder.paymentDetails.refusalReason && (
                    <div className="text-red-800 text-[11px]">
                      Motif de refus : {selectedOrder.paymentDetails.refusalReason}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-brand-grey flex justify-end">
              <Button onClick={() => setSelectedOrder(null)} variant="outline" size="sm" className="rounded-xl">
                Fermer
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: CONFIRM VALIDATION */}
      {validationModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8">
            <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>

            <h3 className="text-lg font-black text-brand-navy text-center uppercase mb-2">
              Confirmer la validation du paiement
            </h3>

            <p className="text-xs text-brand-navy/70 text-center mb-6 leading-relaxed">
              Avez-vous bien vérifié la réception de <strong>{validationModalOrder.totalAmount.toLocaleString('fr-FR')} FCFA</strong> sur votre compte Mobile Money ?
            </p>

            <div className="p-4 bg-brand-grey rounded-2xl text-xs space-y-1.5 mb-6">
              <div className="flex justify-between">
                <span className="text-brand-navy/50">Commande :</span>
                <strong className="text-brand-navy font-mono">{validationModalOrder.orderNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-navy/50">Montant :</span>
                <strong className="text-brand-green">{validationModalOrder.totalAmount.toLocaleString('fr-FR')} FCFA</strong>
              </div>
              {validationModalOrder.paymentDetails?.senderPhone && (
                <div className="flex justify-between">
                  <span className="text-brand-navy/50">N° Expéditeur :</span>
                  <strong className="text-brand-navy">{validationModalOrder.paymentDetails.senderPhone}</strong>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setValidationModalOrder(null)}
                variant="outline"
                size="md"
                disabled={isProcessingAction}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                Annuler
              </Button>
              <Button
                onClick={handleConfirmValidation}
                variant="secondary"
                size="md"
                disabled={isProcessingAction}
                className="flex-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isProcessingAction ? <Loader2 size={16} className="animate-spin" /> : 'Confirmer la validation'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: CONFIRM REFUSAL */}
      {refusalModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8">
            <div className="h-14 w-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Ban size={32} />
            </div>

            <h3 className="text-lg font-black text-brand-navy text-center uppercase mb-2">
              Refuser le paiement
            </h3>

            <p className="text-xs text-brand-navy/70 text-center mb-6 leading-relaxed">
              Veuillez indiquer le motif du refus pour la commande <strong>{refusalModalOrder.orderNumber}</strong> (fonds non reçus, référence erronée, montant insuffisant, etc.).
            </p>

            <div className="space-y-2 mb-6">
              <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                Motif du refus *
              </label>
              <textarea
                rows={3}
                required
                value={refusalReason}
                onChange={(e) => setRefusalReason(e.target.value)}
                placeholder="Ex: Montant non reçu sur le compte Mobile Money après vérification..."
                className="w-full p-3 bg-brand-grey border border-brand-grey rounded-xl text-xs font-medium text-brand-navy focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setRefusalModalOrder(null);
                  setRefusalReason('');
                }}
                variant="outline"
                size="md"
                disabled={isProcessingAction}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                Annuler
              </Button>
              <Button
                onClick={handleConfirmRefusal}
                variant="secondary"
                size="md"
                disabled={isProcessingAction}
                className="flex-1 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
              >
                {isProcessingAction ? <Loader2 size={16} className="animate-spin" /> : 'Confirmer le refus'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 4: PRODUCT EDIT / ADD */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-brand-grey mb-6">
              <h3 className="text-lg font-black text-brand-navy uppercase">
                {isNewProduct ? 'Ajouter un Produit Numérique' : 'Modifier le Produit'}
              </h3>
              <button onClick={() => setEditingProduct(null)} className="p-2 text-brand-navy/40 hover:text-brand-navy">
                <X size={20} />
              </button>
            </div>

            {productModalError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{productModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-5 text-xs">
              {/* SECTION 1: COUVERTURE DU PRODUIT */}
              <div className="p-4 sm:p-5 rounded-2xl bg-brand-grey/50 border border-brand-grey space-y-3">
                <label className="font-black uppercase tracking-wider text-brand-navy flex items-center gap-2">
                  <Image size={15} className="text-brand-green" />
                  Couverture du produit
                </label>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="w-24 h-32 rounded-2xl overflow-hidden bg-white border border-brand-grey shrink-0 shadow-sm flex items-center justify-center">
                    {editingProduct.image ? (
                      <img
                        src={editingProduct.image}
                        alt="Aperçu de la couverture"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image size={24} className="text-brand-navy/20" />
                    )}
                  </div>
                  <div className="flex-grow w-full space-y-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-navy hover:bg-brand-navy/90 text-white font-bold cursor-pointer transition-colors">
                      {isUploadingCover ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Téléversement en cours...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={15} />
                          <span>Importer une image de couverture</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={handleProductCoverUpload}
                        disabled={isUploadingCover}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-brand-navy/50">
                      Formats acceptés : PNG, JPG, WEBP (recommandé : format portrait 3:4, max 10 Mo).
                    </p>
                    <div>
                      <input
                        type="text"
                        value={editingProduct.image || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                        placeholder="Ou coller une URL d'image (/src/assets/... ou https://...)"
                        className="w-full px-3.5 py-2 bg-white border border-brand-grey rounded-xl font-medium text-brand-navy text-[11px] focus:outline-none focus:border-brand-green"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: FICHIER DU PRODUIT (LIVRÉ AUX ACHETEURS) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-black uppercase tracking-wider text-brand-navy flex items-center gap-2">
                    <Paperclip size={15} className="text-brand-green" />
                    Fichier du produit (livré après validation du paiement)
                  </label>
                  {(editingProduct.fileName || editingProduct.filePath) && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                      Fichier prêt
                    </span>
                  )}
                </div>

                {editingProduct.fileName || editingProduct.filePath ? (
                  <div className="p-3.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-brand-navy truncate">
                          {editingProduct.fileName || editingProduct.filePath}
                        </p>
                        <p className="text-[11px] text-brand-navy/50">
                          Format : <strong>{editingProduct.format || 'PDF'}</strong>
                          {editingProduct.fileSize ? ` · ${productService.formatFileSize(editingProduct.fileSize)}` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProduct({
                          ...editingProduct,
                          fileUrl: undefined,
                          filePath: undefined,
                          fileName: undefined,
                          fileSize: undefined
                        })
                      }
                      className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors shrink-0"
                      title="Retirer le fichier"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-brand-navy/60">
                    Aucun fichier numérique encore importé pour ce produit. Sélectionnez le document final à livrer aux clients après paiement.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green/90 text-white font-bold cursor-pointer transition-colors">
                    {isUploadingProductFile ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>
                          Envoi du fichier{fileUploadProgress !== null ? ` (${fileUploadProgress}%)` : ''}...
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload size={15} />
                        <span>
                          {editingProduct.fileName || editingProduct.filePath
                            ? 'Remplacer le fichier du produit'
                            : 'Importer le fichier du produit'}
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      onChange={handleProductFileUpload}
                      disabled={isUploadingProductFile}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-brand-navy/50">
                    PDF, EPUB, ZIP, DOCX, MP4, MP3 (max 100 Mo)
                  </span>
                </div>

                <div>
                  <input
                    type="text"
                    value={editingProduct.fileUrl && !editingProduct.fileUrl.startsWith('/api/') ? editingProduct.fileUrl : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingProduct({
                        ...editingProduct,
                        fileUrl: val || undefined,
                        fileName: val && !editingProduct.fileName ? val.split('/').pop()?.split('?')[0] || 'Lien externe' : editingProduct.fileName
                      });
                    }}
                    placeholder="Ou coller un lien direct du fichier (https://...)"
                    className="w-full px-3.5 py-2 bg-white border border-emerald-200 rounded-xl font-medium text-brand-navy text-[11px] focus:outline-none focus:border-brand-green"
                  />
                </div>
              </div>

              {/* SECTION 3: INFORMATIONS PRODUIT */}
              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-brand-navy/60">Titre du produit *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="Ex: Le Guide de l'Entrepreneur Digital"
                  className="w-full px-4 py-2.5 bg-brand-grey border border-brand-grey rounded-xl font-bold text-brand-navy focus:outline-none focus:border-brand-green"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-brand-navy/60">Catégorie</label>
                  <select
                    value={editingProduct.category || 'Guides pratiques'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as Category })}
                    className="w-full px-4 py-2.5 bg-brand-grey border border-brand-grey rounded-xl font-medium text-brand-navy focus:outline-none focus:border-brand-green"
                  >
                    <option value="Entrepreneuriat">Entrepreneuriat</option>
                    <option value="Développement personnel">Développement personnel</option>
                    <option value="Bien-être">Bien-être</option>
                    <option value="Formation">Formation</option>
                    <option value="Guides pratiques">Guides pratiques</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-brand-navy/60">Prix (FCFA) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingProduct.price ?? 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-brand-grey border border-brand-grey rounded-xl font-black text-brand-navy focus:outline-none focus:border-brand-green"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-brand-navy/60">Format</label>
                  <input
                    type="text"
                    value={editingProduct.format || 'PDF'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, format: e.target.value })}
                    placeholder="PDF, E-book PDF, ZIP..."
                    className="w-full px-4 py-2.5 bg-brand-grey border border-brand-grey rounded-xl font-bold text-brand-navy focus:outline-none focus:border-brand-green"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-brand-navy/60">Description courte</label>
                <textarea
                  rows={2}
                  value={editingProduct.shortDescription || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, shortDescription: e.target.value })}
                  className="w-full px-4 py-2 bg-brand-grey border border-brand-grey rounded-xl font-medium text-brand-navy focus:outline-none focus:border-brand-green"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-brand-navy/60">Description complète</label>
                <textarea
                  rows={4}
                  value={editingProduct.fullDescription || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, fullDescription: e.target.value })}
                  className="w-full px-4 py-2 bg-brand-grey border border-brand-grey rounded-xl font-medium text-brand-navy focus:outline-none focus:border-brand-green"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey">
                <Button type="button" onClick={() => setEditingProduct(null)} variant="outline" size="sm" className="rounded-xl">
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  disabled={isSavingProduct || isUploadingCover || isUploadingProductFile}
                  className="rounded-xl px-6"
                >
                  {isSavingProduct ? (
                    <>
                      <Loader2 size={15} className="animate-spin mr-1.5" />
                      Enregistrement...
                    </>
                  ) : (
                    'Enregistrer'
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 5: DELETE PRODUCT CONFIRMATION */}
      {productDeleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl max-w-sm w-full p-6 text-center">
            <Trash2 size={32} className="text-red-500 mx-auto mb-3" />
            <h4 className="text-base font-bold text-brand-navy mb-2">Confirmer la suppression</h4>
            <p className="text-xs text-brand-navy/60 mb-6">
              Êtes-vous sûr de vouloir supprimer définitivement ce produit de la boutique ?
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setProductDeleteConfirmId(null)} variant="outline" size="sm" className="flex-1 rounded-xl">
                Annuler
              </Button>
              <Button onClick={() => handleDeleteProduct(productDeleteConfirmId)} variant="secondary" size="sm" className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white">
                Supprimer
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 6: SERVICE EDIT / ADD */}
      {editingService && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-brand-grey mb-6">
              <h3 className="text-lg font-black text-brand-navy uppercase">
                {isNewService ? 'Ajouter une Offre de Service' : 'Modifier l’Offre de Service'}
              </h3>
              <button onClick={() => setEditingService(null)} className="p-2 text-brand-navy/40 hover:text-brand-navy">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-brand-navy/60">Nom du service *</label>
                <input
                  type="text"
                  required
                  value={editingService.name || ''}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  placeholder="Ex: Accompagnement entrepreneurial individuel"
                  className="w-full px-4 py-2.5 bg-brand-grey border border-brand-grey rounded-xl font-bold text-brand-navy focus:outline-none focus:border-brand-green"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-brand-navy/60">Catégorie</label>
                <select
                  value={editingService.category || 'Accompagnement entrepreneurial'}
                  onChange={(e) => setEditingService({ ...editingService, category: e.target.value as ServiceCategory })}
                  className="w-full px-4 py-2.5 bg-brand-grey border border-brand-grey rounded-xl font-medium text-brand-navy focus:outline-none focus:border-brand-green"
                >
                  <option value="Accompagnement entrepreneurial">Accompagnement entrepreneurial</option>
                  <option value="Développement personnel">Développement personnel</option>
                  <option value="Formation et apprentissage">Formation et apprentissage</option>
                  <option value="Conseils et orientation">Conseils et orientation</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-brand-navy/60">Description courte</label>
                <textarea
                  rows={2}
                  value={editingService.shortDescription || ''}
                  onChange={(e) => setEditingService({ ...editingService, shortDescription: e.target.value })}
                  className="w-full px-4 py-2 bg-brand-grey border border-brand-grey rounded-xl font-medium text-brand-navy focus:outline-none focus:border-brand-green"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-brand-navy/60">Description détaillée</label>
                <textarea
                  rows={4}
                  value={editingService.fullDescription || ''}
                  onChange={(e) => setEditingService({ ...editingService, fullDescription: e.target.value })}
                  className="w-full px-4 py-2 bg-brand-grey border border-brand-grey rounded-xl font-medium text-brand-navy focus:outline-none focus:border-brand-green"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey">
                <Button type="button" onClick={() => setEditingService(null)} variant="outline" size="sm" className="rounded-xl">
                  Annuler
                </Button>
                <Button type="submit" variant="secondary" size="sm" className="rounded-xl px-6">
                  Enregistrer
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 7: SUBSCRIPTION PLAN PRICE & FEATURES EDIT */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-brand-grey mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-green block">
                  Tarification Abonnement · {editingPlan.id.toUpperCase()}
                </span>
                <h3 className="text-lg font-black text-brand-navy uppercase">
                  Modifier la Formule
                </h3>
              </div>
              <button onClick={() => setEditingPlan(null)} className="p-2 text-brand-navy/40 hover:text-brand-navy">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              {planModalError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-red-700 text-xs">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{planModalError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-brand-navy/60">Nom de la formule *</label>
                <input
                  type="text"
                  required
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-brand-grey border border-brand-grey rounded-xl font-bold text-brand-navy focus:outline-none focus:border-brand-green"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-brand-navy/60">Prix (FCFA) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={editingPlanPrice}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setEditingPlanPrice(raw);
                      setEditingPlan({ ...editingPlan, price: Number(raw || 0) });
                    }}
                    placeholder="Ex: 5000"
                    className="w-full px-4 py-2.5 bg-brand-grey border border-brand-grey rounded-xl font-black text-brand-navy text-base focus:outline-none focus:border-brand-green"
                  />
                  <p className="text-[10px] text-brand-navy/50">
                    {Number(editingPlanPrice || 0) <= 0
                      ? '0 FCFA = formule gratuite (pas de paiement requis).'
                      : `Montant facturé au client : ${Number(editingPlanPrice || 0).toLocaleString('fr-FR')} FCFA.`}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-brand-navy/60">Cycle / Durée *</label>
                  <input
                    type="text"
                    required
                    value={editingPlan.billingCycle}
                    onChange={(e) => setEditingPlan({ ...editingPlan, billingCycle: e.target.value })}
                    placeholder="Ex: Mensuel, Trimestriel, Annuel, À vie"
                    list="billing-cycle-presets"
                    className="w-full px-4 py-2.5 bg-brand-grey border border-brand-grey rounded-xl font-bold text-brand-navy focus:outline-none focus:border-brand-green"
                  />
                  <datalist id="billing-cycle-presets">
                    <option value="Mensuel (30 jours)" />
                    <option value="Trimestriel (90 jours)" />
                    <option value="Semestriel (180 jours)" />
                    <option value="Annuel (1 an)" />
                    <option value="À vie" />
                  </datalist>
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-brand-grey/50 border border-brand-grey cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editingPlan.isHighlighted)}
                  onChange={(e) => setEditingPlan({ ...editingPlan, isHighlighted: e.target.checked })}
                  className="rounded text-brand-green focus:ring-brand-green h-4 w-4"
                />
                <span className="font-bold text-brand-navy">
                  Mettre cette formule en avant (badge « Recommandé »)
                </span>
              </label>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-brand-navy/60">
                  Avantages inclus (un par ligne)
                </label>
                <textarea
                  rows={5}
                  value={editingPlanFeaturesText}
                  onChange={(e) => setEditingPlanFeaturesText(e.target.value)}
                  placeholder="Accès aux ressources exclusives&#10;Support prioritaire"
                  className="w-full px-4 py-2.5 bg-brand-grey border border-brand-grey rounded-xl font-medium text-brand-navy focus:outline-none focus:border-brand-green leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey">
                <Button type="button" onClick={() => setEditingPlan(null)} variant="outline" size="sm" className="rounded-xl">
                  Annuler
                </Button>
                <Button type="submit" variant="secondary" size="sm" disabled={isSavingPlan} className="rounded-xl px-6">
                  {isSavingPlan ? (
                    <>
                      <Loader2 size={15} className="animate-spin mr-1.5" />
                      Enregistrement...
                    </>
                  ) : (
                    'Enregistrer le tarif'
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
