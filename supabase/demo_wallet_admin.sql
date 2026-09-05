-- LePaisa demo wallet persistence + admin controls
-- Run AFTER supabase/referral_wallet.sql.
-- This is demo-token functionality. It does not process real payments.

create table if not exists public.wallet_cards (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    account_number text not null,
    ifcs_code text not null,
    created_at timestamptz not null default now(),
    unique (user_id)
);

create table if not exists public.deposit_submissions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    email text not null,
    reference text not null,
    amount numeric(14,2) not null default 100,
    status text not null default 'pending' check (status in ('pending','approved','rejected')),
    created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
    user_id uuid primary key references auth.users(id) on delete cascade,
    email text not null unique,
    created_at timestamptz not null default now()
);

create table if not exists public.admin_wallet_adjustments (
    id uuid primary key default gen_random_uuid(),
    admin_user_id uuid not null references auth.users(id) on delete restrict,
    target_user_id uuid not null references auth.users(id) on delete restrict,
    amount_delta numeric(14,2) not null,
    note text,
    created_at timestamptz not null default now()
);

alter table public.wallet_cards enable row level security;
alter table public.deposit_submissions enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_wallet_adjustments enable row level security;

drop policy if exists wallet_cards_select_own on public.wallet_cards;
create policy wallet_cards_select_own on public.wallet_cards
for select to authenticated using (user_id = auth.uid());

drop policy if exists wallet_cards_insert_own on public.wallet_cards;
create policy wallet_cards_insert_own on public.wallet_cards
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists wallet_cards_update_own on public.wallet_cards;
create policy wallet_cards_update_own on public.wallet_cards
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists wallet_cards_delete_own on public.wallet_cards;
create policy wallet_cards_delete_own on public.wallet_cards
for delete to authenticated using (user_id = auth.uid());

drop policy if exists deposit_submissions_insert_own on public.deposit_submissions;
create policy deposit_submissions_insert_own on public.deposit_submissions
for insert to authenticated
with check (user_id = auth.uid() and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists deposit_submissions_select_admin on public.deposit_submissions;
create policy deposit_submissions_select_admin on public.deposit_submissions
for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create or replace function public.lepaisa_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.lepaisa_is_admin() from public;
grant execute on function public.lepaisa_is_admin() to authenticated;

create or replace function public.admin_list_deposit_submissions()
returns table (
    id uuid,
    user_id uuid,
    email text,
    reference text,
    amount numeric,
    status text,
    created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.lepaisa_is_admin() then
        raise exception 'Admin access required';
    end if;

    return query
    select d.id, d.user_id, d.email, d.reference, d.amount, d.status, d.created_at
      from public.deposit_submissions d
     order by d.created_at desc;
end;
$$;

revoke all on function public.admin_list_deposit_submissions() from public;
grant execute on function public.admin_list_deposit_submissions() to authenticated;

create or replace function public.admin_add_wallet_tokens(
    target_email text,
    amount_to_add numeric,
    adjustment_note text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
    target_id uuid;
    next_balance numeric(14,2);
    delta numeric(14,2);
begin
    if not public.lepaisa_is_admin() then
        raise exception 'Admin access required';
    end if;

    delta := round(coalesce(amount_to_add, 0), 2);
    if delta <= 0 then
        raise exception 'Amount must be greater than zero';
    end if;

    select id into target_id
      from auth.users
     where lower(email) = lower(trim(target_email))
     limit 1;

    if target_id is null then
        raise exception 'User not found for that Gmail ID';
    end if;

    update public.profiles
       set wallet_balance = round(coalesce(wallet_balance, 0) + delta, 2)
     where id = target_id
     returning wallet_balance into next_balance;

    if next_balance is null then
        raise exception 'Profile not found for that user';
    end if;

    insert into public.admin_wallet_adjustments (admin_user_id, target_user_id, amount_delta, note)
    values (auth.uid(), target_id, delta, adjustment_note);

    return next_balance;
end;
$$;

revoke all on function public.admin_add_wallet_tokens(text, numeric, text) from public;
grant execute on function public.admin_add_wallet_tokens(text, numeric, text) to authenticated;

-- After you run this file, add YOUR OWN admin account once.
-- Replace YOUR_ADMIN_GMAIL with the Gmail used by your admin account.
-- Then run the two-line INSERT below:
-- insert into public.admin_users (user_id, email)
-- select id, email from auth.users where lower(email) = lower('YOUR_ADMIN_GMAIL');
