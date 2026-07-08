-- 0011: Featured markets + WhatsApp opt-in

ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp_opted_in BOOLEAN DEFAULT FALSE NOT NULL;

-- Let authenticated users toggle their own WhatsApp opt-in (same pattern as push_enabled)
GRANT UPDATE(whatsapp_opted_in) ON profiles TO authenticated;

CREATE INDEX IF NOT EXISTS idx_markets_is_featured ON markets(is_featured) WHERE is_featured = TRUE;
