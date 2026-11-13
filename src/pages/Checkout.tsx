import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { PRODUCTS } from '../data/products';
import { productService } from '../lib/productService';
import { subscriptionService } from '../lib/subscriptionService';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../data/subscriptions';
import { PAYMENT_METHODS_CONFIG, PaymentMethodConfig, OrderPaymentStatus } from '../data/payments';
import { adminService } from '../lib/adminService';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronLeft, 
  ShieldCheck, 
  Smartphone, 
  Copy, 
  Check, 
  FileText, 
  Loader2, 
  Upload, 
  Info, 
  ArrowRight,
  CreditCard
} from 'lucide-react';

export const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, isConfigured } = useAuth();

  const productId = searchParams.get('product');
  const planId = searchParams.get('plan');
  const orderIdParam = searchParams.get('order');

  // Order item resolution
  const [itemDetails, setItemDetails] = useState<{
    id: string;
    name: string;
    price: number;
    type: 'product' | 'subscription';
    format?: string;
    image?: string;
  } | null>(null);

  // Checkout flow state
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [createdOrderId, setCreatedOrderId] = useState<string>('');
  const [step, setStep] = useState<'review' | 'payment_method' | 'instructions' | 'declare' | 'confirmed'>('review');
  const [selectedMethod, setSelectedMethod] = useState<'tmoney' | 'moov'>('tmoney');
  const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [methodsConfig, setMethodsConfig] = useState<PaymentMethodConfig[]>(PAYMENT_METHODS_CONFIG);

  // Load live payment coordinates from database or admin configuration
  useEffect(() => {
    adminService.getPaymentSettings().then((settings) => {
      const updatedMethods: PaymentMethodConfig[] = [
        {
          id: 'tmoney',
          name: 'T-Money',
          provider: 'T-Money (Togocom)',
          recipientNumber: settings.tmoney.recipientNumber || '',
          recipientName: settings.tmoney.recipientName || '',
          instructions: settings.tmoney.instructions || PAYMENT_METHODS_CONFIG[0].instructions,
          isEnabled: settings.tmoney.isEnabled,
          color: '#0055A5',
          ussdHint: '*145#'
        },
        {
          id: 'moov',
          name: 'Moov Money',
          provider: 'Moov Money (Togo)',
          recipientNumber: settings.moov.recipientNumber || '',
          recipientName: settings.moov.recipientName || '',
          instructions: settings.moov.instructions || PAYMENT_METHODS_CONFIG[1].instructions,
          isEnabled: settings.moov.isEnabled,
          color: '#005BA6',
          ussdHint: '*155#'
        }
      ];
      setMethodsConfig(updatedMethods);

      setSelectedMethod((prev) => {
        const currentEnabled = updatedMethods.find(m => m.id === prev && m.isEnabled);
        if (currentEnabled) return prev;
        const firstEnabled = updatedMethods.find(m => m.isEnabled);
        return firstEnabled ? firstEnabled.id : prev;
      });
    });
  }, []);

  // Payment Declaration Form State
  const [senderPhone, setSenderPhone] = useState<string>(profile?.phone || '');
  const [amountSent, setAmountSent] = useState<number>(0);
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmittingDeclaration, setIsSubmittingDeclaration] = useState<boolean>(false);
  const [declarationError, setDeclarationError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Initialize Item Details
  useEffect(() => {
    if (productId) {
      const syncCatalog = productService.getProductsSync();
      const applyProd = (prod?: (typeof PRODUCTS)[number]) => {
        if (prod) {
          setItemDetails({
            id: prod.id,
            name: prod.name,
            price: prod.price,
            type: 'product',
            format: prod.format,
            image: prod.image
          });
          setAmountSent(prod.price);
        }
      };

      applyProd(syncCatalog.find(p => p.id === productId) || PRODUCTS.find(p => p.id === productId));
      productService.getProducts().then((liveCatalog) => {
        const liveMatch = liveCatalog.find(p => p.id === productId);
        if (liveMatch) applyProd(liveMatch);
      }).catch(() => {});
    } else if (planId) {
      const applyPlan = (plan?: SubscriptionPlan) => {
        if (plan) {
          setItemDetails({
            id: plan.id,
            name: plan.name,
            price: plan.price,
            type: 'subscription'
          });
          setAmountSent(plan.price);
        }
      };

      const syncPlans = subscriptionService.getPlansSync();
      applyPlan(syncPlans.find(p => p.id === planId) || SUBSCRIPTION_PLANS.find(p => p.id === planId));
      subscriptionService.getPlans().then((livePlans) => {
        const liveMatch = livePlans.find(p => p.id === planId);
        if (liveMatch) applyPlan(liveMatch);
      }).catch(() => {});
    }
  }, [productId, planId]);

  // Load existing order if orderIdParam provided
  useEffect(() => {
    const loadExistingOrder = async () => {
      if (!orderIdParam || !user || !isConfigured) return;

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderIdParam)
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          setCreatedOrderId(data.id);
          setOrderNumber(data.order_number);
          if (data.items && data.items[0]) {
            setItemDetails({
              id: data.items[0].productId,
              name: data.items[0].productName,
              price: data.items[0].price,
              type: data.items[0].itemType || 'product'
            });
            setAmountSent(data.items[0].price);
          }
          if (data.payment_method) {
            setSelectedMethod(data.payment_method as any);
          }
          if (data.payment_status === 'payment_declared' || data.payment_status === 'payment_verification') {
            setStep('confirmed');
          } else {
            setStep('instructions');
          }
        }
      } catch (err) {
        console.error('Error loading order:', err);
      }
    };

    loadExistingOrder();
  }, [orderIdParam, user, isConfigured]);

  const handleCreateOrder = async () => {
    setOrderError(null);
    if (!itemDetails || !user) return;

    const activeMethod = methodsConfig.find(m => m.id === selectedMethod && m.isEnabled);
    if (!activeMethod) {
      setOrderError("Aucun moyen de paiement Mobile Money n'est actuellement activé par l'administrateur. Veuillez nous contacter.");
      return;
    }

    // Free plan bypasses payment
    if (itemDetails.price === 0) {
      setOrderError("Cette formule est gratuite. Elle est déjà active sur votre compte.");
      return;
    }

    setIsCreatingOrder(true);
    const generatedOrderNumber = `SND-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // Verify canonical price against server API before saving order
    let verifiedPrice = itemDetails.price;
    let verifiedName = itemDetails.name;
    try {
      const verifyRes = await fetch('/api/orders/verify-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: itemDetails.type,
          itemId: itemDetails.id
        })
      });
      if (verifyRes.ok) {
        const verifyJson = await verifyRes.json();
        if (verifyJson?.verified && typeof verifyJson.price === 'number') {
          verifiedPrice = verifyJson.price;
          verifiedName = verifyJson.name || verifiedName;
          setAmountSent(verifiedPrice);
          setItemDetails(prev => prev ? { ...prev, price: verifiedPrice, name: verifiedName } : prev);
        }
      }
    } catch {
      // Fallback to catalog item price if API route is temporarily unreachable
    }

    try {
      let createdOrder: any = null;
      const isValidUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);

      if (isConfigured && isValidUserUuid) {
        try {
          const { data, error } = await supabase
            .from('orders')
            .insert([
              {
                order_number: generatedOrderNumber,
                user_id: user.id,
                items: [
                  {
                    productId: itemDetails.id,
                    productName: verifiedName,
                    price: verifiedPrice,
                    itemType: itemDetails.type,
                    format: itemDetails.format,
                    image: itemDetails.image
                  }
                ],
                total_amount: verifiedPrice,
                order_status: 'pending',
                payment_status: 'pending_payment',
                payment_method: selectedMethod
              }
            ])
            .select()
            .single();

          if (error) {
            const errMsg = (error.message || '').toLowerCase();
            const isRecoverableRlsOrSchemaErr =
              error.code === 'PGRST205' ||
              error.code === '42P17' ||
              errMsg.includes('schema cache') ||
              errMsg.includes('infinite recursion') ||
              errMsg.includes('does not exist');
            if (isRecoverableRlsOrSchemaErr) {
              console.warn(`Supabase orders notice (${error.code || 'RLS'}): passage en mode local sécurisé.`, error.message);
            } else {
              throw error;
            }
          } else if (data) {
            createdOrder = data;
          }
        } catch (supabaseErr: any) {
          const errMsg = (supabaseErr?.message || '').toLowerCase();
          if (
            supabaseErr?.code === 'PGRST205' ||
            supabaseErr?.code === '42P17' ||
            errMsg.includes('schema cache') ||
            errMsg.includes('infinite recursion')
          ) {
            console.warn('Supabase orders fallback:', supabaseErr.message);
          } else {
            throw supabaseErr;
          }
        }
      }

      // If Supabase table is not yet created, keys not configured, or RLS migration pending, persist safely in local storage
      if (!createdOrder) {
        createdOrder = {
          id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          order_number: generatedOrderNumber,
          orderNumber: generatedOrderNumber,
          user_id: user.id,
          userId: user.id,
          userName: profile?.full_name || user.email?.split('@')[0],
          userEmail: user.email,
          items: [
            {
              productId: itemDetails.id,
              productName: verifiedName,
              price: verifiedPrice,
              itemType: itemDetails.type,
              format: itemDetails.format,
              image: itemDetails.image
            }
          ],
          total_amount: verifiedPrice,
          totalAmount: verifiedPrice,
          order_status: 'pending',
          orderStatus: 'pending',
          payment_status: 'pending_payment',
          paymentStatus: 'pending_payment',
          payment_method: selectedMethod,
          paymentMethod: selectedMethod,
          created_at: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };

        try {
          const raw = localStorage.getItem('sandrino_orders') || '[]';
          const list = JSON.parse(raw);
          list.unshift(createdOrder);
          localStorage.setItem('sandrino_orders', JSON.stringify(list));
        } catch (e) {}
      }

      setCreatedOrderId(createdOrder.id);
      setOrderNumber(createdOrder.order_number || generatedOrderNumber);
      setStep('instructions');
    } catch (err: any) {
      console.error('Order creation error:', err);
      setOrderError("Erreur lors de la création de la commande : " + (err.message || "Veuillez réessayer."));
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmitDeclaration = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeclarationError(null);

    if (!senderPhone.trim()) {
      setDeclarationError("Veuillez renseigner le numéro de téléphone émetteur du transfert.");
      return;
    }

    if (amountSent <= 0 || (itemDetails && amountSent !== itemDetails.price)) {
      setDeclarationError(`Le montant déclaré (${amountSent.toLocaleString('fr-FR')} FCFA) doit correspondre exactement au montant de la commande.`);
      return;
    }

    setIsSubmittingDeclaration(true);

    try {
      let receiptUrl: string | undefined = undefined;

      // Upload receipt file to Supabase Private Storage if configured and provided
      if (receiptFile && isConfigured) {
        const fileExt = receiptFile.name.split('.').pop();
        const filePath = `receipts/${user?.id}/${orderNumber}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('private_receipts')
          .upload(filePath, receiptFile);

        if (!uploadError) {
          receiptUrl = filePath;
        } else {
          console.warn("Receipt upload notice:", uploadError.message);
        }
      }

      // Record declaration in Supabase if configured with valid UUIDs
      const isValidUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user?.id || '');
      const isValidOrderUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(createdOrderId || '');

      if (isConfigured && createdOrderId && isValidUserUuid) {
        try {
          // 1. Record in payment_declarations
          await supabase
            .from('payment_declarations')
            .insert([
              {
                order_id: createdOrderId,
                order_number: orderNumber,
                user_id: user?.id,
                user_email: user?.email,
                payment_method: selectedMethod,
                sender_phone: senderPhone.trim(),
                amount_sent: amountSent,
                transaction_ref: transactionRef.trim() || null,
                payment_date: paymentDate,
                receipt_url: receiptUrl,
                status: 'payment_declared'
              }
            ]);

          // 2. Update order payment status
          await supabase
            .from('orders')
            .update({
              payment_status: 'payment_declared',
              payment_method: selectedMethod,
              payment_details: {
                senderPhone: senderPhone.trim(),
                transactionRef: transactionRef.trim() || undefined,
                paymentDate,
                receiptUrl
              }
            })
            .eq('id', createdOrderId);
        } catch (supabaseErr) {
          console.warn("Notice: Table payment_declarations ou orders non synchronisée. Enregistrement local.");
        }
      }

      // Always save to local declarations fallback for offline / preview resilience
      try {
        const localDecl = {
          id: `decl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          orderId: createdOrderId,
          orderNumber,
          userId: user?.id,
          userEmail: user?.email,
          userName: profile?.full_name || user?.email?.split('@')[0],
          paymentMethod: selectedMethod,
          senderPhone: senderPhone.trim(),
          amountSent,
          transactionRef: transactionRef.trim() || null,
          paymentDate,
          receiptUrl,
          status: 'payment_declared',
          createdAt: new Date().toISOString()
        };
        const raw = localStorage.getItem('sandrino_payment_declarations') || '[]';
        const list = JSON.parse(raw);
        list.unshift(localDecl);
        localStorage.setItem('sandrino_payment_declarations', JSON.stringify(list));

        // Update local order status if order exists in sandrino_orders
        const rawOrders = localStorage.getItem('sandrino_orders') || '[]';
        const ordersList = JSON.parse(rawOrders);
        const targetOrder = ordersList.find((o: any) => o.id === createdOrderId || o.orderNumber === orderNumber);
        if (targetOrder) {
          targetOrder.payment_status = 'payment_declared';
          targetOrder.paymentStatus = 'payment_declared';
          targetOrder.payment_method = selectedMethod;
          targetOrder.paymentMethod = selectedMethod;
          targetOrder.paymentDetails = {
            senderPhone: senderPhone.trim(),
            transactionRef: transactionRef.trim() || undefined,
            paymentDate,
            receiptUrl
          };
          localStorage.setItem('sandrino_orders', JSON.stringify(ordersList));
        }
      } catch (e) {}

      setStep('confirmed');
    } catch (err: any) {
      setDeclarationError(err.message || "Erreur lors de l'enregistrement de votre déclaration de paiement.");
    } finally {
      setIsSubmittingDeclaration(false);
    }
  };

  const currentMethodConfig: PaymentMethodConfig = 
    methodsConfig.find(m => m.id === selectedMethod) || methodsConfig[0];

  if (!itemDetails && !orderIdParam) {
    return (
      <div className="min-h-screen bg-brand-grey flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-3xl border border-brand-grey max-w-md w-full">
          <Info size={40} className="text-brand-green mx-auto mb-4" />
          <h2 className="text-xl font-bold text-brand-navy mb-2">Aucun article sélectionné</h2>
          <p className="text-xs text-brand-navy/60 mb-6">
            Veuillez choisir un produit dans la boutique ou une formule dans les abonnements.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/shop">
              <Button variant="secondary" size="sm">Boutique</Button>
            </Link>
            <Link to="/subscriptions">
              <Button variant="outline" size="sm">Abonnements</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-grey pt-28 pb-20 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link 
          to="/shop" 
          className="inline-flex items-center gap-2 text-brand-navy/40 hover:text-brand-green font-bold text-xs uppercase tracking-widest mb-6 transition-colors"
        >
          <ChevronLeft size={16} />
          Retour au catalogue
        </Link>

        {/* Progress Tracker */}
        <div className="mb-8 bg-white p-4 rounded-2xl border border-brand-grey shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between min-w-[280px] text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-brand-navy/40">
            <span className={step === 'review' ? 'text-brand-green font-extrabold' : ''}>1. Récapitulatif</span>
            <span className={step === 'instructions' ? 'text-brand-green font-extrabold' : ''}>2. Transfert</span>
            <span className={step === 'declare' ? 'text-brand-green font-extrabold' : ''}>3. Déclaration</span>
            <span className={step === 'confirmed' ? 'text-brand-green font-extrabold' : ''}>4. Vérification</span>
          </div>
        </div>

        {/* STEP 1: REVIEW & METHOD SELECTION */}
        {step === 'review' && itemDetails && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white p-6 sm:p-8 md:p-10 rounded-[2.5rem] border border-brand-grey shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-green block mb-2">
                Étape 1 sur 3
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-brand-navy uppercase tracking-tight mb-2 leading-tight break-words">
                Récapitulatif de votre commande
              </h1>
              <p className="text-xs text-brand-navy/60 mb-8">
                Vérifiez les détails de l'article avant d'initialiser le paiement Mobile Money manuel.
              </p>

              {/* Order Card */}
              <div className="p-6 rounded-2xl bg-brand-grey border border-brand-grey mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-navy/40 block">
                    {itemDetails.type === 'product' ? 'Produit Numérique' : 'Abonnement'}
                  </span>
                  <h3 className="text-lg font-bold text-brand-navy mt-1">
                    {itemDetails.name}
                  </h3>
                  {itemDetails.format && (
                    <span className="text-xs text-brand-navy/60 block mt-1">
                      Format : {itemDetails.format} · Accès sécurisé
                    </span>
                  )}
                </div>
                <div className="text-left md:text-right">
                  <span className="text-xs text-brand-navy/40 uppercase block">Montant</span>
                  <span className="text-2xl font-black text-brand-navy">
                    {itemDetails.price.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              {/* Payment Method Choice */}
              <div className="mb-8">
                <h3 className="text-xs font-black uppercase tracking-wider text-brand-navy mb-4">
                  Sélectionnez votre moyen de paiement Mobile Money (Togo) :
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {methodsConfig.filter(m => m.isEnabled).map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethod(method.id)}
                      className={`p-6 rounded-2xl border text-left flex items-start justify-between transition-all ${
                        selectedMethod === method.id
                          ? 'border-brand-green bg-brand-green/5 ring-2 ring-brand-green/20'
                          : 'border-brand-grey bg-white hover:border-brand-navy/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Smartphone size={18} className={selectedMethod === method.id ? 'text-brand-green' : 'text-brand-navy/40'} />
                          <span className="text-sm font-extrabold text-brand-navy">{method.name}</span>
                        </div>
                        <span className="text-xs text-brand-navy/50">{method.provider}</span>
                        <span className="text-[10px] text-brand-navy/40 block mt-2 font-mono">Syntaxe USSD : {method.ussdHint}</span>
                      </div>
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedMethod === method.id ? 'border-brand-green bg-brand-green text-white' : 'border-brand-grey'
                      }`}>
                        {selectedMethod === method.id && <Check size={12} strokeWidth={3} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Integrity Notice */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 mb-6">
                <ShieldCheck className="text-brand-navy/60 shrink-0 mt-0.5" size={18} />
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  Le montant à payer est vérifié et certifié côté serveur. Tout transfert inférieur ne pourra donner lieu à la validation de la commande.
                </p>
              </div>

              {orderError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-xs">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{orderError}</span>
                </div>
              )}

              <Button
                onClick={handleCreateOrder}
                disabled={isCreatingOrder}
                variant="secondary"
                size="lg"
                className="w-full h-16 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-brand-green/20"
              >
                {isCreatingOrder ? (
                  <>
                    <Loader2 className="animate-spin mr-3" size={18} />
                    Génération de la commande...
                  </>
                ) : (
                  <>
                    Continuer vers les instructions
                    <ArrowRight size={18} className="ml-2" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: INSTRUCTIONS */}
        {step === 'instructions' && itemDetails && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white p-6 sm:p-8 md:p-10 rounded-[2.5rem] border border-brand-grey shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-green block mb-2">
                Étape 2 sur 3
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-brand-navy uppercase tracking-tight mb-2 leading-tight break-words">
                Instructions de transfert {currentMethodConfig.name}
              </h1>
              <p className="text-xs text-brand-navy/60 mb-8">
                Effectuez votre transfert manuel depuis votre téléphone avec les coordonnées ci-dessous.
              </p>

              {/* Order Reference Badge */}
              <div className="mb-6 p-4 bg-brand-navy text-white rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-brand-grey/60 block">Numéro de Commande Unique</span>
                  <span className="text-sm md:text-base font-mono font-bold text-brand-green">{orderNumber}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(orderNumber, 'orderNumber')}
                  className="p-2 text-white/70 hover:text-white bg-white/10 rounded-xl transition-colors"
                  title="Copier le numéro"
                >
                  {copiedField === 'orderNumber' ? <Check size={16} className="text-brand-green" /> : <Copy size={16} />}
                </button>
              </div>

              {/* Transfer Details Card */}
              <div className="p-8 rounded-3xl bg-brand-grey border border-brand-grey space-y-6 mb-8">
                {/* Montant exact */}
                <div className="flex items-center justify-between pb-4 border-b border-brand-navy/10">
                  <span className="text-xs font-bold text-brand-navy/60 uppercase">Montant exact à envoyer</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-brand-navy">
                      {itemDetails.price.toLocaleString('fr-FR')} FCFA
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(itemDetails.price.toString(), 'amount')}
                      className="p-1.5 text-brand-navy/40 hover:text-brand-navy"
                    >
                      {copiedField === 'amount' ? <Check size={14} className="text-brand-green" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Numéro de réception */}
                <div className="flex items-center justify-between pb-4 border-b border-brand-navy/10">
                  <div>
                    <span className="text-xs font-bold text-brand-navy/60 uppercase block">Numéro Mobile Money de réception</span>
                    <span className="text-xs text-brand-navy/40">
                      {currentMethodConfig.recipientNumber ? currentMethodConfig.provider : 'À renseigner par l\'administrateur'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-mono font-extrabold text-brand-navy">
                      {currentMethodConfig.recipientNumber || 'Numéro en attente de configuration'}
                    </span>
                    {currentMethodConfig.recipientNumber && (
                      <button
                        type="button"
                        onClick={() => handleCopy(currentMethodConfig.recipientNumber, 'recipientNumber')}
                        className="p-1.5 text-brand-navy/40 hover:text-brand-navy"
                      >
                        {copiedField === 'recipientNumber' ? <Check size={14} className="text-brand-green" /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Nom du Bénéficiaire */}
                <div className="flex items-center justify-between pb-4 border-b border-brand-navy/10">
                  <span className="text-xs font-bold text-brand-navy/60 uppercase">Nom du Bénéficiaire</span>
                  <span className="text-sm font-bold text-brand-navy">
                    {currentMethodConfig.recipientName || 'SANDRINO'}
                  </span>
                </div>

                {/* Instructions text */}
                <div>
                  <span className="text-xs font-bold text-brand-navy/60 uppercase block mb-2">Instructions pour effectuer le transfert</span>
                  <p className="text-xs text-brand-navy/70 leading-relaxed bg-white p-4 rounded-xl border border-brand-grey">
                    {currentMethodConfig.instructions}
                  </p>
                </div>
              </div>

              {/* Warning note */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 mb-8">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-900 leading-relaxed">
                  <strong>Important :</strong> Effectuez votre transfert depuis votre téléphone. Une fois le transfert réalisé, cliquez sur le bouton ci-dessous pour déclarer votre paiement avec votre numéro et référence.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => setStep('review')}
                  variant="outline"
                  size="lg"
                  className="rounded-2xl"
                >
                  Modifier le moyen
                </Button>
                <Button
                  onClick={() => setStep('declare')}
                  variant="secondary"
                  size="lg"
                  className="flex-grow rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-brand-green/20"
                >
                  J'ai effectué le paiement
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: PAYMENT DECLARATION FORM */}
        {step === 'declare' && itemDetails && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white p-6 sm:p-8 md:p-10 rounded-[2.5rem] border border-brand-grey shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-green block mb-2">
                Étape 3 sur 3
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-brand-navy uppercase tracking-tight mb-2 leading-tight break-words">
                Déclaration de votre paiement
              </h1>
              <p className="text-xs text-brand-navy/60 mb-6">
                Renseignez les détails de votre transfert pour permettre à notre équipe de vérifier et valider votre commande <strong className="text-brand-navy">{orderNumber}</strong>.
              </p>

              {declarationError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-xs">
                  <AlertCircle size={18} className="shrink-0 text-red-600" />
                  <span className="font-medium">{declarationError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitDeclaration} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Moyen de paiement sélectionné */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                      Moyen de Paiement Utilisé
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${currentMethodConfig.name} (${currentMethodConfig.provider})`}
                      className="w-full px-4 py-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-brand-navy/70 cursor-not-allowed"
                    />
                  </div>

                  {/* Numéro de téléphone émetteur */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                      Numéro ayant envoyé l'argent *
                    </label>
                    <input
                      required
                      type="tel"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="+228 90 00 00 00"
                      className="w-full px-4 py-3.5 bg-brand-grey border border-brand-grey rounded-2xl text-sm font-medium text-brand-navy focus:outline-none focus:border-brand-green"
                    />
                  </div>

                  {/* Montant envoyé */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                      Montant envoyé en FCFA *
                    </label>
                    <input
                      required
                      type="number"
                      value={amountSent}
                      onChange={(e) => setAmountSent(Number(e.target.value))}
                      className="w-full px-4 py-3.5 bg-brand-grey border border-brand-grey rounded-2xl text-sm font-black text-brand-navy focus:outline-none focus:border-brand-green"
                    />
                  </div>

                  {/* Date du paiement */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                      Date du paiement *
                    </label>
                    <input
                      required
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-4 py-3.5 bg-brand-grey border border-brand-grey rounded-2xl text-sm font-medium text-brand-navy focus:outline-none focus:border-brand-green"
                    />
                  </div>
                </div>

                {/* Référence de Transaction */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                    Référence de Transaction SMS / ID Transaction (facultatif mais recommandé)
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="Ex: T240801.123456 ou MP240801..."
                    className="w-full px-4 py-3.5 bg-brand-grey border border-brand-grey rounded-2xl text-sm font-mono text-brand-navy focus:outline-none focus:border-brand-green"
                  />
                  <p className="text-[10px] text-brand-navy/40">
                    Indiquez l'identifiant reçu par SMS de la part de {currentMethodConfig.name} après le transfert.
                  </p>
                </div>

                {/* Capture d'écran justificative */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">
                    Capture d'écran du SMS de confirmation (facultatif)
                  </label>
                  <div className="p-4 border-2 border-dashed border-brand-grey rounded-2xl bg-brand-grey/20 flex flex-col items-center justify-center text-center">
                    <Upload size={24} className="text-brand-navy/40 mb-2" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setReceiptFile(e.target.files ? e.target.files[0] : null)}
                      className="text-xs text-brand-navy/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-navy file:text-white hover:file:bg-brand-navy/90"
                    />
                    <span className="text-[10px] text-brand-navy/40 mt-2">
                      Fichier conservé dans un espace de stockage privé et sécurisé.
                    </span>
                  </div>
                </div>

                {/* Notice before submit */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                  <Info className="text-brand-navy/60 shrink-0 mt-0.5" size={18} />
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Un paiement déclaré n'est pas encore un paiement validé. Votre déclaration sera vérifiée par notre équipe avant toute activation d'abonnement ou mise à disposition de produit numérique.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <Button
                    type="button"
                    onClick={() => setStep('instructions')}
                    variant="outline"
                    size="lg"
                    className="rounded-2xl"
                  >
                    Retour aux instructions
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingDeclaration}
                    variant="secondary"
                    size="lg"
                    className="flex-grow rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-brand-green/20"
                  >
                    {isSubmittingDeclaration ? (
                      <>
                        <Loader2 className="animate-spin mr-3" size={18} />
                        Enregistrement de votre déclaration...
                      </>
                    ) : (
                      "Soumettre ma déclaration de paiement"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* STEP 4: CONFIRMATION STATE */}
        {step === 'confirmed' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <div className="bg-white p-6 sm:p-8 md:p-12 rounded-[2.5rem] border border-brand-green/30 shadow-xl text-center">
              <div className="h-16 sm:h-20 w-16 sm:w-20 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-6 text-brand-green">
                <Clock size={36} />
              </div>

              <span className="text-[10px] font-black uppercase tracking-widest text-brand-green bg-brand-green/10 px-3 py-1 rounded-full inline-block mb-4">
                Statut : Paiement Déclaré
              </span>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-brand-navy uppercase tracking-tight mb-4 leading-tight break-words">
                Déclaration enregistrée avec succès
              </h2>

              <p className="text-sm md:text-base text-brand-navy/70 max-w-xl mx-auto leading-relaxed mb-6 font-medium">
                « Votre déclaration de paiement a bien été enregistrée. Votre paiement sera vérifié par notre équipe avant toute activation ou livraison. »
              </p>

              <div className="p-6 rounded-2xl bg-brand-grey border border-brand-grey max-w-md mx-auto mb-8 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-brand-navy/50">Numéro de commande :</span>
                  <strong className="font-mono text-brand-navy">{orderNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-navy/50">Moyen de paiement :</span>
                  <strong className="text-brand-navy capitalize">{currentMethodConfig.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-navy/50">Numéro émetteur :</span>
                  <strong className="text-brand-navy">{senderPhone}</strong>
                </div>
                {transactionRef && (
                  <div className="flex justify-between">
                    <span className="text-brand-navy/50">Référence :</span>
                    <strong className="font-mono text-brand-navy">{transactionRef}</strong>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/dashboard">
                  <Button variant="primary" size="lg" className="rounded-2xl px-8 text-xs font-bold uppercase tracking-wider">
                    Suivre dans mon espace membre
                  </Button>
                </Link>
                <Link to="/shop">
                  <Button variant="outline" size="lg" className="rounded-2xl px-8 text-xs font-bold uppercase tracking-wider">
                    Retourner à la boutique
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
