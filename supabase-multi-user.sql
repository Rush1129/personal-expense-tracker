-- SpendWise: move an existing single-user database to accounts
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).
--
-- Before running:
--   1. Authentication → Users → Add user → Create new user: your own email and
--      a password, with "Auto Confirm User" ticked.
--   2. Put that email on the line marked ← below.
--
-- Everything runs in one transaction: if your account doesn't exist yet,
-- nothing changes. Then deploy the new app version straight away; until it
-- reaches your phone, the old version can't sync (its entries wait on the phone).

begin;

-- 1. Invite list: only these emails can create an account (email or Google)
create table if not exists public.allowed_emails (
  email text primary key check (email = lower(email))
);
-- RLS with no policies: the app can't read or change the list
alter table public.allowed_emails enable row level security;

create or replace function public.enforce_invite_list()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or not exists (
    select 1 from public.allowed_emails where email = lower(new.email)
  ) then
    raise exception 'not_invited';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_invite_list on auth.users;
create trigger enforce_invite_list
  before insert on auth.users
  for each row execute function public.enforce_invite_list();

-- 2. Every entry belongs to one account
alter table public.transactions
  add column if not exists user_id uuid references auth.users (id) on delete cascade default auth.uid();

do $$
declare
  owner_email text := lower('you@example.com');   -- ← your SpendWise sign-in email
  owner_id uuid;
begin
  select id into owner_id from auth.users where email = owner_email;
  if owner_id is null then
    raise exception 'No account for %. Create it first: Authentication → Users → Add user.', owner_email;
  end if;
  insert into public.allowed_emails (email) values (owner_email) on conflict do nothing;
  -- Your existing entries become yours
  update public.transactions set user_id = owner_id where user_id is null;
end;
$$;

alter table public.transactions alter column user_id set not null;
create index if not exists idx_transactions_user_date on public.transactions (user_id, date desc);

-- 3. Each account sees and changes only its own entries
drop policy if exists "Allow all for anon" on public.transactions;
drop policy if exists "Own entries" on public.transactions;
create policy "Own entries" on public.transactions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;

-- Invite a friend (lowercase email):
--   insert into public.allowed_emails (email) values ('friend@example.com');
