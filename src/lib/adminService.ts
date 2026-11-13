import { supabase, isSupabaseConfigured } from './supabase';
import { PRODUCTS, Product } from '../data/products';
import { productService } from './productService';
import { SERVICES, Service } from '../data/services';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../data/subscriptions';
import { PAYMENT_METHODS_CONFIG, PaymentMethodConfig, OrderPaymentStatus } from '../data/payments';

export interface AuditLog {
  id: string;
  action: string;
  target_type: 'payment' | 'order' | 'settings' | 'product' | 'service' | 'subscription' | 'member' | 'support_ticket';
  target_id: string;
  admin_id: string;
  admin_email: string;
  details: any;
  created_at: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  createdAt: string;
  items: Array<{
    productId: string;
    productName: string;
    price: number;
    itemType?: string;
    format?: string;
  }>;
  totalAmount: number;
  orderStatus: 'pending' | 'processing' | 'completed' | 'cancelled';
  paymentStatus: OrderPaymentStatus;
  paymentMethod?: 'tmoney' | 'moov' | string;
  paymentDetails?: {
    senderPhone?: string;
    transactionRef?: string;
    paymentDate?: string;
    receiptUrl?: string;
    adminNote?: string;
    validatedAt?: string;
    validatedBy?: string;
    refusedAt?: string;
    refusedBy?: string;
    refusalReason?: string;
  };
}

export interface AdminDeclaration {
  id: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  paymentMethod: 'tmoney' | 'moov' | string;
  senderPhone: string;
  amountSent: number;
  transactionRef?: string;
  paymentDate: string;
  receiptUrl?: string;
  status: OrderPaymentStatus;
  createdAt: string;
  adminNote?: string;
}

export interface MemberProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'member' | 'admin';
  status: 'active' | 'suspended';
  created_at: string;
  subscriptionPlan?: string;
}

export interface StoredPaymentSettings {
  tmoney: {
    recipientNumber: string;
    recipientName: string;
    instructions: string;
    isEnabled: boolean;
  };
  moov: {
    recipientNumber: string;
    recipientName: string;
    instructions: string;
    isEnabled: boolean;
  };
}

const DEFAULT_PAYMENT_SETTINGS: StoredPaymentSettings = {
  tmoney: {
    recipientNumber: '',
    recipientName: '',
    instructions: 'Effectuez un transfert direct via T-Money (syntaxe USSD *145# ou application T-Money) vers le numéro de réception configuré. Mentionnez votre numéro de commande en référence ou note.',
    isEnabled: true
  },
  moov: {
    recipientNumber: '',
    recipientName: '',
    instructions: 'Effectuez un transfert direct via Moov Money (syntaxe USSD *155# ou application Moov Money Flooz) vers le numéro de réception configuré avec le montant exact.',
    isEnabled: true
  }
};

const LOCAL_STORAGE_SETTINGS_KEY = 'sandrino_payment_settings';
const LOCAL_STORAGE_AUDIT_LOGS_KEY = 'sandrino_audit_logs';

export const adminService = {
  // 1. STATS & OVERVIEW
  async getOverview() {
    const activeProductsCount = productService.getProductsSync().length || PRODUCTS.length;
    if (!isSupabaseConfigured) {
      return {
        totalMembers: 0,
        totalOrders: 0,
        pendingOrders: 0,
        paymentsToVerify: 0,
        activeProducts: activeProductsCount,
        activeSubscriptions: SUBSCRIPTION_PLANS.length,
        totalValidatedRevenue: 0
      };
    }

    try {
      // Members count
      const { count: membersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Orders
      const { data: allOrders } = await supabase
        .from('orders')
        .select('total_amount, payment_status, order_status');

      let totalOrders = 0;
      let pendingOrders = 0;
      let paymentsToVerify = 0;
      let totalValidatedRevenue = 0;

      if (allOrders) {
        totalOrders = allOrders.length;
        allOrders.forEach(o => {
          if (o.payment_status === 'pending_payment') {
            pendingOrders++;
          }
          if (o.payment_status === 'payment_declared' || o.payment_status === 'payment_verification') {
            paymentsToVerify++;
          }
          if (o.payment_status === 'paid_validated') {
            totalValidatedRevenue += Number(o.total_amount || 0);
          }
        });
      }

      return {
        totalMembers: membersCount || 0,
        totalOrders,
        pendingOrders,
        paymentsToVerify,
        activeProducts: activeProductsCount,
        activeSubscriptions: SUBSCRIPTION_PLANS.length,
        totalValidatedRevenue
      };
    } catch (err) {
      console.error('Error fetching admin overview:', err);
      return {
        totalMembers: 0,
        totalOrders: 0,
        pendingOrders: 0,
        paymentsToVerify: 0,
        activeProducts: activeProductsCount,
        activeSubscriptions: SUBSCRIPTION_PLANS.length,
        totalValidatedRevenue: 0
      };
    }
  },

  // 2. ORDERS MANAGEMENT
  async getOrders(): Promise<AdminOrder[]> {
    let ordersList: AdminOrder[] = [];

    if (isSupabaseConfigured) {
      try {
        const { data: ordersData, error } = await supabase
          .from('orders')
          .select(`
            *,
            profiles:user_id ( full_name, email, phone )
          `)
          .order('created_at', { ascending: false });

        if (!error && ordersData) {
          ordersList = ordersData.map((o: any) => ({
            id: o.id,
            orderNumber: o.order_number || `CMD-${o.id.slice(0, 8).toUpperCase()}`,
            userId: o.user_id,
            userEmail: o.profiles?.email,
            userName: o.profiles?.full_name,
            createdAt: o.created_at,
            items: o.items || [],
            totalAmount: o.total_amount || 0,
            orderStatus: o.order_status || 'pending',
            paymentStatus: o.payment_status || 'pending_payment',
            paymentMethod: o.payment_method,
            paymentDetails: o.payment_details || undefined
          }));
        } else {
          // Fallback without join if foreign key relationship or profiles table is pending
          const { data: rawOrders } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

          if (rawOrders && rawOrders.length > 0) {
            ordersList = rawOrders.map((o: any) => ({
              id: o.id,
              orderNumber: o.order_number || `CMD-${o.id.slice(0, 8).toUpperCase()}`,
              userId: o.user_id,
              createdAt: o.created_at,
              items: o.items || [],
              totalAmount: o.total_amount || 0,
              orderStatus: o.order_status || 'pending',
              paymentStatus: o.payment_status || 'pending_payment',
              paymentMethod: o.payment_method,
              paymentDetails: o.payment_details || undefined
            }));
          }
        }
      } catch (err) {
        console.warn('Notice fetching admin orders from Supabase:', err);
      }
    }

    // Always merge orders stored locally in localStorage (for offline/preview resilience)
    try {
      const stored = localStorage.getItem('sandrino_orders');
      if (stored) {
        const localOrders: any[] = JSON.parse(stored);
        localOrders.forEach(localO => {
          if (!ordersList.some(o => o.id === localO.id || o.orderNumber === (localO.orderNumber || localO.order_number))) {
            ordersList.unshift({
              id: localO.id,
              orderNumber: localO.orderNumber || localO.order_number,
              userId: localO.userId || localO.user_id,
              userEmail: localO.userEmail || localO.email,
              userName: localO.userName || localO.full_name,
              createdAt: localO.createdAt || localO.created_at,
              items: localO.items || [],
              totalAmount: localO.totalAmount || localO.total_amount || 0,
              orderStatus: localO.orderStatus || localO.order_status || 'pending',
              paymentStatus: localO.paymentStatus || localO.payment_status || 'pending_payment',
              paymentMethod: localO.paymentMethod || localO.payment_method,
              paymentDetails: localO.paymentDetails || localO.payment_details
            });
          }
        });
      }
    } catch (e) {}

    return ordersList;
  },

  // 3. PAYMENT DECLARATIONS
  async getDeclarations(): Promise<AdminDeclaration[]> {
    let declarationsList: AdminDeclaration[] = [];

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('payment_declarations')
          .select(`
            *,
            orders:order_id ( order_number, total_amount ),
            profiles:user_id ( full_name, email )
          `)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          declarationsList = data.map((d: any) => ({
            id: d.id,
            orderId: d.order_id,
            orderNumber: d.orders?.order_number || d.order_number || 'N/A',
            userId: d.user_id,
            userEmail: d.profiles?.email || d.user_email,
            userName: d.profiles?.full_name || d.user_name,
            paymentMethod: d.payment_method,
            senderPhone: d.sender_phone,
            amountSent: d.amount_sent,
            transactionRef: d.transaction_ref,
            paymentDate: d.payment_date,
            receiptUrl: d.receipt_url,
            status: d.status || 'payment_declared',
            createdAt: d.created_at,
            adminNote: d.admin_note
          }));
        } else {
          // Fallback: extract declarations stored inside orders table
          const { data: ordersWithDeclaration } = await supabase
            .from('orders')
            .select('*, profiles:user_id ( full_name, email )')
            .in('payment_status', ['payment_declared', 'payment_verification', 'paid_validated', 'failed_cancelled'])
            .order('created_at', { ascending: false });

          if (ordersWithDeclaration) {
            declarationsList = ordersWithDeclaration
              .filter((o: any) => o.payment_details?.senderPhone || o.payment_details?.transactionRef)
              .map((o: any) => ({
                id: `decl-${o.id}`,
                orderId: o.id,
                orderNumber: o.order_number,
                userId: o.user_id,
                userEmail: o.profiles?.email,
                userName: o.profiles?.full_name,
                paymentMethod: o.payment_method || 'tmoney',
                senderPhone: o.payment_details?.senderPhone || 'Non spécifié',
                amountSent: Number(o.total_amount) || 0,
                transactionRef: o.payment_details?.transactionRef,
                paymentDate: o.payment_details?.paymentDate || o.created_at,
                receiptUrl: o.payment_details?.receiptUrl,
                status: o.payment_status,
                createdAt: o.created_at,
                adminNote: o.payment_details?.adminNote
              }));
          }
        }
      } catch (err) {
        console.warn('Notice fetching declarations from Supabase:', err);
      }
    }

    // Always merge local payment declarations
    try {
      const stored = localStorage.getItem('sandrino_payment_declarations');
      if (stored) {
        const localDecls: any[] = JSON.parse(stored);
        localDecls.forEach(localD => {
          if (!declarationsList.some(d => d.id === localD.id || (d.orderNumber === localD.orderNumber && d.senderPhone === localD.senderPhone))) {
            declarationsList.unshift(localD);
          }
        });
      }
    } catch (e) {}

    return declarationsList;
  },

  // 4. ACTION: VALIDATE PAYMENT
  async validatePayment(
    order: AdminOrder,
    adminUser: { id: string; email: string; name?: string }
  ) {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase n'est pas encore configuré.");
    }

    const validatedAt = new Date().toISOString();
    const updatedDetails = {
      ...(order.paymentDetails || {}),
      validatedAt,
      validatedBy: adminUser.email || adminUser.id
    };

    // Update order
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid_validated',
        order_status: 'completed',
        payment_details: updatedDetails,
        updated_at: validatedAt
      })
      .eq('id', order.id);

    if (orderError) throw orderError;

    // Update declaration record if exists in table
    try {
      await supabase
        .from('payment_declarations')
        .update({
          status: 'paid_validated',
          admin_note: `Validé par ${adminUser.email} le ${new Date().toLocaleDateString('fr-FR')}`
        })
        .eq('order_id', order.id);
    } catch (e) {
      // Non-fatal if table not present
    }

    // Log Action to Audit Trail
    await this.logAudit({
      action: 'Paiement Validé',
      target_type: 'payment',
      target_id: order.id,
      admin_id: adminUser.id,
      admin_email: adminUser.email,
      details: {
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        senderPhone: order.paymentDetails?.senderPhone,
        transactionRef: order.paymentDetails?.transactionRef,
        validatedAt
      }
    });

    return true;
  },

  // 5. ACTION: REJECT PAYMENT
  async rejectPayment(
    order: AdminOrder,
    adminUser: { id: string; email: string; name?: string },
    refusalReason: string
  ) {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase n'est pas encore configuré.");
    }

    const refusedAt = new Date().toISOString();
    const updatedDetails = {
      ...(order.paymentDetails || {}),
      refusedAt,
      refusedBy: adminUser.email || adminUser.id,
      refusalReason: refusalReason.trim()
    };

    // Update order
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        payment_status: 'failed_cancelled',
        order_status: 'cancelled',
        payment_details: updatedDetails,
        updated_at: refusedAt
      })
      .eq('id', order.id);

    if (orderError) throw orderError;

    // Update declaration status if exists
    try {
      await supabase
        .from('payment_declarations')
        .update({
          status: 'failed_cancelled',
          admin_note: `Refusé par ${adminUser.email} : ${refusalReason}`
        })
        .eq('order_id', order.id);
    } catch (e) {
      // Non-fatal
    }

    // Log to Audit Trail
    await this.logAudit({
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

  // 6. PAYMENT SETTINGS
  async getPaymentSettings(): Promise<StoredPaymentSettings> {
    // 1. Try Supabase
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('payment_settings')
          .select('*')
          .single();

        if (!error && data && data.settings) {
          return data.settings as StoredPaymentSettings;
        }
      } catch (e) {
        // Fallback to local storage
      }
    }

    // 2. Try localStorage
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // Ignore
    }

    return DEFAULT_PAYMENT_SETTINGS;
  },

  async updatePaymentSettings(
    newSettings: StoredPaymentSettings,
    adminUser: { id: string; email: string }
  ) {
    // Save to localStorage for instant client fallback
    try {
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (e) {}

    // Save to Supabase
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('payment_settings')
          .upsert({
            id: 'default',
            settings: newSettings,
            updated_at: new Date().toISOString(),
            updated_by: adminUser.email
          });

        if (error) console.warn('Could not save payment_settings to table:', error.message);
      } catch (err) {
        console.error('Error saving settings to Supabase:', err);
      }
    }

    // Audit log
    await this.logAudit({
      action: 'Modification Paramètres Paiement',
      target_type: 'settings',
      target_id: 'default',
      admin_id: adminUser.id,
      admin_email: adminUser.email,
      details: {
        tmoneyActive: newSettings.tmoney.isEnabled,
        tmoneyNumber: newSettings.tmoney.recipientNumber,
        moovActive: newSettings.moov.isEnabled,
        moovNumber: newSettings.moov.recipientNumber
      }
    });

    return true;
  },

  // 7. MEMBERS MANAGEMENT
  async getMembers(): Promise<MemberProfile[]> {
    if (!isSupabaseConfigured) return [];

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          subscriptions:id ( plan_name, status )
        `)
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        let list: MemberProfile[] = [];
        try {
          const { data: rawProfiles } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

          if (rawProfiles && rawProfiles.length > 0) {
            list = rawProfiles.map((p: any) => ({
              id: p.id,
              full_name: p.full_name || 'Sans nom',
              email: p.email || 'N/A',
              phone: p.phone || 'N/A',
              role: (p.email || '').toLowerCase() === 'petitsandrino1@gmail.com' ? 'admin' : (p.role || 'member'),
              status: p.status || 'active',
              created_at: p.created_at,
              subscriptionPlan: 'Formule Gratuite'
            }));
          }
        } catch (e) {}

        if (list.length === 0) {
          list.push({
            id: 'owner-admin-id',
            full_name: 'Pétit SANDRINO',
            email: 'petitsandrino1@gmail.com',
            phone: '+228 92 39 57 27',
            role: 'admin',
            status: 'active',
            created_at: new Date().toISOString(),
            subscriptionPlan: 'Accès Fondateur'
          });
        }
        return list;
      }

      const mapped = data.map((p: any) => ({
        id: p.id,
        full_name: p.full_name || 'Sans nom',
        email: p.email || 'N/A',
        phone: p.phone || 'N/A',
        role: (p.email || '').toLowerCase() === 'petitsandrino1@gmail.com' ? 'admin' : (p.role || 'member'),
        status: p.status || 'active',
        created_at: p.created_at,
        subscriptionPlan: p.subscriptions?.[0]?.plan_name || 'Formule Gratuite'
      }));

      if (!mapped.some((m: any) => (m.email || '').toLowerCase() === 'petitsandrino1@gmail.com')) {
        mapped.unshift({
          id: 'owner-admin-id',
          full_name: 'Pétit SANDRINO',
          email: 'petitsandrino1@gmail.com',
          phone: '+228 92 39 57 27',
          role: 'admin',
          status: 'active',
          created_at: new Date().toISOString(),
          subscriptionPlan: 'Accès Fondateur'
        });
      }

      return mapped;
    } catch (err) {
      console.warn('Notice fetching members:', err);
      return [
        {
          id: 'owner-admin-id',
          full_name: 'Pétit SANDRINO',
          email: 'petitsandrino1@gmail.com',
          phone: '+228 92 39 57 27',
          role: 'admin',
          status: 'active',
          created_at: new Date().toISOString(),
          subscriptionPlan: 'Accès Fondateur'
        }
      ];
    }
  },

  async toggleMemberStatus(
    memberId: string,
    newStatus: 'active' | 'suspended',
    adminUser: { id: string; email: string }
  ) {
    if (!isSupabaseConfigured) throw new Error("Supabase non configuré.");

    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', memberId);

    if (error) throw error;

    await this.logAudit({
      action: `Statut membre modifié : ${newStatus}`,
      target_type: 'member',
      target_id: memberId,
      admin_id: adminUser.id,
      admin_email: adminUser.email,
      details: { newStatus }
    });

    return true;
  },

  // 8. AUDIT LOGGING
  async logAudit(log: Omit<AuditLog, 'id' | 'created_at'>) {
    const entry: AuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString()
    };

    // Save in localStorage log array
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_AUDIT_LOGS_KEY);
      const list: AuditLog[] = stored ? JSON.parse(stored) : [];
      list.unshift(entry);
      // Keep up to 200 logs
      localStorage.setItem(LOCAL_STORAGE_AUDIT_LOGS_KEY, JSON.stringify(list.slice(0, 200)));
    } catch (e) {}

    // Save in Supabase if table exists
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('admin_audit_logs')
          .insert([{
            action: entry.action,
            target_type: entry.target_type,
            target_id: entry.target_id,
            admin_id: entry.admin_id,
            admin_email: entry.admin_email,
            details: entry.details,
            created_at: entry.created_at
          }]);
      } catch (err) {
        // Non-fatal if table not yet migrated
      }
    }
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('admin_audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (e) {}
    }

    // Local storage fallback
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_AUDIT_LOGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}

    return [];
  },

  // 9. SUBSCRIPTIONS AUDIT / ANALYTICS
  async getSubscriptions(): Promise<Array<{
    id: string;
    userId: string;
    planId: string;
    planName: string;
    price: number;
    status: string;
    startDate: string;
    expiryDate?: string;
  }>> {
    let subList: any[] = [];
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('subscriptions').select('*');
        if (!error && data) {
          subList = data.map((s: any) => ({
            id: s.id,
            userId: s.user_id,
            planId: s.plan_id || 'free',
            planName: s.plan_name || 'Formule Gratuite',
            price: Number(s.price) || 0,
            status: s.status || 'active',
            startDate: s.start_date || s.created_at,
            expiryDate: s.expiry_date
          }));
        }
      } catch (e) {}
    }

    try {
      const stored = localStorage.getItem('sandrino_subscriptions');
      if (stored) {
        const map = JSON.parse(stored);
        Object.entries(map).forEach(([uId, details]: [string, any]) => {
          if (!subList.some(s => s.userId === uId)) {
            subList.push({
              id: details.id || `sub-${uId}`,
              userId: uId,
              planId: details.planId || 'free',
              planName: details.planName || 'Formule Gratuite',
              price: details.price || 0,
              status: details.status || 'active',
              startDate: details.startDate || new Date().toISOString(),
              expiryDate: details.expiryDate
            });
          }
        });
      }
    } catch (e) {}

    return subList;
  },

  // 10. PURCHASED PRODUCTS ANALYTICS
  async getPurchasedProducts(): Promise<Array<{
    id: string;
    userId: string;
    productId: string;
    productName: string;
    purchaseDate: string;
    orderId?: string;
  }>> {
    let prodList: any[] = [];
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('purchased_products').select('*');
        if (!error && data) {
          prodList = data.map((p: any) => ({
            id: p.id,
            userId: p.user_id,
            productId: p.product_id,
            productName: p.product_name,
            purchaseDate: p.purchase_date || p.created_at,
            orderId: p.order_id
          }));
        }
      } catch (e) {}
    }

    try {
      const stored = localStorage.getItem('sandrino_purchased_products');
      if (stored) {
        const list = JSON.parse(stored);
        list.forEach((p: any) => {
          if (!prodList.some(item => item.id === p.id)) {
            prodList.push({
              id: p.id,
              userId: p.userId,
              productId: p.productId,
              productName: p.productName,
              purchaseDate: p.purchaseDate || new Date().toISOString(),
              orderId: p.orderId
            });
          }
        });
      }
    } catch (e) {}

    return prodList;
  }
};
