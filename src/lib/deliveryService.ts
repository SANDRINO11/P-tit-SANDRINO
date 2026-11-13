import { supabase, isSupabaseConfigured } from './supabase';
import { adminService, AdminOrder } from './adminService';
import { PRODUCTS } from '../data/products';
import { productService } from './productService';
import { subscriptionService } from './subscriptionService';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../data/subscriptions';
import { PurchasedProduct, MemberSubscriptionDetails, MemberNotification, Order } from '../data/member';

const LOCAL_PURCHASED_PRODUCTS_KEY = 'sandrino_purchased_products';
const LOCAL_SUBSCRIPTIONS_KEY = 'sandrino_subscriptions';
const LOCAL_NOTIFICATIONS_KEY = 'sandrino_member_notifications';
const LOCAL_ORDERS_KEY = 'sandrino_orders';

export const deliveryService = {
  // 1. ATOMIC VALIDATION AND AUTOMATED DELIVERY (PART 12)
  async validateAndDeliver(
    order: AdminOrder,
    adminUser: { id: string; email: string; name?: string }
  ) {
    if (!order) throw new Error("Commande invalide.");

    // IDEMPOTENCY CHECK: Prevent double validation
    if (order.paymentStatus === 'paid_validated') {
      throw new Error(`La commande ${order.orderNumber} a déjà été validée précédemment.`);
    }

    const validatedAt = new Date().toISOString();
    const updatedDetails = {
      ...(order.paymentDetails || {}),
      validatedAt,
      validatedBy: adminUser.email || adminUser.id
    };

    // A. UPDATE ORDER IN SUPABASE
    const isOrderUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id);
    if (isSupabaseConfigured && isOrderUuid) {
      try {
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid_validated',
            order_status: 'completed',
            payment_details: updatedDetails,
            updated_at: validatedAt
          })
          .eq('id', order.id);

        // Update declaration record
        await supabase
          .from('payment_declarations')
          .update({
            status: 'paid_validated',
            admin_note: `Paiement validé et accès livrés par ${adminUser.email}`
          })
          .eq('order_id', order.id);
      } catch (e) {
        console.warn("Notice updating order in Supabase:", e);
      }
    }

    // Also update order in local storage fallback
    this.updateLocalOrder(order.id, 'paid_validated', 'completed', updatedDetails);

    // B. IDENTIFY ORDER TYPE AND DELIVER ACCORDINGLY
    const deliveredProducts: string[] = [];
    let activatedSubscription: string | null = null;

    for (const item of order.items) {
      // CAS A: DIGITAL PRODUCT
      if (item.itemType === 'product' || (!item.itemType && !['standard', 'premium', 'free'].includes(item.productId))) {
        await this.deliverDigitalProduct(order, item, validatedAt);
        deliveredProducts.push(item.productName);
      }

      // CAS B: SUBSCRIPTION FORMULA
      if (item.itemType === 'subscription' || ['standard', 'premium'].includes(item.productId)) {
        const livePlans = await subscriptionService.getPlans().catch(() => SUBSCRIPTION_PLANS);
        const plan = livePlans.find(p => p.id === item.productId) || SUBSCRIPTION_PLANS.find(p => p.id === item.productId);
        if (plan) {
          await this.activateSubscription(order.userId, plan, validatedAt);
          activatedSubscription = plan.name;
        }
      }
    }

    // If order items were general but order had a subscription
    if (order.items.length === 0) {
      // Fallback
      deliveredProducts.push('Ressource numérique');
    }

    // C. CREATE IN-APP NOTIFICATION IN MEMBER SPACE
    let notificationTitle = 'Paiement vérifié et validé';
    let notificationMessage = `Votre paiement pour la commande ${order.orderNumber} (${order.totalAmount.toLocaleString('fr-FR')} FCFA) a été vérifié et validé avec succès.`;

    if (deliveredProducts.length > 0) {
      notificationMessage += ` Vos ressources numériques (${deliveredProducts.join(', ')}) sont maintenant disponibles au téléchargement dans votre espace personnel.`;
    }
    if (activatedSubscription) {
      notificationMessage += ` Votre adhésion ${activatedSubscription} a été activée.`;
    }

    await this.createNotification({
      userId: order.userId,
      orderId: order.id,
      type: 'payment_validated',
      title: notificationTitle,
      message: notificationMessage,
      createdAt: validatedAt
    });

    // D. LOG TO AUDIT TRAIL
    await adminService.logAudit({
      action: 'Paiement Validé & Livraison Effectuée',
      target_type: 'payment',
      target_id: order.id,
      admin_id: adminUser.id,
      admin_email: adminUser.email,
      details: {
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        deliveredProducts,
        activatedSubscription,
        validatedAt
      }
    });

    // E. SEND AUTOMATIC CONFIRMATION EMAIL VIA SERVER-SIDE PROVIDER (Resend / SendGrid)
    let emailResult: { sent: boolean; configured: boolean; provider?: string | null; message?: string; error?: string } = {
      sent: false,
      configured: false,
      message: "Adresse e-mail du client introuvable pour l'envoi."
    };

    try {
      let recipientEmail = order.userEmail;
      let recipientName = order.userName;

      if (!recipientEmail && isSupabaseConfigured && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.userId)) {
        const { data: userProf } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', order.userId)
          .maybeSingle();
        if (userProf?.email) {
          recipientEmail = userProf.email;
          recipientName = recipientName || userProf.full_name;
        }
      }

      if (recipientEmail) {
        let accessToken: string | undefined;
        if (isSupabaseConfigured) {
          const { data: sessionData } = await supabase.auth.getSession();
          accessToken = sessionData?.session?.access_token;
        }

        const emailRes = await fetch('/api/emails/payment-validated', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipientEmail,
            recipientName,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            paymentMethod: order.paymentMethod,
            deliveredProducts,
            activatedSubscription,
            validatedAt,
            ...(accessToken ? { accessToken } : {})
          })
        });

        const parsed = await emailRes.json().catch(() => null);
        if (parsed) {
          emailResult = parsed;
        }
      }
    } catch (emailErr: any) {
      emailResult = {
        sent: false,
        configured: false,
        error: emailErr?.message || "Impossible de joindre le service d'envoi d'e-mail."
      };
    }

    return {
      success: true,
      deliveredProducts,
      activatedSubscription,
      emailResult
    };
  },

  // 2. REJECT PAYMENT WITH CLEAR MOTIF
  async rejectPayment(
    order: AdminOrder,
    adminUser: { id: string; email: string },
    refusalReason: string
  ) {
    if (!order) throw new Error("Commande invalide.");
    if (order.paymentStatus === 'failed_cancelled') {
      throw new Error(`La commande ${order.orderNumber} a déjà été refusée précédemment.`);
    }

    const refusedAt = new Date().toISOString();
    const updatedDetails = {
      ...(order.paymentDetails || {}),
      refusedAt,
      refusedBy: adminUser.email,
      refusalReason: refusalReason.trim()
    };

    const isOrderUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id);
    if (isSupabaseConfigured && isOrderUuid) {
      try {
        await supabase
          .from('orders')
          .update({
            payment_status: 'failed_cancelled',
            order_status: 'cancelled',
            payment_details: updatedDetails,
            updated_at: refusedAt
          })
          .eq('id', order.id);

        await supabase
          .from('payment_declarations')
          .update({
            status: 'failed_cancelled',
            admin_note: `Refusé par ${adminUser.email} : ${refusalReason}`
          })
          .eq('order_id', order.id);
      } catch (e) {
        console.warn("Notice updating order rejection in Supabase:", e);
      }
    }

    // Update local storage fallback
    this.updateLocalOrder(order.id, 'failed_cancelled', 'cancelled', updatedDetails);

    // Create in-app member notification
    await this.createNotification({
      userId: order.userId,
      orderId: order.id,
      type: 'payment_rejected',
      title: 'Déclaration de paiement non validée',
      message: `Votre déclaration de paiement pour la commande ${order.orderNumber} n'a pas pu être validée. Motif : ${refusalReason}. Aucun montant n'a été prélevé sur vos accès. Veuillez vérifier les détails de votre transaction ou contacter notre assistance.`,
      createdAt: refusedAt
    });

    // Log to audit
    await adminService.logAudit({
      action: 'Paiement Refusé',
      target_type: 'payment',
      target_id: order.id,
      admin_id: adminUser.id,
      admin_email: adminUser.email,
      details: {
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        refusalReason,
        refusedAt
      }
    });

    return true;
  },

  // 3. CAS A: DELIVER DIGITAL PRODUCT
  async deliverDigitalProduct(order: AdminOrder, item: any, validatedAt: string) {
    const liveCatalog = await productService.getProducts().catch(() => PRODUCTS);
    const matchedProduct = liveCatalog.find(p => p.id === item.productId) || PRODUCTS.find(p => p.id === item.productId);
    const resolvedFilePath = matchedProduct?.filePath || item.filePath || `products/${item.productId}.pdf`;

    const newPurchasedProduct: PurchasedProduct = {
      id: `pur-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: item.productId,
      productName: item.productName || matchedProduct?.name || 'Guide Pratique SANDRINO',
      category: matchedProduct?.category || 'Guides pratiques',
      image: matchedProduct?.image || item.image || '/src/assets/images/shop_banner_learning_resources_1794250357467.jpg',
      format: matchedProduct?.format || item.format || 'PDF',
      purchaseDate: validatedAt,
      orderId: order.id,
      fileAvailable: true,
      filePath: resolvedFilePath
    };

    // Save in Supabase
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.userId);
    if (isSupabaseConfigured && isUserUuid) {
      try {
        await supabase
          .from('purchased_products')
          .insert([{
            user_id: order.userId,
            product_id: newPurchasedProduct.productId,
            product_name: newPurchasedProduct.productName,
            category: newPurchasedProduct.category,
            image: newPurchasedProduct.image,
            format: newPurchasedProduct.format,
            purchase_date: validatedAt,
            order_id: order.id,
            file_available: true,
            file_path: newPurchasedProduct.filePath
          }]);
      } catch (err) {
        console.error('Error inserting into purchased_products:', err);
      }
    }

    // Save in local storage fallback
    try {
      const stored = localStorage.getItem(LOCAL_PURCHASED_PRODUCTS_KEY);
      const list: Array<PurchasedProduct & { userId: string }> = stored ? JSON.parse(stored) : [];
      // Prevent duplicates
      const exists = list.some(p => p.userId === order.userId && p.productId === item.productId && p.orderId === order.id);
      if (!exists) {
        list.unshift({ ...newPurchasedProduct, userId: order.userId });
        localStorage.setItem(LOCAL_PURCHASED_PRODUCTS_KEY, JSON.stringify(list));
      }
    } catch (e) {}
  },

  // 4. CAS B: ACTIVATE SUBSCRIPTION
  async activateSubscription(userId: string, plan: SubscriptionPlan, validatedAt: string) {
    // Calculate real expiry date based on plan billingCycle or id
    let expiryDate: string | undefined = undefined;
    const cycle = (plan.billingCycle || '').toLowerCase();
    if (plan.id !== 'free' && !cycle.includes('vie')) {
      let days = plan.id === 'premium' ? 365 : 30;
      if (cycle.includes('annuel') || cycle.includes('an')) {
        days = 365;
      } else if (cycle.includes('trimest')) {
        days = 90;
      } else if (cycle.includes('semest')) {
        days = 180;
      } else if (cycle.includes('mens')) {
        days = 30;
      }
      expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    const subscriptionDetails: MemberSubscriptionDetails = {
      id: `sub-${Date.now()}`,
      planId: plan.id as any,
      planName: plan.name,
      price: plan.price,
      status: 'active',
      startDate: validatedAt,
      expiryDate,
      features: plan.features
    };

    // Save in Supabase
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (isSupabaseConfigured && isUserUuid) {
      try {
        const { error: subUpsertError } = await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              plan_id: plan.id,
              plan_name: plan.name,
              price: plan.price,
              status: 'active',
              start_date: validatedAt,
              expiry_date: expiryDate ?? null,
              features: plan.features,
              updated_at: validatedAt
            },
            { onConflict: 'user_id' }
          );
        if (subUpsertError) {
          console.warn('Notice updating subscriptions table in Supabase:', subUpsertError.message);
        }
      } catch (err) {
        console.error('Error updating subscriptions table:', err);
      }
    }

    // Save in local storage fallback
    try {
      const stored = localStorage.getItem(LOCAL_SUBSCRIPTIONS_KEY);
      const map: Record<string, MemberSubscriptionDetails> = stored ? JSON.parse(stored) : {};
      map[userId] = subscriptionDetails;
      localStorage.setItem(LOCAL_SUBSCRIPTIONS_KEY, JSON.stringify(map));
    } catch (e) {}
  },

  // 5. CREATE NOTIFICATION
  async createNotification(notification: Omit<MemberNotification, 'id' | 'isRead'>) {
    const newNotif: MemberNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isRead: false
    };

    // Save in Supabase
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notification.userId);
    if (isSupabaseConfigured && isUserUuid) {
      try {
        await supabase
          .from('member_notifications')
          .insert([{
            user_id: notification.userId,
            order_id: notification.orderId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            created_at: notification.createdAt,
            is_read: false
          }]);
      } catch (e) {}
    }

    // Save in local storage fallback
    try {
      const stored = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
      const list: MemberNotification[] = stored ? JSON.parse(stored) : [];
      list.unshift(newNotif);
      localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(list.slice(0, 50)));
    } catch (e) {}
  },

  // 6. GET MEMBER COMPLETE DELIVERY DATA
  async getMemberDeliveryData(userId: string) {
    let purchasedProducts: PurchasedProduct[] = [];
    let subscription: MemberSubscriptionDetails | null = null;
    let orders: Order[] = [];
    let notifications: MemberNotification[] = [];

    // 1. Try Supabase
    if (isSupabaseConfigured) {
      try {
        // Orders
        const { data: dbOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (dbOrders && dbOrders.length > 0) {
          orders = dbOrders.map((o: any) => ({
            id: o.id,
            orderNumber: o.order_number,
            userId: o.user_id,
            createdAt: o.created_at,
            items: o.items || [],
            totalAmount: o.total_amount || 0,
            orderStatus: o.order_status || 'pending',
            paymentStatus: o.payment_status || 'pending_payment',
            paymentMethod: o.payment_method,
            paymentDetails: o.payment_details
          }));
        }

        // Purchased products
        const { data: dbProducts } = await supabase
          .from('purchased_products')
          .select('*')
          .eq('user_id', userId)
          .order('purchase_date', { ascending: false });

        if (dbProducts && dbProducts.length > 0) {
          purchasedProducts = dbProducts.map((p: any) => ({
            id: p.id,
            productId: p.product_id,
            productName: p.product_name,
            category: p.category || 'Guides pratiques',
            image: p.image || '/src/assets/images/shop_banner_learning_resources_1794250357467.jpg',
            format: p.format || 'PDF',
            purchaseDate: p.purchase_date,
            orderId: p.order_id,
            fileAvailable: Boolean(p.file_available),
            filePath: p.file_path
          }));
        }

        // Subscriptions
        const { data: dbSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (dbSub) {
          subscription = {
            id: dbSub.id,
            planId: dbSub.plan_id || 'free',
            planName: dbSub.plan_name || 'Formule Gratuite',
            price: dbSub.price || 0,
            status: dbSub.status || 'active',
            startDate: dbSub.start_date || dbSub.created_at,
            expiryDate: dbSub.expiry_date,
            features: dbSub.features || []
          };
        }

        // Notifications
        const { data: dbNotifs } = await supabase
          .from('member_notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (dbNotifs && dbNotifs.length > 0) {
          notifications = dbNotifs.map((n: any) => ({
            id: n.id,
            userId: n.user_id,
            orderId: n.order_id,
            type: n.type,
            title: n.title,
            message: n.message,
            createdAt: n.created_at,
            isRead: Boolean(n.is_read)
          }));
        }
      } catch (err) {
        console.error('Error fetching Supabase delivery data:', err);
      }
    }

    // 2. Merge local storage fallbacks (ensures pending-migration / local actions are never masked)
    try {
      const stored = localStorage.getItem(LOCAL_PURCHASED_PRODUCTS_KEY);
      if (stored) {
        const list: Array<PurchasedProduct & { userId: string }> = JSON.parse(stored);
        list
          .filter(p => p.userId === userId)
          .forEach(localP => {
            if (!purchasedProducts.some(p => p.productId === localP.productId && p.orderId === localP.orderId)) {
              purchasedProducts.push(localP);
            }
          });
      }
    } catch (e) {}

    try {
      const stored = localStorage.getItem(LOCAL_SUBSCRIPTIONS_KEY);
      if (stored) {
        const map: Record<string, MemberSubscriptionDetails> = JSON.parse(stored);
        const localSub = map[userId];
        if (localSub) {
          const localTs = localSub.startDate ? Date.parse(localSub.startDate) || 0 : 0;
          const dbTs = subscription?.startDate ? Date.parse(subscription.startDate) || 0 : 0;
          const dbIsFreeOnly = !subscription || subscription.planId === 'free';
          if (!subscription || (dbIsFreeOnly && localSub.planId !== 'free') || localTs > dbTs) {
            subscription = localSub;
          }
        }
      }
    } catch (e) {}

    try {
      const stored = localStorage.getItem(LOCAL_ORDERS_KEY);
      if (stored) {
        const list: Order[] = JSON.parse(stored);
        list
          .filter(o => o.userId === userId)
          .forEach(localO => {
            if (!orders.some(o => o.id === localO.id || o.orderNumber === localO.orderNumber)) {
              orders.unshift(localO);
            }
          });
      }
    } catch (e) {}

    try {
      const stored = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
      if (stored) {
        const list: MemberNotification[] = JSON.parse(stored);
        list
          .filter(n => n.userId === userId)
          .forEach(localN => {
            if (!notifications.some(n => n.id === localN.id)) {
              notifications.push(localN);
            }
          });
      }
    } catch (e) {}

    // Default subscription if still null
    if (!subscription) {
      subscription = {
        id: 'free-default',
        planId: 'free',
        planName: 'Formule Gratuite',
        price: 0,
        status: 'active',
        startDate: new Date().toISOString(),
        features: [
          'Accès aux contenus gratuits',
          'Fonctionnalités de base',
          'Accès limité aux ressources gratuites'
        ]
      };
    }

    // CHECK EXPIRY DATE FOR SUBSCRIPTIONS
    if (subscription.expiryDate && new Date() > new Date(subscription.expiryDate)) {
      subscription.status = 'expired';
    }

    return {
      purchasedProducts,
      subscription,
      orders,
      notifications
    };
  },

  // 7. SECURE SIGNED URL / PRIVATE DOWNLOAD
  async getSecureDownloadUrl(product: PurchasedProduct, currentUserId: string): Promise<string> {
    if (!product || !product.fileAvailable) {
      throw new Error("Ce fichier n'est pas encore disponible au téléchargement.");
    }

    // 1. Try Supabase Storage signed URL (valid for 60 seconds)
    if (isSupabaseConfigured && product.filePath) {
      try {
        const { data, error } = await supabase.storage
          .from('digital-products')
          .createSignedUrl(product.filePath, 60);

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      } catch {
        // Continue to server private download route
      }
    }

    // 2. Try Express protected download route if the admin uploaded a real file for this product
    try {
      let tokenParam = '';
      if (isSupabaseConfigured) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (token) {
          tokenParam = `?token=${encodeURIComponent(token)}`;
        }
      }

      const res = await fetch(
        `/api/products/${encodeURIComponent(product.productId)}/download${tokenParam}`,
        { credentials: 'same-origin' }
      );
      if (res.ok) {
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      }
    } catch {
      // Fallback to secure client-side generated certificate blob
    }

    // 2.5 Check if admin attached an external direct file link (https://...)
    const liveMatch = productService.getProductsSync().find(p => p.id === product.productId);
    if (liveMatch?.fileUrl && /^https?:\/\//i.test(liveMatch.fileUrl)) {
      return liveMatch.fileUrl;
    }

    // 3. Fallback blob when no physical file has been uploaded yet
    return this.createSecureDocumentBlob(product, currentUserId);
  },

  createSecureDocumentBlob(product: PurchasedProduct, userId: string): string {
    const content = `=====================================================
SANDRINO - DOCUMENT NUMÉRIQUE SÉCURISÉ
Plateforme d'apprentissage et d'entrepreneuriat
Fondateur : Pétit SANDRINO
=====================================================

Titre : ${product.productName.toUpperCase()}
Format : ${product.format}
Identifiant du produit : ${product.productId}
Numéro de commande : ${product.orderId}
Date d'acquisition : ${new Date(product.purchaseDate).toLocaleString('fr-FR')}
Bénéficiaire certifié : ID ${userId}
Certificat d'accès : VALIDE & ACTIF

-----------------------------------------------------
SOMMAIRE & DIRECTIVES D'APPRENTISSAGE
-----------------------------------------------------
Ce support numérique officiel est mis à votre disposition
suite à la validation manuelle de votre règlement Mobile Money.

1. Synthèse des fondamentaux et méthodologies clés.
2. Plan d'action par étapes pour structurer vos projets.
3. Fiches outils et modèles d'application pratique.
4. Conseils d'accompagnement et discipline personnelle.

Pour toute question ou accompagnement personnalisé :
Assistance WhatsApp SANDRINO : +228 92 39 57 27
E-mail officiel : petitsandrino1@gmail.com
=====================================================
© SANDRINO. Tous droits réservés. Reproduction interdite.
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    return URL.createObjectURL(blob);
  },

  // Helper to sync local order update
  updateLocalOrder(orderId: string, paymentStatus: any, orderStatus: any, paymentDetails: any) {
    try {
      const stored = localStorage.getItem(LOCAL_ORDERS_KEY);
      if (stored) {
        const list: Order[] = JSON.parse(stored);
        const idx = list.findIndex(o => o.id === orderId);
        if (idx !== -1) {
          list[idx].paymentStatus = paymentStatus;
          list[idx].orderStatus = orderStatus;
          list[idx].paymentDetails = paymentDetails;
          localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(list));
        }
      }
    } catch (e) {}
  }
};
