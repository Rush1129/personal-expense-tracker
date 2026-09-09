-- SpendWise: Supabase Database Setup
-- Run this SQL in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- 1. Create the transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'other',
  date TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category);

-- 3. Enable Row Level Security (RLS)
--    For v1 (no auth), we allow all operations via anon key.
--    When you add auth later, update the policies to use auth.uid().
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for the anon role (single-user, no auth needed)
CREATE POLICY "Allow all for anon" ON transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. (Optional) Auto-update the updatedAt timestamp
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
