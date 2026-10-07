-- ═══════════════════════════════════════════════════════════════════
-- OCT–DEC 2026 MARKET BATCH  (20 markets)
-- All closes_at in EAT (UTC+3). Admin user = 872fa080-c08c-490c-aa89-dfba258be987
-- Inserted 2026-10-07. Do NOT truncate — appends to existing markets.
-- ═══════════════════════════════════════════════════════════════════

-- ── FOOTBALL ─────────────────────────────────────────────────────────

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Uganda Cranes beat South Sudan in the AFCON 2027 qualifier?',
  'Uganda face South Sudan in their November 2026 AFCON 2027 Group C qualifier. The Cranes have been inconsistent — can they pick up a crucial home win at Mandela National Stadium and keep qualification hopes alive?',
  '[{"id":"yes","label":"Yes — Uganda win"},{"id":"no","label":"No — draw or South Sudan win"}]',
  'open', '2026-11-17 20:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"Uganda Cranes win the Group C AFCON 2027 qualifier against South Sudan in November 2026. A draw or South Sudan win resolves NO."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Uganda Cranes qualify for AFCON 2027?',
  'Uganda are in AFCON 2027 Group C qualifying. With Guinea and Tanzania also in the group, qualification is not guaranteed. Will the Cranes earn one of the automatic berths or make it via playoffs by the end of the qualifying campaign?',
  '[{"id":"yes","label":"Yes — Uganda qualify"},{"id":"no","label":"No — eliminated"}]',
  'open', '2026-11-19 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"Uganda Cranes advance to AFCON 2027 (Morocco) — either directly from the group or via the playoff round. Resolves YES when qualification is confirmed, NO when elimination is confirmed."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Vipers SC top the UPL table after Match Day 10?',
  'Vipers SC are perennial champions of the Uganda Premier League. The 2026/27 season is underway — will they be sitting at the top of the table after Match Day 10, showing early title intent?',
  '[{"id":"yes","label":"Yes — Vipers top the table"},{"id":"no","label":"No — another club leads"}]',
  'open', '2026-12-15 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"Vipers SC sit in 1st place on the Uganda Premier League table after Match Day 10 of the 2026/27 season."}'
);

-- ── BALLON D''OR ──────────────────────────────────────────────────────

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Who wins the 2026 Ballon d''Or — Mbappé, Haaland, or someone else?',
  'The 2026 Ballon d''Or ceremony is expected in late November. After the World Cup, Mbappé and Haaland are the frontrunners, but Lamine Yamal''s stellar tournament could upset the favorites. Three outcomes — who takes football''s biggest individual prize?',
  '[{"id":"mbappe","label":"Kylian Mbappé"},{"id":"haaland","label":"Erling Haaland"},{"id":"other","label":"Someone else (Yamal, etc.)"}]',
  'open', '2026-11-28 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"The player announced as the 2026 Ballon d''Or winner at the official ceremony. Resolves to the matching option."}'
);

-- ── ECONOMY ──────────────────────────────────────────────────────────

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will the Bank of Uganda cut its Central Bank Rate in October 2026?',
  'The Bank of Uganda Monetary Policy Committee meets in October 2026. With inflation pressure easing, markets are watching whether the BOU will cut its rate to stimulate growth or hold steady. What will Governor Mutebile''s successor decide?',
  '[{"id":"yes","label":"Yes — rate cut"},{"id":"no","label":"No — hold or increase"}]',
  'open', '2026-10-31 20:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"economy","resolution_criteria":"The Bank of Uganda announces a reduction in the Central Bank Rate at its October 2026 MPC meeting. Resolves NO if rates are held or raised."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will USD/UGX cross 4,000 before December 31, 2026?',
  'The Ugandan shilling has been weakening steadily against the dollar — currently around 3,920. Will the exchange rate break the psychological 4,000 barrier before year-end? Ugandan importers and borrowers in USD are watching closely.',
  '[{"id":"yes","label":"Yes — crosses 4,000"},{"id":"no","label":"No — stays below 4,000"}]',
  'open', '2026-12-31 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"economy","resolution_criteria":"The mid-market USD/UGX rate as quoted by Bank of Uganda or a major commercial bank exceeds 4,000 on any single day before December 31, 2026."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Uganda October 2026 headline inflation exceed 4%?',
  'Uganda''s headline inflation has been cooling in 2026. The Uganda Bureau of Statistics releases the October 2026 Consumer Price Index in November. Will price pressures stay contained or tick back above the 4% mark?',
  '[{"id":"yes","label":"Yes — above 4%"},{"id":"no","label":"No — 4% or below"}]',
  'open', '2026-11-20 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"economy","resolution_criteria":"The Uganda Bureau of Statistics official October 2026 headline inflation figure exceeds 4.0%."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Kampala petrol prices exceed UGX 7,000/litre before December 31?',
  'Petrol in Kampala is hovering around UGX 6,400–6,600 per litre. With global oil prices volatile and a weakening shilling, will pump prices break UGX 7,000 before the year is out?',
  '[{"id":"yes","label":"Yes — above UGX 7,000"},{"id":"no","label":"No — stays below 7,000"}]',
  'open', '2026-12-31 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"economy","resolution_criteria":"Any major Kampala petrol station (Total, Shell, Stabex, Gapco) officially lists petrol at UGX 7,000 or above per litre before December 31, 2026, as reported by UBOS or a major news outlet."}'
);

-- ── POLITICS ─────────────────────────────────────────────────────────

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Dr. Kizza Besigye be released from detention before December 31, 2026?',
  'Opposition leader Dr. Kizza Besigye has been in military detention since late 2024. His treason trial has been repeatedly delayed. Will he walk free — through bail, acquittal, or presidential pardon — before the year ends?',
  '[{"id":"yes","label":"Yes — released"},{"id":"no","label":"No — still detained"}]',
  'open', '2026-12-31 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"politics","resolution_criteria":"Dr. Kizza Besigye is physically released from any form of detention (military or civilian) on or before December 31, 2026."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will President Museveni reshuffle the Uganda cabinet before year-end?',
  'President Museveni has a tradition of cabinet reshuffles that often catch Ugandan politics by surprise. With the 2026 elections approaching, will he redeploy ministers before December 31, 2026?',
  '[{"id":"yes","label":"Yes — reshuffle happens"},{"id":"no","label":"No — cabinet unchanged"}]',
  'open', '2026-12-31 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"politics","resolution_criteria":"President Museveni officially announces a cabinet reshuffle (appointing or dismissing at least 3 ministers) between October 7 and December 31, 2026, as confirmed by State House Uganda."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Parliament pass any significant electoral reform bill before December 2026?',
  'With the 2026 general elections on the horizon, pressure is building on Parliament to reform Uganda''s electoral laws. Will legislators pass any bill amending the Presidential Elections Act, Parliamentary Elections Act, or Electoral Commission Act before December 31?',
  '[{"id":"yes","label":"Yes — reform bill passed"},{"id":"no","label":"No — no reform"}]',
  'open', '2026-12-15 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"politics","resolution_criteria":"Uganda Parliament passes any bill amending the Presidential Elections Act, Parliamentary Elections Act, or Electoral Commission Act and it receives presidential assent before December 15, 2026."}'
);

-- ── TECHNOLOGY ───────────────────────────────────────────────────────

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will MTN Uganda officially launch commercial 5G services before December 31, 2026?',
  'MTN Uganda has been piloting 5G in select Kampala areas. With Uganda Communications Commission licensing discussions ongoing, will MTN Uganda make a full commercial 5G launch announcement before the year ends?',
  '[{"id":"yes","label":"Yes — commercial 5G launched"},{"id":"no","label":"No — still pilot/no launch"}]',
  'open', '2026-12-31 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"tech","resolution_criteria":"MTN Uganda issues an official press release or public announcement of a commercial 5G service launch (not a pilot) available to paying subscribers before December 31, 2026."}'
);

-- ── CRYPTO / GLOBAL FINANCE ───────────────────────────────────────────

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Bitcoin (BTC) reach $100,000 before December 31, 2026?',
  'Bitcoin is currently trading around $83,600. The post-halving cycle historically sees new all-time highs within 12–18 months. With institutional adoption growing, will BTC touch the historic $100K level before the year closes?',
  '[{"id":"yes","label":"Yes — BTC hits $100K"},{"id":"no","label":"No — stays below $100K"}]',
  'open', '2026-12-31 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"economy","resolution_criteria":"The Bitcoin/USD spot price on Binance, Coinbase, or CoinGecko reaches $100,000 or higher at any point before December 31, 2026 23:59 UTC."}'
);

-- ── ENTERTAINMENT ─────────────────────────────────────────────────────

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Eddy Kenzo release a new album or EP before December 31, 2026?',
  'Eddy Kenzo, Uganda''s biggest Afrobeat export, has been teasing new music for months. Will the "Big Talent" boss drop a full album or EP before the year ends — and keep his name at the top of Ugandan music?',
  '[{"id":"yes","label":"Yes — album or EP released"},{"id":"no","label":"No — no release"}]',
  'open', '2026-12-31 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"entertainment","resolution_criteria":"Eddy Kenzo officially releases a full album (8+ tracks) or EP (4+ tracks) on any major streaming platform (Spotify, Apple Music, Boomplay, YouTube Music) before December 31, 2026."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will the Nyege Nyege 2026 December festival sell out all ticket tiers?',
  'Nyege Nyege is East Africa''s biggest electronic music festival, held in Jinja every December. With international acts confirmed and the festival growing in global profile, will all ticket categories sell out before the gates open?',
  '[{"id":"yes","label":"Yes — full sellout"},{"id":"no","label":"No — tickets still available at the gate"}]',
  'open', '2026-12-05 20:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"entertainment","resolution_criteria":"Nyege Nyege official channels announce that all ticket tiers (early bird, regular, VIP) are sold out before the festival opens in December 2026."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Azawi win Artist of the Year at Pearl of Africa Music Awards 2026?',
  'Azawi has been on a hot streak — multiple hit songs, sold-out concerts, and a growing international profile. The Pearl of Africa Music Awards (PAM Awards) are expected late 2026. Will she take home the top prize?',
  '[{"id":"yes","label":"Yes — Azawi wins"},{"id":"no","label":"No — another artist wins"}]',
  'open', '2026-12-20 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"entertainment","resolution_criteria":"Azawi is announced as the Artist of the Year winner at the 2026 Pearl of Africa Music Awards ceremony."}'
);

-- ── INFRASTRUCTURE ────────────────────────────────────────────────────

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will EACOP announce a firm construction restart date before December 31, 2026?',
  'The East Africa Crude Oil Pipeline (EACOP) has faced delays from financing and regulatory hurdles. TotalEnergies and Uganda government officials have been in talks to revive the timeline. Will a confirmed restart date be publicly announced before year-end?',
  '[{"id":"yes","label":"Yes — firm date announced"},{"id":"no","label":"No — no official date"}]',
  'open', '2026-12-31 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"infrastructure","resolution_criteria":"TotalEnergies, CNOOC, or Uganda Government issues an official press release or statement confirming a specific restart or commissioning date for EACOP construction before December 31, 2026."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will the Kampala–Jinja Expressway reach 50% construction completion before December 2026?',
  'The Kampala–Jinja Expressway is Uganda''s flagship road infrastructure project. UNRA has been reporting progress. Will the project officially hit the 50% completion milestone before the end of 2026?',
  '[{"id":"yes","label":"Yes — 50%+ complete"},{"id":"no","label":"No — below 50%"}]',
  'open', '2026-12-31 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"infrastructure","resolution_criteria":"Uganda National Roads Authority (UNRA) officially reports or confirms that the Kampala–Jinja Expressway has reached 50% or more physical completion before December 31, 2026."}'
);

-- ── SPORTS (NON-FOOTBALL) ─────────────────────────────────────────────

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Uganda win the 2026 CECAFA Senior Challenge Cup?',
  'The CECAFA Senior Challenge Cup brings together East and Central African nations in December. Uganda has won it before and always fields a strong squad. Will the Cranes lift the regional trophy at the 2026 edition?',
  '[{"id":"yes","label":"Yes — Uganda wins CECAFA"},{"id":"no","label":"No — another team wins"}]',
  'open', '2026-12-22 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"Uganda Cranes are announced as the winners of the 2026 CECAFA Senior Challenge Cup."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will a Ugandan athlete set a national record at a major athletics meet in Q4 2026?',
  'Uganda has produced world-class runners — Joshua Cheptegei, Jacob Kiplimo, Peruth Chemutai. With the Diamond League finals and other major meets in Q4, will any Ugandan athlete break a national record between October and December 2026?',
  '[{"id":"yes","label":"Yes — national record broken"},{"id":"no","label":"No — no national record"}]',
  'open', '2026-12-31 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"World Athletics or Uganda Athletics Federation officially confirms a new Uganda national record in any track or field event set between October 1 and December 31, 2026."}'
);
