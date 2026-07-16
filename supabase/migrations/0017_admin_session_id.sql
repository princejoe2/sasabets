-- Adds admin_session_id so the panel enforces single-device sessions.
-- When TOTP is verified, a new UUID is written here. The sidebar watches
-- this column via Realtime and signs out any other open session immediately.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_session_id UUID;
