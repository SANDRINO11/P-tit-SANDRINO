import { SUBSCRIPTION_PLANS, SubscriptionPlan, PlanType } from '../data/subscriptions';
import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_PLANS_KEY = 'sandrino_subscription_plans';
const LOCAL_PLANS_META_KEY = 'sandrino_subscription_plans_updated_at';

function mergeWithDefaults(plans: SubscriptionPlan[]): SubscriptionPlan[] {
  const byId = new Map<string, SubscriptionPlan>();
  for (const base of SUBSCRIPTION_PLANS) {
    byId.set(base.id, { ...base });
  }
  for (const item of plans) {
    if (item && item.id) {
      byId.set(item.id, {
        id: item.id as PlanType,
        name: String(item.name || byId.get(item.id)?.name || 'Formule'),
        price: Math.max(0, Number(item.price) || 0),
        billingCycle: String(item.billingCycle || byId.get(item.id)?.billingCycle || 'Mensuel'),
        features: Array.isArray(item.features) ? item.features : (byId.get(item.id)?.features || []),
        isHighlighted: Boolean(item.isHighlighted)
      });
    }
  }
  const order: PlanType[] = ['free', 'standard', 'premium'];
  const ordered: SubscriptionPlan[] = [];
  for (const id of order) {
    const found = byId.get(id);
    if (found) ordered.push(found);
  }
  for (const [id, plan] of byId.entries()) {
    if (!order.includes(id as PlanType)) {
      ordered.push(plan);
    }
  }
  return ordered;
}

function readLocalPlans(): SubscriptionPlan[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_PLANS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return mergeWithDefaults(parsed);
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function readLocalPlansTimestamp(): number {
  try {
    const raw = localStorage.getItem(LOCAL_PLANS_META_KEY);
    return raw ? Date.parse(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

function writeLocalPlans(list: SubscriptionPlan[], updatedAt?: string): void {
  try {
    localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(mergeWithDefaults(list)));
    if (updatedAt) {
      localStorage.setItem(LOCAL_PLANS_META_KEY, updatedAt);
    }
  } catch {
    // Ignore quota errors
  }
}

async function getAccessToken(): Promise<string | undefined> {
  if (!isSupabaseConfigured) return undefined;
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session) return undefined;

    if (session.expires_at && session.expires_at * 1000 < Date.now() + 60_000) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed?.session?.access_token) {
        return refreshed.session.access_token;
      }
    }
    return session.access_token;
  } catch {
    return undefined;
  }
}

function mapRowToPlan(row: any): SubscriptionPlan {
  return {
    id: String(row.id) as PlanType,
    name: String(row.name || ''),
    price: Math.max(0, Number(row.price) || 0),
    billingCycle: String(row.billing_cycle || 'Mensuel'),
    features: Array.isArray(row.features) ? row.features : [],
    isHighlighted: Boolean(row.is_highlighted)
  };
}

export const subscriptionService = {
  getPlansSync(): SubscriptionPlan[] {
    const local = readLocalPlans();
    return local !== null ? local : SUBSCRIPTION_PLANS;
  },

  async getPlans(): Promise<SubscriptionPlan[]> {
    let supabasePlans: SubscriptionPlan[] | null = null;
    let supabaseMaxTs = 0;

    let serverPlans: SubscriptionPlan[] | null = null;
    let serverIsCustom = false;
    let serverTs = 0;

    // 1. Fetch Supabase public.subscription_plans if configured
    const supabasePromise = (async () => {
      if (!isSupabaseConfigured) return;
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .order('sort_order', { ascending: true });

        if (!error && data && data.length > 0) {
          supabasePlans = mergeWithDefaults(data.map(mapRowToPlan));
          for (const row of data) {
            const ts = row.updated_at ? Date.parse(row.updated_at) || 0 : 0;
            if (ts > supabaseMaxTs) supabaseMaxTs = ts;
          }
        }
      } catch {
        // Table may not exist yet; continue
      }
    })();

    // 2. Fetch Express server plans (/api/subscriptions) with cache disabled
    const serverPromise = (async () => {
      try {
        const res = await fetch('/api/subscriptions', {
          credentials: 'same-origin',
          cache: 'no-store'
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.plans) && json.plans.length > 0) {
            serverPlans = mergeWithDefaults(json.plans);
            serverIsCustom = Boolean(json.isCustomPlans);
            serverTs = json.updatedAt ? Date.parse(json.updatedAt) || 0 : 0;
          }
        }
      } catch {
        // Fall through
      }
    })();

    await Promise.all([supabasePromise, serverPromise]);

    const localTs = readLocalPlansTimestamp();
    const localPlans = readLocalPlans();

    // Choose the freshest authoritative source so stale Supabase data never overwrites Express/local saves
    if (serverIsCustom && serverPlans) {
      if (supabasePlans && supabaseMaxTs > serverTs) {
        writeLocalPlans(supabasePlans, new Date(supabaseMaxTs).toISOString());
        return supabasePlans;
      }
      if (localPlans && localTs > serverTs && localTs > supabaseMaxTs) {
        return localPlans;
      }
      writeLocalPlans(serverPlans, serverTs ? new Date(serverTs).toISOString() : undefined);
      return serverPlans;
    }

    if (supabasePlans) {
      if (localPlans && localTs > supabaseMaxTs) {
        return localPlans;
      }
      writeLocalPlans(supabasePlans, supabaseMaxTs ? new Date(supabaseMaxTs).toISOString() : undefined);
      return supabasePlans;
    }

    if (localPlans !== null) {
      return localPlans;
    }

    return serverPlans || SUBSCRIPTION_PLANS;
  },

  async savePlan(updatedPlan: SubscriptionPlan, currentList?: SubscriptionPlan[]): Promise<SubscriptionPlan[]> {
    const baseList = mergeWithDefaults(currentList ?? this.getPlansSync());
    const normalizedPlan: SubscriptionPlan = {
      id: updatedPlan.id,
      name: String(updatedPlan.name || 'Formule').trim(),
      price: Math.max(0, Number(updatedPlan.price) || 0),
      billingCycle: String(updatedPlan.billingCycle || 'Mensuel').trim(),
      features: Array.isArray(updatedPlan.features) ? updatedPlan.features : [],
      isHighlighted: Boolean(updatedPlan.isHighlighted)
    };

    const updatedList = mergeWithDefaults(
      baseList.some(p => p.id === normalizedPlan.id)
        ? baseList.map(p => (p.id === normalizedPlan.id ? normalizedPlan : p))
        : [...baseList, normalizedPlan]
    );

    const nowIso = new Date().toISOString();
    writeLocalPlans(updatedList, nowIso);

    let supabaseOk = false;
    let serverOk = false;
    let lastError: string | null = null;

    // 1. Persist ALL plans to Supabase subscription_plans so no tier is missing or stale
    if (isSupabaseConfigured) {
      try {
        const rows = updatedList.map((plan, idx) => ({
          id: plan.id,
          name: plan.name,
          price: Math.max(0, Number(plan.price) || 0),
          billing_cycle: plan.billingCycle || 'Mensuel',
          features: plan.features || [],
          is_highlighted: Boolean(plan.isHighlighted),
          sort_order: plan.id === 'free' ? 1 : plan.id === 'standard' ? 2 : plan.id === 'premium' ? 3 : idx + 1,
          updated_at: nowIso
        }));
        const { error } = await supabase
          .from('subscription_plans')
          .upsert(rows, { onConflict: 'id' });
        if (!error) {
          supabaseOk = true;
        } else {
          lastError = error.message;
        }
      } catch (err: any) {
        lastError = err?.message || null;
      }
    }

    // 2. Sync to Express server (/api/subscriptions/save) so public pages immediately display live prices
    try {
      const accessToken = await getAccessToken();
      const res = await fetch('/api/subscriptions/save', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plans: updatedList,
          ...(accessToken ? { accessToken } : {})
        })
      });

      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.updatedAt) {
          writeLocalPlans(updatedList, json.updatedAt);
        }
        serverOk = true;
      } else {
        const errJson = await res.json().catch(() => null);
        lastError = errJson?.error || `Erreur serveur (HTTP ${res.status}) lors de l'enregistrement des tarifs.`;
      }
    } catch (err: any) {
      lastError = err?.message || lastError;
    }

    if (!supabaseOk && !serverOk && lastError) {
      throw new Error(lastError);
    }

    return updatedList;
  }
};
