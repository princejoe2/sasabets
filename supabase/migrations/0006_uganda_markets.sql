-- Uganda-specific prediction markets (June–August 2026)
-- Run in Supabase SQL Editor. All markets use parimutuel pool, 8% rake.

INSERT INTO public.markets (title, description, options, status, closes_at, metadata)
VALUES

-- Political markets
(
  'Will Kizza Besigye be released from detention by end of July 2026?',
  'Dr. Kizza Besigye has been in military detention since November 2024. Will he be released before 1 August 2026?',
  '[{"id":"yes","label":"Yes — released"},{"id":"no","label":"No — still detained"}]'::jsonb,
  'open',
  '2026-07-31 21:00:00+03',
  '{"category":"politics"}'::jsonb
),
(
  'Will Kampala Mayor Lukwago run for President in 2026?',
  'Erias Lukwago has been vocal about the 2026 election. Will he officially file as a presidential candidate before the nomination deadline?',
  '[{"id":"yes","label":"Yes — files candidacy"},{"id":"no","label":"No — does not run"}]'::jsonb,
  'open',
  '2026-09-30 21:00:00+03',
  '{"category":"politics"}'::jsonb
),

-- Football markets
(
  'Will Uganda Cranes qualify for AFCON 2027?',
  'Uganda Cranes face qualifying matches in 2026. Will they qualify for the Africa Cup of Nations 2027?',
  '[{"id":"yes","label":"Yes — qualify"},{"id":"no","label":"No — eliminated"}]'::jsonb,
  'open',
  '2026-11-15 21:00:00+03',
  '{"category":"football"}'::jsonb
),
(
  'Will Uganda''s Teen Cranes (U17) win the AFCON U17 2025 title?',
  'Uganda''s U17 national team is in the running. Will they lift the AFCON U17 trophy?',
  '[{"id":"yes","label":"Yes — champions"},{"id":"no","label":"No — don''t win"}]'::jsonb,
  'open',
  '2026-08-31 21:00:00+03',
  '{"category":"football"}'::jsonb
),
(
  'Will KCCA FC win the FUFA Big League title 2025/26?',
  'KCCA FC vs Vipers SC and other contenders for the 2025/26 FUFA Big League title.',
  '[{"id":"kcca","label":"KCCA FC"},{"id":"vipers","label":"Vipers SC"},{"id":"other","label":"Another club"}]'::jsonb,
  'open',
  '2026-08-15 21:00:00+03',
  '{"category":"football"}'::jsonb
),

-- Economy / Infrastructure
(
  'Will the EACOP pipeline reach commercial operation before end of 2027?',
  'The East Africa Crude Oil Pipeline (Uganda–Tanzania) has faced delays. Will it begin commercial operations before 1 January 2028?',
  '[{"id":"yes","label":"Yes — operational by 2027"},{"id":"no","label":"No — delayed past 2027"}]'::jsonb,
  'open',
  '2027-01-01 00:00:00+03',
  '{"category":"infrastructure"}'::jsonb
),
(
  'Will Uganda''s UGX/USD rate exceed 4,000 by end of 2026?',
  'The Uganda Shilling has been under pressure. Will 1 USD cost more than UGX 4,000 before 31 December 2026?',
  '[{"id":"yes","label":"Yes — weakens past 4,000"},{"id":"no","label":"No — stays below 4,000"}]'::jsonb,
  'open',
  '2026-12-31 21:00:00+03',
  '{"category":"economy"}'::jsonb
),

-- Entertainment
(
  'Will Eddy Kenzo win at AFRIMMA 2026?',
  'Ugandan superstar Eddy Kenzo is a perennial favourite. Will he take home a major award at AFRIMMA 2026?',
  '[{"id":"yes","label":"Yes — wins an award"},{"id":"no","label":"No — doesn''t win"}]'::jsonb,
  'open',
  '2026-10-31 21:00:00+03',
  '{"category":"entertainment"}'::jsonb
),
(
  'Will Nyege Nyege Festival 2026 be held as planned in Jinja?',
  'Nyege Nyege is East Africa''s biggest electronic music festival. Will it take place as announced in September 2026 in Jinja?',
  '[{"id":"yes","label":"Yes — held as planned"},{"id":"no","label":"No — cancelled or moved"}]'::jsonb,
  'open',
  '2026-09-25 21:00:00+03',
  '{"category":"entertainment"}'::jsonb
),

-- Health
(
  'Will Uganda declare the current Ebola outbreak over by end of August 2026?',
  'Following recent Ebola alerts in Uganda. Will the Ministry of Health officially declare the outbreak over before 1 September 2026?',
  '[{"id":"yes","label":"Yes — declared over"},{"id":"no","label":"No — still active"}]'::jsonb,
  'open',
  '2026-08-31 21:00:00+03',
  '{"category":"default"}'::jsonb
)

ON CONFLICT DO NOTHING;
