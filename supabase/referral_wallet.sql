-- LePaisa wallet + referral reward setup
-- Run this ONCE in Supabase SQL Editor.
--
-- Rules:
--   1. New accounts start with ₹0.
--   2. Referred users receive ₹0.
--   3. The referrer receives exactly ₹100.
--   4. The reward is tied to Supabase account IDs, so it works across devices.
--   5. Manual deposits are not part of the application.

begin;

alter table public.profiles
    add column if not exists wallet_balance numeric(14,2) not null default 0;

alter table public.profiles
    add column if not exists referral_earnings numeric(14,2) not null default 0;

update public.profiles set wallet_balance = 0 where wallet_balance is null;
update public.profiles set referral_earnings = 0 where referral_earnings is null;

create unique index if not exists profiles_referral_code_unique_idx
    on public.profiles (referral_code)
    where referral_code is not null;

-- Atomic wallet change used by games. A browser cannot choose another user's id.
create or replace function public.change_lepaisa_wallet_balance(amount_delta numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
    next_balance numeric(14,2);
begin
    if auth.uid() is null then
        raise exception 'You must be signed in to use the wallet';
    end if;

    update public.profiles
       set wallet_balance = round(coalesce(wallet_balance, 0) + amount_delta, 2)
     where id = auth.uid()
       and round(coalesce(wallet_balance, 0) + amount_delta, 2) >= 0
     returning wallet_balance into next_balance;

    if next_balance is null then
        raise exception 'Insufficient wallet balance';
    end if;

    return next_balance;
end;
$$;

revoke all on function public.change_lepaisa_wallet_balance(numeric) from public;
grant execute on function public.change_lepaisa_wallet_balance(numeric) to authenticated;

-- Reward the referrer when the referred user's profile is created.
-- This is server-side and therefore works even when the users are on
-- completely different browsers, phones, or computers.
create or replace function public.apply_lepaisa_referral_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    referral_code_used text;
    referrer_id uuid;
begin
    select nullif(trim(raw_user_meta_data ->> 'referral_code_used'), '')
      into referral_code_used
      from auth.users
     where id = new.id;

    if referral_code_used is null then
        return new;
    end if;

    select p.id
      into referrer_id
      from public.profiles p
     where upper(trim(p.referral_code)) = upper(referral_code_used)
       and p.id <> new.id
     limit 1;

    if referrer_id is null then
        return new;
    end if;

    -- The referred user remains at ₹0; only the referrer is credited.
    update public.profiles
       set referred_by = referrer_id
     where id = new.id
       and referred_by is null;

    update public.profiles
       set wallet_balance = round(coalesce(wallet_balance, 0) + 100, 2),
           referral_earnings = round(coalesce(referral_earnings, 0) + 100, 2)
     where id = referrer_id;

    return new;
end;
$$;

revoke all on function public.apply_lepaisa_referral_reward() from public;
revoke all on function public.apply_lepaisa_referral_reward() from anon;
revoke all on function public.apply_lepaisa_referral_reward() from authenticated;

drop trigger if exists zz_lepaisa_referral_reward_after_profile_insert
    on public.profiles;

create trigger zz_lepaisa_referral_reward_after_profile_insert
after insert on public.profiles
for each row
execute function public.apply_lepaisa_referral_reward();

commit;
