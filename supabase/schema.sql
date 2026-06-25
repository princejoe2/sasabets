-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  phone text not null,
  full_name text,
  is_admin boolean default false,
  referral_code text unique,
  referred_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Wallets
create table public.wallets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade unique not null,
  balance numeric(12,2) default 0 check (balance >= 0),
  updated_at timestamptz default now()
);

-- Markets
create table public.markets (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  options jsonb not null,
  status text default 'open' check (status in ('open', 'closed', 'settling', 'settled', 'cancelled')),
  winning_option_id text,
  total_pool numeric(12,2) default 0,
  rake_pct numeric(5,4) default 0.08,
  closes_at timestamptz,
  settled_at timestamptz,
  created_by uuid references public.profiles,
  created_at timestamptz default now()
);

-- Bets
create table public.bets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  market_id uuid references public.markets on delete cascade not null,
  option_id text not null,
  amount numeric(12,2) not null check (amount > 0),
  potential_payout numeric(12,2),
  settled_payout numeric(12,2),
  status text default 'active' check (status in ('active', 'won', 'lost', 'refunded', 'exited')),
  placed_at timestamptz default now()
);

-- Transactions
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  type text not null check (type in ('deposit', 'withdrawal', 'bet', 'payout', 'refund', 'rake', 'referral_bonus', 'cashout')),
  amount numeric(12,2) not null,
  balance_after numeric(12,2),
  reference text,
  pesapal_tracking_id text,
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  metadata jsonb,
  created_at timestamptz default now()
);

-- Auto-create profile + wallet on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, phone, full_name)
  values (
    new.id,
    coalesce(new.phone, new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  insert into public.wallets (user_id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.markets enable row level security;
alter table public.bets enable row level security;
alter table public.transactions enable row level security;

-- Profiles
create policy "Users see own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins see all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Wallets
create policy "Users see own wallet" on public.wallets for select using (auth.uid() = user_id);
create policy "Users update own wallet" on public.wallets for update using (auth.uid() = user_id);

-- Markets: everyone can read open markets
create policy "Anyone reads markets" on public.markets for select using (true);
create policy "Admins manage markets" on public.markets for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Bets
create policy "Users see own bets" on public.bets for select using (auth.uid() = user_id);
create policy "Users insert own bets" on public.bets for insert with check (auth.uid() = user_id);
create policy "Admins see all bets" on public.bets for select using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Transactions
create policy "Users see own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Admins see all transactions" on public.transactions for select using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Referral bonuses tracking (one row per referred user — unique constraint prevents double-pay)
create table public.referral_events (
  id           uuid default gen_random_uuid() primary key,
  referrer_id  uuid not null references public.profiles(id),
  referred_id  uuid not null references public.profiles(id) unique,
  bonus_amount numeric(12,2) not null default 5000,
  created_at   timestamptz default now()
);

alter table public.referral_events enable row level security;

create policy "Referrers see own events" on public.referral_events
  for select using (auth.uid() = referrer_id);

-- Auto-generate referral code on profile creation
create or replace function public.generate_referral_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code  text; i int; tries int := 0;
begin
  loop
    code := '';
    for i in 1..7 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = code);
    tries := tries + 1;
    if tries > 200 then raise exception 'Cannot generate unique referral code'; end if;
  end loop;
  return code;
end;
$$;

create or replace function public.set_profile_referral_code()
returns trigger language plpgsql as $$
begin
  if NEW.referral_code is null then
    NEW.referral_code := public.generate_referral_code();
  end if;
  return NEW;
end;
$$;

create trigger trg_profile_referral_code
  before insert on public.profiles
  for each row execute function public.set_profile_referral_code();

-- NOTE: After running this schema, grant yourself admin with:
-- update public.profiles set is_admin = true where phone = '+256YOUR_NUMBER';
