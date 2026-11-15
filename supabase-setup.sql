-- SpendWise: Supabase Database Setup (new project)
-- Run this SQL in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).
-- Upgrading a project set up before accounts existed? Run supabase-multi-user.sql instead.

-- 1. Create the transactions table. Each entry belongs to one account.
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'other',
  date TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category);

-- 3. Row Level Security: each signed-in account sees and changes only its own
--    entries. Requests with just the anon key see nothing.
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own entries" ON transactions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 4. Invite list: only these emails can create an account (email or Google).
--    RLS with no policies, so the app can't read or change it.
CREATE TABLE IF NOT EXISTS allowed_emails (
  email TEXT PRIMARY KEY CHECK (email = lower(email))
);
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.enforce_invite_list()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.allowed_emails WHERE email = lower(NEW.email)
  ) THEN
    RAISE EXCEPTION 'not_invited';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_invite_list
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_invite_list();

-- Add yourself first, then each friend (lowercase):
INSERT INTO allowed_emails (email) VALUES ('you@example.com');

-- 5. (Optional) Auto-update the updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
