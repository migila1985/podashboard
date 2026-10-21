-- Mijn Uitgaven schema. Money is stored as integer euro cents (expenses negative, income positive).
create extension if not exists "pgcrypto";

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  masked_number text,
  currency text not null default 'EUR',
  opening_balance_cents bigint not null default 0,
  opening_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete set null,
  name text not null check (char_length(name) between 1 and 100),
  color text not null default '#94a3b8',
  icon text,
  sort_order integer not null default 0,
  kind text not null default 'expense' check (kind in ('expense', 'income', 'both')),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  match_field text not null check (match_field in ('counterparty', 'description', 'counter_account', 'type')),
  match_type text not null check (match_type in ('contains', 'equals')),
  match_value text not null,
  min_cents bigint,
  max_cents bigint,
  priority integer not null default 100,
  active boolean not null default true,
  times_applied integer not null default 0,
  last_applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  filename text not null,
  file_hash text not null,
  rows_total integer not null default 0,
  rows_inserted integer not null default 0,
  rows_duplicate integer not null default 0,
  rows_error integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  import_id uuid references public.imports(id) on delete set null,
  booking_date date not null,
  value_date date,
  amount_cents bigint not null,
  currency text not null default 'EUR',
  counterparty text not null default '',
  counter_account text,
  description text not null default '',
  type text not null default '',
  own_account text,
  external_id text,
  fingerprint text not null,
  dedupe_key text,
  raw jsonb,
  category_id uuid references public.categories(id) on delete set null,
  category_source text not null default 'unassigned' check (category_source in ('manual', 'rule', 'unassigned')),
  rule_id uuid references public.rules(id) on delete set null,
  excluded boolean not null default false,
  is_internal_transfer boolean not null default false,
  possible_duplicate boolean not null default false,
  duplicate_reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint transactions_unique_fingerprint unique (user_id, account_id, fingerprint)
);

create index if not exists transactions_user_date_idx on public.transactions (user_id, booking_date desc);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['accounts', 'categories', 'rules', 'imports', 'transactions', 'audit_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%1$s_own" on public.%1$I', t);
    execute format(
      'create policy "%1$s_own" on public.%1$I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;
