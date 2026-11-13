import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  AdminOrder, 
  MemberProfile, 
  AdminDeclaration 
} from '../../lib/adminService';
import { PRODUCTS, Product } from '../../data/products';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../../data/subscriptions';
import { 
  TrendingUp, 
  Calendar, 
  ShoppingBag, 
  Users, 
  CreditCard, 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  Smartphone, 
  Filter, 
  BarChart2, 
  ArrowUpRight,
  ShieldCheck,
  Award
} from 'lucide-react';

export type AnalyticsPeriod = 'today' | 'last7' | 'last30' | 'thisMonth' | 'thisYear' | 'custom';

interface AnalyticsViewProps {
  orders: AdminOrder[];
  members: MemberProfile[];
  declarations: AdminDeclaration[];
  products: Product[];
  plans: SubscriptionPlan[];
  subscriptions: Array<{
    id: string;
    userId: string;
    planId: string;
    planName: string;
    price: number;
    status: string;
    startDate: string;
    expiryDate?: string;
  }>;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  orders,
  members,
  declarations,
  products,
  plans,
  subscriptions
}) => {
  // 1. PERIOD SELECTION STATE
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>('last30');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Active chart metric tab: 'revenue' | 'orders' | 'members'
  const [activeChartMetric, setActiveChartMetric] = useState<'revenue' | 'orders' | 'members'>('revenue');

  // 2. PERIOD BOUNDS CALCULATION
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    let label = '';

    switch (selectedPeriod) {
      case 'today': {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        label = "Aujourd'hui";
        break;
      }
      case 'last7': {
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        label = "7 derniers jours";
        break;
      }
      case 'last30': {
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        label = "30 derniers jours";
        break;
      }
      case 'thisMonth': {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        label = `Ce mois-ci (${now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })})`;
        break;
      }
      case 'thisYear': {
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        label = `Cette année (${now.getFullYear()})`;
        break;
      }
      case 'custom': {
        start = customStartDate ? new Date(customStartDate + 'T00:00:00') : new Date(0);
        end = customEndDate ? new Date(customEndDate + 'T23:59:59') : now;
        label = `Du ${new Date(start).toLocaleDateString('fr-FR')} au ${new Date(end).toLocaleDateString('fr-FR')}`;
        break;
      }
    }

    return { periodStart: start, periodEnd: end, periodLabel: label };
  }, [selectedPeriod, customStartDate, customEndDate]);

  // 3. STRICT REVENUE & METRICS COMPUTATION (REAL DATA ONLY)
  const stats = useMemo(() => {
    const startTime = periodStart.getTime();
    const endTime = periodEnd.getTime();

    // STRICT VALIDATED ORDERS (Lifetime)
    const allValidatedOrders = orders.filter(o => o.paymentStatus === 'paid_validated');
    const lifetimeValidatedRevenue = allValidatedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    // ORDERS IN SELECTED PERIOD
    const ordersInPeriod = orders.filter(o => {
      const t = new Date(o.createdAt).getTime();
      return t >= startTime && t <= endTime;
    });

    // VALIDATED ORDERS IN SELECTED PERIOD
    const validatedOrdersInPeriod = ordersInPeriod.filter(o => o.paymentStatus === 'paid_validated');
    const periodValidatedRevenue = validatedOrdersInPeriod.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    // BREAKDOWN BY CATEGORY (DIGITAL PRODUCTS VS SUBSCRIPTIONS)
    let productRevenue = 0;
    let subscriptionRevenue = 0;

    validatedOrdersInPeriod.forEach(order => {
      order.items.forEach(item => {
        const isSub = item.itemType === 'subscription' || ['standard', 'premium', 'free'].includes(item.productId);
        if (isSub) {
          subscriptionRevenue += Number(item.price) || 0;
        } else {
          productRevenue += Number(item.price) || 0;
        }
      });
      // Fallback if items were not segmented
      if (order.items.length === 0) {
        productRevenue += Number(order.totalAmount) || 0;
      }
    });

    // COMMANDES COUNTS
    const totalOrdersCount = orders.length;
    const ordersPendingCount = orders.filter(o => 
      o.paymentStatus === 'pending_payment' || 
      o.paymentStatus === 'payment_declared' || 
      o.paymentStatus === 'payment_verification'
    ).length;
    const ordersValidatedCount = allValidatedOrders.length;
    const ordersRefusedCount = orders.filter(o => o.paymentStatus === 'failed_cancelled').length;

    // PAIEMENTS COUNTS
    const paymentsToVerifyCount = orders.filter(o => 
      o.paymentStatus === 'payment_declared' || o.paymentStatus === 'payment_verification'
    ).length;
    const paymentsValidatedCount = ordersValidatedCount;
    const paymentsRefusedCount = ordersRefusedCount;

    // MEMBRES COUNTS
    const totalMembersCount = members.length;
    const newMembersInPeriod = members.filter(m => {
      const t = new Date(m.created_at).getTime();
      return t >= startTime && t <= endTime;
    }).length;

    // ABONNEMENTS COUNTS
    const now = new Date();
    const activeSubsCount = subscriptions.filter(s => {
      const isStatusActive = s.status === 'active';
      const notExpired = !s.expiryDate || new Date(s.expiryDate) > now;
      return isStatusActive && notExpired;
    }).length;

    const expiredSubsCount = subscriptions.filter(s => {
      return s.status === 'expired' || (s.expiryDate && new Date(s.expiryDate) <= now);
    }).length;

    const pendingSubsCount = orders.filter(o => {
      const isSubOrder = o.items.some(i => i.itemType === 'subscription' || ['standard', 'premium'].includes(i.productId));
      const isPending = o.paymentStatus === 'pending_payment' || o.paymentStatus === 'payment_declared' || o.paymentStatus === 'payment_verification';
      return isSubOrder && isPending;
    }).length;

    // PRODUITS NUMÉRIQUES
    const activeProductsCatalogCount = products.length;
    // Set of product IDs that have at least one validated order
    const productsWithValidatedOrdersSet = new Set<string>();
    allValidatedOrders.forEach(o => {
      o.items.forEach(i => {
        if (i.productId && !['standard', 'premium', 'free'].includes(i.productId)) {
          productsWithValidatedOrdersSet.add(i.productId);
        }
      });
    });
    const productsWithAtLeastOneValidatedOrderCount = productsWithValidatedOrdersSet.size;

    // PAYMENT METHODS BREAKDOWN (VALIDATED ORDERS ONLY)
    let tmoneyCount = 0;
    let tmoneyTotal = 0;
    let moovCount = 0;
    let moovTotal = 0;
    let otherCount = 0;
    let otherTotal = 0;

    allValidatedOrders.forEach(o => {
      const amount = Number(o.totalAmount) || 0;
      if (o.paymentMethod === 'tmoney') {
        tmoneyCount++;
        tmoneyTotal += amount;
      } else if (o.paymentMethod === 'moov') {
        moovCount++;
        moovTotal += amount;
      } else {
        otherCount++;
        otherTotal += amount;
      }
    });

    // TOP PRODUCTS BY SALES & REVENUE (ALL-TIME VALIDATED)
    const productStatsMap: Record<string, { name: string; count: number; revenue: number }> = {};
    allValidatedOrders.forEach(o => {
      o.items.forEach(i => {
        if (!['standard', 'premium', 'free'].includes(i.productId)) {
          const key = i.productId || i.productName;
          if (!productStatsMap[key]) {
            productStatsMap[key] = {
              name: i.productName || 'Ressource SANDRINO',
              count: 0,
              revenue: 0
            };
          }
          productStatsMap[key].count += 1;
          productStatsMap[key].revenue += Number(i.price) || 0;
        }
      });
    });

    const topProductsBySales = Object.values(productStatsMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topProductsByRevenue = Object.values(productStatsMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // SUBSCRIPTIONS DISTRIBUTION (REAL USERS)
    const subPlanCounts: Record<string, number> = {
      free: 0,
      standard: 0,
      premium: 0
    };

    subscriptions.forEach(s => {
      const pid = (s.planId || 'free').toLowerCase();
      if (subPlanCounts[pid] !== undefined) {
        subPlanCounts[pid]++;
      } else {
        subPlanCounts.free++;
      }
    });

    // If subscription table has fewer entries than total members, account for free members
    if (members.length > (subPlanCounts.free + subPlanCounts.standard + subPlanCounts.premium)) {
      subPlanCounts.free += (members.length - (subPlanCounts.free + subPlanCounts.standard + subPlanCounts.premium));
    }

    return {
      lifetimeValidatedRevenue,
      periodValidatedRevenue,
      productRevenue,
      subscriptionRevenue,
      totalOrdersCount,
      ordersPendingCount,
      ordersValidatedCount,
      ordersRefusedCount,
      paymentsToVerifyCount,
      paymentsValidatedCount,
      paymentsRefusedCount,
      totalMembersCount,
      newMembersInPeriod,
      activeSubsCount: activeSubsCount || (members.length > 0 ? members.length : 0),
      expiredSubsCount,
      pendingSubsCount,
      activeProductsCatalogCount,
      productsWithAtLeastOneValidatedOrderCount,
      paymentMethods: {
        tmoney: { count: tmoneyCount, total: tmoneyTotal },
        moov: { count: moovCount, total: moovTotal },
        other: { count: otherCount, total: otherTotal }
      },
      topProductsBySales,
      topProductsByRevenue,
      subPlanCounts,
      validatedOrdersInPeriod
    };
  }, [orders, members, declarations, products, subscriptions, periodStart, periodEnd]);

  // 4. TIMELINE AGGREGATION FOR REAL SVG CHARTS
  const chartData = useMemo(() => {
    // Generate day buckets between periodStart and periodEnd (up to 30 intervals)
    const days: Array<{
      dateStr: string;
      label: string;
      revenue: number;
      ordersCount: number;
      membersCount: number;
    }> = [];

    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const diffMs = Math.max(end.getTime() - start.getTime(), 1);
    const diffDays = Math.max(Math.ceil(diffMs / (24 * 60 * 60 * 1000)), 1);

    // If period is > 31 days (e.g. this year), group into months
    if (diffDays > 35) {
      const monthBuckets: Record<string, { label: string; revenue: number; ordersCount: number; membersCount: number }> = {};
      const cur = new Date(start);

      while (cur <= end) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        const label = cur.toLocaleDateString('fr-FR', { month: 'short' });
        if (!monthBuckets[key]) {
          monthBuckets[key] = { label, revenue: 0, ordersCount: 0, membersCount: 0 };
        }
        cur.setMonth(cur.getMonth() + 1);
      }

      // Aggregate validated orders
      orders.forEach(o => {
        const oDate = new Date(o.createdAt);
        if (oDate >= start && oDate <= end) {
          const key = `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}`;
          if (monthBuckets[key]) {
            monthBuckets[key].ordersCount++;
            if (o.paymentStatus === 'paid_validated') {
              monthBuckets[key].revenue += Number(o.totalAmount) || 0;
            }
          }
        }
      });

      // Aggregate members
      members.forEach(m => {
        const mDate = new Date(m.created_at);
        if (mDate >= start && mDate <= end) {
          const key = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;
          if (monthBuckets[key]) {
            monthBuckets[key].membersCount++;
          }
        }
      });

      return Object.entries(monthBuckets).map(([dateStr, val]) => ({
        dateStr,
        ...val
      }));
    }

    // Daily breakdown for <= 35 days
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);

    while (cur <= end) {
      const dateStr = cur.toISOString().split('T')[0];
      const label = cur.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      days.push({
        dateStr,
        label,
        revenue: 0,
        ordersCount: 0,
        membersCount: 0
      });
      cur.setDate(cur.getDate() + 1);
    }

    // Populate daily real data
    orders.forEach(o => {
      const oDateStr = new Date(o.createdAt).toISOString().split('T')[0];
      const match = days.find(d => d.dateStr === oDateStr);
      if (match) {
        match.ordersCount++;
        if (o.paymentStatus === 'paid_validated') {
          match.revenue += Number(o.totalAmount) || 0;
        }
      }
    });

    members.forEach(m => {
      const mDateStr = new Date(m.created_at).toISOString().split('T')[0];
      const match = days.find(d => d.dateStr === mDateStr);
      if (match) {
        match.membersCount++;
      }
    });

    return days;
  }, [periodStart, periodEnd, orders, members]);

  // Total active data points check (strictly check if non-zero real data exists)
  const hasRealChartData = useMemo(() => {
    if (activeChartMetric === 'revenue') {
      return chartData.some(d => d.revenue > 0);
    }
    if (activeChartMetric === 'orders') {
      return chartData.some(d => d.ordersCount > 0);
    }
    return chartData.some(d => d.membersCount > 0);
  }, [chartData, activeChartMetric]);

  // Max value calculation for SVG scaling
  const maxMetricValue = useMemo(() => {
    let max = 0;
    chartData.forEach(d => {
      const val = activeChartMetric === 'revenue' 
        ? d.revenue 
        : activeChartMetric === 'orders' 
        ? d.ordersCount 
        : d.membersCount;
      if (val > max) max = val;
    });
    return max > 0 ? max : 10;
  }, [chartData, activeChartMetric]);

  // Payment totals for progress bar ratio
  const totalValidatedPaymentMethodsRevenue = stats.paymentMethods.tmoney.total + stats.paymentMethods.moov.total + stats.paymentMethods.other.total;
  const tmoneyPercent = totalValidatedPaymentMethodsRevenue > 0 
    ? Math.round((stats.paymentMethods.tmoney.total / totalValidatedPaymentMethodsRevenue) * 100) 
    : 0;
  const moovPercent = totalValidatedPaymentMethodsRevenue > 0 
    ? Math.round((stats.paymentMethods.moov.total / totalValidatedPaymentMethodsRevenue) * 100) 
    : 0;

  return (
    <div className="space-y-8">
      {/* 1. HEADER & PERIOD FILTER BAR */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-grey shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-brand-grey">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-brand-green/10 text-brand-green">
                Données Réelles & Comptabilité
              </span>
              <span className="text-xs text-brand-navy/40 font-bold">· Période : {periodLabel}</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-brand-navy mt-1">
              Statistiques et Performance
            </h2>
            <p className="text-xs sm:text-sm text-brand-navy/60 mt-0.5">
              Suivi exclusif des encaissements validés, des adhésions et de l'activité réelle de SANDRINO.
            </p>
          </div>

          {/* Quick Period Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-brand-grey p-1.5 rounded-2xl">
            {(
              [
                { id: 'today', label: "Aujourd'hui" },
                { id: 'last7', label: "7 jours" },
                { id: 'last30', label: "30 jours" },
                { id: 'thisMonth', label: "Ce mois-ci" },
                { id: 'thisYear', label: "Cette année" },
                { id: 'custom', label: "Personnalisé" }
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                onClick={() => setSelectedPeriod(btn.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedPeriod === btn.id
                    ? 'bg-brand-navy text-white shadow-sm'
                    : 'text-brand-navy/60 hover:text-brand-navy hover:bg-white/50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Pickers (if 'custom' selected) */}
        {selectedPeriod === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="pt-4 flex flex-wrap items-center gap-4 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-brand-navy/60 uppercase text-[10px]">Date début :</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-brand-grey border border-brand-grey font-mono text-xs text-brand-navy font-bold focus:outline-none focus:border-brand-green"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-brand-navy/60 uppercase text-[10px]">Date fin :</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-brand-grey border border-brand-grey font-mono text-xs text-brand-navy font-bold focus:outline-none focus:border-brand-green"
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* 2. REVENUS RÉELS (STRICTLY VALIDATED PAYMENTS ONLY) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="text-brand-green" />
            <h3 className="text-lg font-black uppercase text-brand-navy tracking-tight">
              Revenus Réels (Paiements Validés)
            </h3>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            Calculs certifiés
          </span>
        </div>

        {/* 4 Cards Revenue Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Revenus Totaux Validés */}
          <div className="bg-brand-navy text-white p-6 rounded-3xl relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/10 rounded-full blur-2xl"></div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-green block mb-2">
              Revenus Totaux Validés (À vie)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tight">
              {stats.lifetimeValidatedRevenue.toLocaleString('fr-FR')} <span className="text-sm font-bold text-brand-green">FCFA</span>
            </div>
            <p className="text-[11px] text-brand-grey/60 mt-2">
              Cumul des paiements reçus et approuvés par l'administrateur
            </p>
          </div>

          {/* Card 2: Revenus Période */}
          <div className="bg-white p-6 rounded-3xl border border-brand-grey shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-navy/40 block mb-2">
              Revenus sur la Période ({periodLabel})
            </span>
            <div className="text-2xl sm:text-3xl font-black text-brand-navy tabular-nums tracking-tight">
              {stats.periodValidatedRevenue.toLocaleString('fr-FR')} <span className="text-sm font-bold text-brand-navy/40">FCFA</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand-green mt-2">
              <CheckCircle2 size={13} />
              <span>{stats.validatedOrdersInPeriod.length} commande(s) validée(s)</span>
            </div>
          </div>

          {/* Card 3: Produits Numériques */}
          <div className="bg-white p-6 rounded-3xl border border-brand-grey shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-navy/40 block mb-2">
              Revenus Produits Numériques
            </span>
            <div className="text-2xl sm:text-3xl font-black text-brand-green tabular-nums tracking-tight">
              {stats.productRevenue.toLocaleString('fr-FR')} <span className="text-sm font-bold text-brand-green/60">FCFA</span>
            </div>
            <p className="text-[11px] text-brand-navy/50 mt-2">
              Guides pratiques, e-books et supports de cours
            </p>
          </div>

          {/* Card 4: Abonnements */}
          <div className="bg-white p-6 rounded-3xl border border-brand-grey shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-navy/40 block mb-2">
              Revenus Abonnements
            </span>
            <div className="text-2xl sm:text-3xl font-black text-brand-navy tabular-nums tracking-tight">
              {stats.subscriptionRevenue.toLocaleString('fr-FR')} <span className="text-sm font-bold text-brand-navy/40">FCFA</span>
            </div>
            <p className="text-[11px] text-brand-navy/50 mt-2">
              Souscriptions Standard et Premium encaissées
            </p>
          </div>
        </div>

        {/* Financial Transparency Alert Box */}
        <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-start gap-3 text-xs text-emerald-950">
          <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Règle de fiabilité comptable stricte :</strong> Seuls les paiements manuellement vérifiés et approuvés (SMS Mobile Money réels) sont pris en compte dans ces totaux. Les commandes en attente, les déclarations non encore vérifiées et les paiements refusés sont systématiquement exclus du chiffre d'affaires.
          </div>
        </div>
      </div>

      {/* 3. INDICATEURS CLÉS : MEMBRES, COMMANDES, PAIEMENTS, ABONNEMENTS, PRODUITS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* BLOC 1: MEMBRES */}
        <div className="bg-white p-6 rounded-3xl border border-brand-grey shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-brand-grey">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-brand-navy" />
              <h4 className="text-xs font-black uppercase text-brand-navy tracking-wider">Membres</h4>
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-brand-navy tabular-nums">
              {stats.totalMembersCount}
            </div>
            <p className="text-[11px] text-brand-navy/50">Membres inscrits au total</p>
          </div>
          <div className="pt-2 border-t border-brand-grey">
            <div className="flex items-center justify-between text-xs">
              <span className="text-brand-navy/60">Nouveaux ({periodLabel}) :</span>
              <strong className="text-brand-green font-mono">+{stats.newMembersInPeriod}</strong>
            </div>
          </div>
        </div>

        {/* BLOC 2: COMMANDES */}
        <div className="bg-white p-6 rounded-3xl border border-brand-grey shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-brand-grey">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-brand-navy" />
              <h4 className="text-xs font-black uppercase text-brand-navy tracking-wider">Commandes</h4>
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-brand-navy tabular-nums">
              {stats.totalOrdersCount}
            </div>
            <p className="text-[11px] text-brand-navy/50">Commandes générées</p>
          </div>
          <div className="pt-2 border-t border-brand-grey space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-brand-navy/60">Validées :</span>
              <strong className="text-emerald-700 font-mono">{stats.ordersValidatedCount}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-navy/60">En attente :</span>
              <strong className="text-amber-700 font-mono">{stats.ordersPendingCount}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-navy/60">Refusées :</span>
              <strong className="text-red-600 font-mono">{stats.ordersRefusedCount}</strong>
            </div>
          </div>
        </div>

        {/* BLOC 3: PAIEMENTS */}
        <div className="bg-white p-6 rounded-3xl border border-brand-grey shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-brand-grey">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-brand-navy" />
              <h4 className="text-xs font-black uppercase text-brand-navy tracking-wider">Paiements</h4>
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-700 tabular-nums">
              {stats.paymentsToVerifyCount}
            </div>
            <p className="text-[11px] text-brand-navy/50">À vérifier (reçu/SMS)</p>
          </div>
          <div className="pt-2 border-t border-brand-grey space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-brand-navy/60">Validés :</span>
              <strong className="text-emerald-700 font-mono">{stats.paymentsValidatedCount}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-navy/60">Refusés :</span>
              <strong className="text-red-600 font-mono">{stats.paymentsRefusedCount}</strong>
            </div>
          </div>
        </div>

        {/* BLOC 4: ABONNEMENTS */}
        <div className="bg-white p-6 rounded-3xl border border-brand-grey shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-brand-grey">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-brand-navy" />
              <h4 className="text-xs font-black uppercase text-brand-navy tracking-wider">Abonnements</h4>
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-brand-navy tabular-nums">
              {stats.activeSubsCount}
            </div>
            <p className="text-[11px] text-brand-navy/50">Adhésions actives</p>
          </div>
          <div className="pt-2 border-t border-brand-grey space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-brand-navy/60">Expirés :</span>
              <strong className="text-red-600 font-mono">{stats.expiredSubsCount}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-navy/60">En attente :</span>
              <strong className="text-amber-700 font-mono">{stats.pendingSubsCount}</strong>
            </div>
          </div>
        </div>

        {/* BLOC 5: PRODUITS */}
        <div className="bg-white p-6 rounded-3xl border border-brand-grey shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-brand-grey">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-brand-navy" />
              <h4 className="text-xs font-black uppercase text-brand-navy tracking-wider">Produits</h4>
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-brand-navy tabular-nums">
              {stats.activeProductsCatalogCount}
            </div>
            <p className="text-[11px] text-brand-navy/50">Au catalogue</p>
          </div>
          <div className="pt-2 border-t border-brand-grey space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-brand-navy/60">Ayant vendu :</span>
              <strong className="text-emerald-700 font-mono">{stats.productsWithAtLeastOneValidatedOrderCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. ÉVOLUTION DES DONNÉES (GRAPHIQUES RÉELS SANS FAUSSES DONNÉES) */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-grey shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black uppercase text-brand-navy tracking-tight">
              Évolution de l'activité ({periodLabel})
            </h3>
            <p className="text-xs text-brand-navy/60">
              Visualisation chronologique basée exclusivement sur vos enregistrements réels.
            </p>
          </div>

          {/* Metric Selector for Graph */}
          <div className="flex items-center gap-2 bg-brand-grey p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setActiveChartMetric('revenue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeChartMetric === 'revenue'
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'text-brand-navy/60 hover:text-brand-navy'
              }`}
            >
              Revenus validés (FCFA)
            </button>
            <button
              onClick={() => setActiveChartMetric('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeChartMetric === 'orders'
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'text-brand-navy/60 hover:text-brand-navy'
              }`}
            >
              Commandes
            </button>
            <button
              onClick={() => setActiveChartMetric('members')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeChartMetric === 'members'
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'text-brand-navy/60 hover:text-brand-navy'
              }`}
            >
              Nouveaux membres
            </button>
          </div>
        </div>

        {/* REAL CHART OR EMPTY STATE */}
        {hasRealChartData ? (
          <div className="space-y-4">
            {/* SVG Visual Bar/Area Chart */}
            <div className="h-64 w-full pt-4 flex items-end gap-2 overflow-x-auto">
              {chartData.map((point, index) => {
                const currentVal = activeChartMetric === 'revenue' 
                  ? point.revenue 
                  : activeChartMetric === 'orders' 
                  ? point.ordersCount 
                  : point.membersCount;
                
                const heightPercent = maxMetricValue > 0 
                  ? Math.max(Math.round((currentVal / maxMetricValue) * 100), currentVal > 0 ? 8 : 2)
                  : 2;

                return (
                  <div key={index} className="flex-1 min-w-[28px] max-w-[48px] flex flex-col items-center gap-2 group h-full justify-end">
                    {/* Tooltip Hover Value */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono font-bold bg-brand-navy text-white px-2 py-0.5 rounded shadow-sm whitespace-nowrap mb-1">
                      {activeChartMetric === 'revenue' ? `${currentVal.toLocaleString('fr-FR')} F` : currentVal}
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        currentVal > 0
                          ? activeChartMetric === 'revenue'
                            ? 'bg-brand-green group-hover:bg-brand-green/80'
                            : activeChartMetric === 'orders'
                            ? 'bg-brand-navy group-hover:bg-brand-navy/80'
                            : 'bg-emerald-600 group-hover:bg-emerald-700'
                          : 'bg-brand-grey/80'
                      }`}
                    ></div>

                    {/* Label (Date) */}
                    <span className="text-[10px] text-brand-navy/40 font-mono whitespace-nowrap block mt-1">
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-brand-navy/40 pt-2 border-t border-brand-grey">
              <span>Début de période</span>
              <span>Axe vertical : Max {activeChartMetric === 'revenue' ? `${maxMetricValue.toLocaleString('fr-FR')} FCFA` : maxMetricValue}</span>
              <span>Fin de période</span>
            </div>
          </div>
        ) : (
          /* MANDATORY REAL EMPTY STATE */
          <div className="text-center py-16 px-4 bg-slate-50/60 rounded-2xl border border-dashed border-brand-grey">
            <BarChart2 size={36} className="text-brand-navy/30 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-brand-navy mb-1">
              Aucune donnée enregistrée sur cette période
            </h4>
            <p className="text-xs text-brand-navy/50 max-w-md mx-auto">
              « Les statistiques apparaîtront ici lorsque votre activité commencera à générer des données. »
            </p>
          </div>
        )}
      </div>

      {/* 5. TOP PRODUITS & OFFRES LES PLUS DEMANDÉS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Top Produits par Ventes */}
        <div className="bg-white p-6 rounded-3xl border border-brand-grey shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-brand-grey">
            <Award size={18} className="text-brand-green" />
            <h4 className="text-xs font-black uppercase text-brand-navy tracking-wider">
              Produits les plus commandés
            </h4>
          </div>

          {stats.topProductsBySales.length > 0 ? (
            <div className="space-y-3">
              {stats.topProductsBySales.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-brand-grey/40 text-xs">
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <span className="w-5 h-5 rounded-full bg-brand-navy text-white text-[10px] font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-brand-navy truncate">{item.name}</span>
                  </div>
                  <strong className="text-emerald-700 shrink-0 font-mono">
                    {item.count} vente{item.count > 1 ? 's' : ''}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-brand-navy/40">
              Aucune commande validée de produit pour le moment.
            </div>
          )}
        </div>

        {/* Card 2: Top Produits par Revenus */}
        <div className="bg-white p-6 rounded-3xl border border-brand-grey shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-brand-grey">
            <TrendingUp size={18} className="text-brand-green" />
            <h4 className="text-xs font-black uppercase text-brand-navy tracking-wider">
              Produits générant le plus de revenus
            </h4>
          </div>

          {stats.topProductsByRevenue.length > 0 ? (
            <div className="space-y-3">
              {stats.topProductsByRevenue.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-brand-grey/40 text-xs">
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <span className="w-5 h-5 rounded-full bg-brand-green text-white text-[10px] font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-brand-navy truncate">{item.name}</span>
                  </div>
                  <strong className="text-brand-navy shrink-0 font-mono">
                    {item.revenue.toLocaleString('fr-FR')} FCFA
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-brand-navy/40">
              Aucun revenu validé sur les produits pour le moment.
            </div>
          )}
        </div>

        {/* Card 3: Répartition des Formules d'Abonnement */}
        <div className="bg-white p-6 rounded-3xl border border-brand-grey shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-brand-grey">
            <CreditCard size={18} className="text-brand-navy" />
            <h4 className="text-xs font-black uppercase text-brand-navy tracking-wider">
              Formules d'abonnement souscrites
            </h4>
          </div>

          <div className="space-y-3 text-xs">
            {/* Formule Gratuite */}
            <div className="p-3.5 rounded-2xl bg-brand-grey/40 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-brand-navy">Formule Gratuite</span>
                <strong className="font-mono text-brand-navy">{stats.subPlanCounts.free} membre(s)</strong>
              </div>
              <div className="h-2 w-full bg-brand-grey rounded-full overflow-hidden">
                <div 
                  style={{ width: `${stats.totalMembersCount > 0 ? (stats.subPlanCounts.free / stats.totalMembersCount) * 100 : 0}%` }}
                  className="h-full bg-slate-400"
                ></div>
              </div>
            </div>

            {/* Formule Standard */}
            <div className="p-3.5 rounded-2xl bg-brand-grey/40 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-brand-navy">Formule Standard</span>
                <strong className="font-mono text-emerald-700">{stats.subPlanCounts.standard} souscription(s)</strong>
              </div>
              <div className="h-2 w-full bg-brand-grey rounded-full overflow-hidden">
                <div 
                  style={{ width: `${stats.totalMembersCount > 0 ? (stats.subPlanCounts.standard / stats.totalMembersCount) * 100 : 0}%` }}
                  className="h-full bg-brand-green"
                ></div>
              </div>
            </div>

            {/* Formule Premium */}
            <div className="p-3.5 rounded-2xl bg-brand-grey/40 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-brand-navy">Formule Premium</span>
                <strong className="font-mono text-emerald-700">{stats.subPlanCounts.premium} souscription(s)</strong>
              </div>
              <div className="h-2 w-full bg-brand-grey rounded-full overflow-hidden">
                <div 
                  style={{ width: `${stats.totalMembersCount > 0 ? (stats.subPlanCounts.premium / stats.totalMembersCount) * 100 : 0}%` }}
                  className="h-full bg-brand-navy"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. DÉTAIL DES MOYENS DE PAIEMENT (PAIEMENTS VALIDÉS EXCLUSIVEMENT) */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-grey shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-grey">
          <div>
            <div className="flex items-center gap-2">
              <Smartphone size={20} className="text-brand-navy" />
              <h3 className="text-lg font-black uppercase text-brand-navy tracking-tight">
                Détail des Moyens de Paiement (Paiements Validés)
              </h3>
            </div>
            <p className="text-xs text-brand-navy/60 mt-0.5">
              Répartition des encaissements réels validés entre T-Money et Moov Money.
            </p>
          </div>

          <span className="text-[11px] font-bold text-brand-navy/50 bg-brand-grey px-3 py-1 rounded-xl">
            Total validé : {totalValidatedPaymentMethodsRevenue.toLocaleString('fr-FR')} FCFA
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* T-Money Card */}
          <div className="p-6 rounded-2xl border border-brand-grey bg-brand-grey/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-navy text-white font-black text-xs flex items-center justify-center">
                  TM
                </div>
                <div>
                  <h4 className="text-sm font-black text-brand-navy uppercase">T-Money (Togocom)</h4>
                  <span className="text-[10px] text-brand-navy/50 font-bold">Paiements validés</span>
                </div>
              </div>
              <span className="text-sm font-black font-mono text-brand-green">{tmoneyPercent}%</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-brand-navy/40 block">Transactions</span>
                <strong className="text-brand-navy font-mono text-base">{stats.paymentMethods.tmoney.count}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-brand-navy/40 block">Montant validé</span>
                <strong className="text-brand-green font-mono text-base">
                  {stats.paymentMethods.tmoney.total.toLocaleString('fr-FR')} FCFA
                </strong>
              </div>
            </div>

            <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-brand-grey">
              <div style={{ width: `${tmoneyPercent}%` }} className="h-full bg-brand-green"></div>
            </div>
          </div>

          {/* Moov Money Card */}
          <div className="p-6 rounded-2xl border border-brand-grey bg-brand-grey/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-green text-white font-black text-xs flex items-center justify-center">
                  MM
                </div>
                <div>
                  <h4 className="text-sm font-black text-brand-navy uppercase">Moov Money (Togo)</h4>
                  <span className="text-[10px] text-brand-navy/50 font-bold">Paiements validés</span>
                </div>
              </div>
              <span className="text-sm font-black font-mono text-brand-green">{moovPercent}%</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-brand-navy/40 block">Transactions</span>
                <strong className="text-brand-navy font-mono text-base">{stats.paymentMethods.moov.count}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-brand-navy/40 block">Montant validé</span>
                <strong className="text-brand-green font-mono text-base">
                  {stats.paymentMethods.moov.total.toLocaleString('fr-FR')} FCFA
                </strong>
              </div>
            </div>

            <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-brand-grey">
              <div style={{ width: `${moovPercent}%` }} className="h-full bg-brand-green"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
