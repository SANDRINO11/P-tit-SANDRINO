-- ==============================================================================
-- SANDRINO PLATFORM — COMPLETE SUPABASE DATABASE SCHEMA & HARDENED RLS POLICIES
-- ==============================================================================
-- Instructions :
-- 1. Rendez-vous sur votre tableau de bord Supabase (https://supabase.com).
-- 2. Ouvrez le menu "SQL Editor" dans la barre latérale gauche.
-- 3. Cliquez sur "New query", collez l'intégralité de ce script et cliquez sur "Run".
-- ==============================================================================

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

-- 2. ORDERS
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

-- 3. PAYMENT DECLARATIONS (T-Money & Moov Money)
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

-- 4. PURCHASED DIGITAL PRODUCTS
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

-- 5. SUBSCRIPTIONS
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

-- Ensure unique constraint on subscriptions.user_id if table existed before
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_user_id_key'
  ) then
    alter table public.subscriptions add constraint subscriptions_user_id_key unique (user_id);
  end if;
exception when others then
  null;
end $$;

-- 6. MEMBER NOTIFICATIONS
create table if not exists public.member_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  order_id text,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz not null default now()
);

-- 7. PAYMENT SETTINGS
create table if not exists public.payment_settings (
  id text primary key default 'default',
  settings jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- 8. AUDIT LOGS
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  target_type text not null,
  target_id text,
  admin_id uuid references auth.users(id),
  admin_email text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- 9. SUPPORT TICKETS (PARTIE 14)
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

-- 10. SUPPORT MESSAGES / CONVERSATION (PARTIE 14)
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.support_tickets(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role text not null check (sender_role in ('visitor', 'member', 'admin')),
  sender_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- 11. PRODUCTS CATALOG (Couverture & Fichier Numérique)
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

-- 12. SUBSCRIPTION PLANS (Tarifs et avantages configurables par l'admin)
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

-- ==============================================================================
-- SECURITY HELPER FUNCTION (Avoids infinite recursion in RLS policies)
-- ==============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'petitsandrino1@gmail.com'
  ) or exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Prevent any non-admin user from escalating their role or status
create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists protect_profile_role_on_update on public.profiles;
create trigger protect_profile_role_on_update
  before update on public.profiles
  for each row execute function public.prevent_profile_role_escalation();

-- Automatically mark order as payment_declared when member submits declaration
create or replace function public.sync_order_on_declaration()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  update public.orders
  set
    payment_status = 'payment_declared',
    payment_method = new.payment_method,
    payment_details = jsonb_build_object(
      'senderPhone', new.sender_phone,
      'transactionRef', new.transaction_ref,
      'paymentDate', new.payment_date,
      'receiptUrl', new.receipt_url
    ),
    updated_at = now()
  where id::text = new.order_id
    and user_id = new.user_id
    and payment_status in ('pending_payment', 'payment_declared');
  return new;
end;
$$;

drop trigger if exists on_payment_declaration_created on public.payment_declarations;
create trigger on_payment_declaration_created
  after insert on public.payment_declarations
  for each row execute function public.sync_order_on_declaration();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & CLEANUP OF LEGACY RECURSIVE POLICIES
-- ==============================================================================
do $$
declare
  pol record;
begin
  for pol in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'orders', 'payment_declarations', 'purchased_products',
        'subscriptions', 'member_notifications', 'payment_settings',
        'admin_audit_logs', 'support_tickets', 'support_messages',
        'products', 'subscription_plans'
      )
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.payment_declarations enable row level security;
alter table public.purchased_products enable row level security;
alter table public.subscriptions enable row level security;
alter table public.member_notifications enable row level security;
alter table public.payment_settings enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.products enable row level security;
alter table public.subscription_plans enable row level security;

-- PROFILES POLICIES (Non-recursive)
drop policy if exists "Profiles read policy" on public.profiles;
create policy "Profiles read policy" on public.profiles for select using (
  auth.uid() = id or public.is_admin()
);

drop policy if exists "Profiles update policy" on public.profiles;
create policy "Profiles update policy" on public.profiles for update using (
  auth.uid() = id or public.is_admin()
) with check (
  auth.uid() = id or public.is_admin()
);

drop policy if exists "Profiles insert policy" on public.profiles;
create policy "Profiles insert policy" on public.profiles for insert with check (
  (auth.uid() = id and role = 'member' and status = 'active') or public.is_admin()
);

-- ORDERS POLICIES
drop policy if exists "Orders read policy" on public.orders;
create policy "Orders read policy" on public.orders for select using (
  auth.uid() = user_id or public.is_admin()
);

drop policy if exists "Orders insert policy" on public.orders;
create policy "Orders insert policy" on public.orders for insert with check (
  (auth.uid() = user_id and payment_status = 'pending_payment' and order_status = 'pending')
  or public.is_admin()
);

drop policy if exists "Orders update policy" on public.orders;
create policy "Orders update policy" on public.orders for update using (
  public.is_admin()
);

-- PAYMENT DECLARATIONS POLICIES
drop policy if exists "Declarations select" on public.payment_declarations;
create policy "Declarations select" on public.payment_declarations for select using (
  auth.uid() = user_id or public.is_admin()
);

drop policy if exists "Declarations insert" on public.payment_declarations;
create policy "Declarations insert" on public.payment_declarations for insert with check (
  (auth.uid() = user_id and status = 'payment_declared') or public.is_admin()
);

drop policy if exists "Declarations update" on public.payment_declarations;
create policy "Declarations update" on public.payment_declarations for update using (
  public.is_admin()
);

-- PURCHASED PRODUCTS POLICIES
drop policy if exists "Purchased products select" on public.purchased_products;
create policy "Purchased products select" on public.purchased_products for select using (
  auth.uid() = user_id or public.is_admin()
);

drop policy if exists "Purchased products all admin" on public.purchased_products;
create policy "Purchased products all admin" on public.purchased_products for all using (
  public.is_admin()
);

-- SUBSCRIPTIONS POLICIES
drop policy if exists "Subscriptions select" on public.subscriptions;
create policy "Subscriptions select" on public.subscriptions for select using (
  auth.uid() = user_id or public.is_admin()
);

drop policy if exists "Subscriptions all admin" on public.subscriptions;
create policy "Subscriptions all admin" on public.subscriptions for all using (
  public.is_admin()
);

-- NOTIFICATIONS POLICIES
drop policy if exists "Notifications select" on public.member_notifications;
create policy "Notifications select" on public.member_notifications for select using (
  auth.uid() = user_id or public.is_admin()
);

drop policy if exists "Notifications update own" on public.member_notifications;
create policy "Notifications update own" on public.member_notifications for update using (
  auth.uid() = user_id
);

drop policy if exists "Notifications all admin" on public.member_notifications;
create policy "Notifications all admin" on public.member_notifications for all using (
  public.is_admin()
);

-- PAYMENT SETTINGS POLICIES
drop policy if exists "Settings select" on public.payment_settings;
create policy "Settings select" on public.payment_settings for select using (true);

drop policy if exists "Settings all admin" on public.payment_settings;
create policy "Settings all admin" on public.payment_settings for all using (
  public.is_admin()
);

-- AUDIT LOGS POLICIES
drop policy if exists "Audit logs admin" on public.admin_audit_logs;
create policy "Audit logs admin" on public.admin_audit_logs for all using (
  public.is_admin()
);

-- SUPPORT TICKETS POLICIES (PARTIE 14)
drop policy if exists "Support tickets insert" on public.support_tickets;
create policy "Support tickets insert" on public.support_tickets for insert with check (
  status = 'new' and (user_id is null or auth.uid() = user_id or public.is_admin())
);

drop policy if exists "Support tickets read" on public.support_tickets;
create policy "Support tickets read" on public.support_tickets for select using (
  auth.uid() = user_id or public.is_admin()
);

drop policy if exists "Support tickets update" on public.support_tickets;
create policy "Support tickets update" on public.support_tickets for update using (
  auth.uid() = user_id or public.is_admin()
);

-- SUPPORT MESSAGES POLICIES (PARTIE 14)
drop policy if exists "Support messages insert" on public.support_messages;
create policy "Support messages insert" on public.support_messages for insert with check (
  (
    sender_role in ('visitor', 'member')
    and (sender_id is null or auth.uid() = sender_id)
  ) or public.is_admin()
);

drop policy if exists "Support messages read" on public.support_messages;
create policy "Support messages read" on public.support_messages for select using (
  exists (
    select 1 from public.support_tickets t 
    where t.id = ticket_id and (t.user_id = auth.uid() or public.is_admin())
  )
);

-- ==============================================================================
-- PRIVATE STORAGE BUCKETS & POLICIES (DIGITAL PRODUCTS + PAYMENT RECEIPTS)
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('digital-products', 'digital-products', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('private_receipts', 'private_receipts', false)
on conflict (id) do update set public = false;

drop policy if exists "Digital products read authorized" on storage.objects;
create policy "Digital products read authorized" on storage.objects for select using (
  bucket_id = 'digital-products' and (
    public.is_admin() or exists (
      select 1 from public.purchased_products p
      where p.user_id = auth.uid()
        and p.file_available = true
        and p.file_path = name
    )
  )
);

drop policy if exists "Digital products admin write" on storage.objects;
create policy "Digital products admin write" on storage.objects for all using (
  bucket_id = 'digital-products' and public.is_admin()
);

-- PRODUCTS CATALOG POLICIES
drop policy if exists "Products public read" on public.products;
create policy "Products public read" on public.products for select using (true);

drop policy if exists "Products admin write" on public.products;
create policy "Products admin write" on public.products for all using (
  public.is_admin()
);

-- SUBSCRIPTION PLANS POLICIES
drop policy if exists "Subscription plans public read" on public.subscription_plans;
create policy "Subscription plans public read" on public.subscription_plans for select using (true);

drop policy if exists "Subscription plans admin write" on public.subscription_plans;
create policy "Subscription plans admin write" on public.subscription_plans for all using (
  public.is_admin()
);

-- PUBLIC BUCKET FOR PRODUCT COVERS
insert into storage.buckets (id, name, public)
values ('product-covers', 'product-covers', true)
on conflict (id) do update set public = true;

drop policy if exists "Product covers public read" on storage.objects;
create policy "Product covers public read" on storage.objects for select using (
  bucket_id = 'product-covers'
);

drop policy if exists "Product covers admin write" on storage.objects;
create policy "Product covers admin write" on storage.objects for all using (
  bucket_id = 'product-covers' and public.is_admin()
);

drop policy if exists "Private receipts insert own" on storage.objects;
create policy "Private receipts insert own" on storage.objects for insert with check (
  bucket_id = 'private_receipts'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Private receipts read authorized" on storage.objects;
create policy "Private receipts read authorized" on storage.objects for select using (
  bucket_id = 'private_receipts' and (
    public.is_admin() or (storage.foldername(name))[2] = auth.uid()::text
  )
);

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_owner boolean;
begin
  is_owner := (lower(new.email) = 'petitsandrino1@gmail.com');
  insert into public.profiles (id, full_name, email, phone, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    case when is_owner then 'admin' else 'member' end,
    'active'
  )
  on conflict (id) do update set
    email = excluded.email,
    role = case when is_owner then 'admin' else public.profiles.role end;

  -- Default free subscription
  insert into public.subscriptions (user_id, plan_id, plan_name, price, status, features)
  values (
    new.id,
    'free',
    'Formule Gratuite',
    0,
    'active',
    array['Accès aux contenus gratuits', 'Fonctionnalités de base']
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Owner assignment for existing user if already registered
update public.profiles
set role = 'admin'
where lower(email) = 'petitsandrino1@gmail.com';
