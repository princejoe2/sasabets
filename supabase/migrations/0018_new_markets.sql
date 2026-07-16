-- Clear all existing markets (and dependent data) before inserting the researched batch
TRUNCATE public.market_comments, public.bets, public.pool_depth_snapshots, public.market_events, public.market_flags CASCADE;
DELETE FROM public.transactions WHERE type IN ('bet','payout','rake','cashout');
DELETE FROM public.markets;

-- Reset wallet balances affected by bets (all bets are gone, keep deposits)
-- (wallets already have balance from deposits; bets were wiped so nothing to reverse)

-- ═══════════════════════════════════════════════════════════════════
-- 2026 RESEARCHED MARKET BATCH  (closes within 60 days of 2026-07-16)
-- All closes_at in EAT (UTC+3). Admin user = 872fa080-c08c-490c-aa89-dfba258be987
-- ═══════════════════════════════════════════════════════════════════

-- ── FOOTBALL: WORLD CUP ──────────────────────────────────────────

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  '2026 FIFA World Cup Final: Argentina or Spain?',
  'The 2026 World Cup Final is set for July 19 at MetLife Stadium, New Jersey. Argentina beat England 2–1 in the semis; Spain beat France 2–0. Both nations are multiple-time champions. Who lifts the golden trophy?',
  '[{"id":"argentina","label":"Argentina"},{"id":"spain","label":"Spain"}]',
  'open', '2026-07-19 20:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"The team that wins the 2026 FIFA World Cup Final on July 19 at MetLife Stadium — including extra time and penalties if needed."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'World Cup 2026 Third Place: France or England?',
  'France and England both lost in the semifinals and meet in the bronze-medal playoff on July 18. Which nation finishes third at the 2026 World Cup? Big pride on the line for both sets of supporters.',
  '[{"id":"france","label":"France"},{"id":"england","label":"England"}]',
  'open', '2026-07-18 20:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"The team that wins the World Cup 2026 third-place playoff on July 18 (including extra time and penalties)."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will the World Cup Final produce over 2.5 goals?',
  'The semis were entertaining — Argentina 2–1 England, Spain 2–0 France. Does the final go higher? Will there be 3 or more total goals scored in the 2026 World Cup Final (90 mins + extra time, penalties excluded)?',
  '[{"id":"yes","label":"Yes — 3 or more goals"},{"id":"no","label":"No — 2 or fewer goals"}]',
  'open', '2026-07-19 20:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"Total goals scored in 90 minutes plus extra time (if played). Penalty shootout goals do not count. YES = 3 or more goals; NO = 0, 1 or 2 goals."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'World Cup Final decided in 90 minutes — no extra time?',
  'Will the 2026 World Cup Final have a winner after the regulation 90 minutes, avoiding extra time entirely? Or will it be level at full time and go to extra time?',
  '[{"id":"yes","label":"Yes — decided in 90 mins"},{"id":"no","label":"No — goes to extra time"}]',
  'open', '2026-07-19 20:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"YES if one team leads at the final whistle after 90 minutes and no extra time is played. NO if the scores are level at 90 mins and extra time begins."}'
);

-- ── FOOTBALL: UGANDAN & EAST AFRICAN ────────────────────────────

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Vipers SC win the 2026 FUFA Super 8?',
  'FUFA Super 8 runs August 1–16 featuring the top 8 finishers from the 2025/26 Uganda Premier League. Vipers SC are reigning UPL champions. Can they also clinch the Super 8 title? BUL FC are the defending Super 8 holders.',
  '[{"id":"yes","label":"Yes — Vipers win the Super 8"},{"id":"no","label":"No — another club wins"}]',
  'open', '2026-08-01 08:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"YES if Vipers SC are crowned 2026 FUFA Super 8 champions when the tournament concludes on August 16. NO if any other club wins."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  '2026 Uganda Super Cup: Vipers SC or Kitara FC?',
  'The Uganda Super Cup pits league champions Vipers SC against Uganda Cup winners Kitara FC, scheduled for around August 22. A one-off showdown for early-season bragging rights. Which club wins?',
  '[{"id":"vipers","label":"Vipers SC"},{"id":"kitara","label":"Kitara FC"}]',
  'open', '2026-08-22 08:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"The club that wins the 2026 Uganda Super Cup match (including extra time and penalties if needed). Market void if the match is postponed beyond September 14."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will the 2026/27 Uganda Premier League kick off on August 28 as planned?',
  'FUFA has confirmed August 28 as the start date for the new 18-club 2026/27 StarTimes Uganda Premier League season — an earlier kickoff than previous years. Will the first match actually be played on August 28?',
  '[{"id":"yes","label":"Yes — kicks off August 28"},{"id":"no","label":"No — delayed or moved"}]',
  'open', '2026-08-27 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"YES if at least one 2026/27 Uganda Premier League match is played on August 28, 2026. NO if the season start is delayed to any date after August 28."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Vipers SC win, draw, or lose their first 2026/27 UPL match?',
  'Fixtures for the 2026/27 Uganda Premier League are released July 28. Vipers SC are defending champions. How will they start the new season in their very first league match on opening weekend (August 28–30)?',
  '[{"id":"win","label":"Vipers Win"},{"id":"draw","label":"Draw"},{"id":"loss","label":"Vipers Lose"}]',
  'open', '2026-08-28 08:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"Result of Vipers SC''s first 2026/27 Uganda Premier League match after 90 minutes. Market void if fixtures change and Vipers do not play on the opening weekend."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Vipers SC advance past the CAF Champions League preliminary round?',
  'Vipers SC will represent Uganda in the 2026/27 CAF Champions League. The first preliminary round first legs are September 4–6 and the return legs September 11–13. Will Vipers advance on aggregate?',
  '[{"id":"yes","label":"Yes — Vipers advance"},{"id":"no","label":"No — Vipers are eliminated"}]',
  'open', '2026-09-04 08:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"YES if Vipers SC progress to the next round of the 2026/27 CAF Champions League after both legs of the first preliminary round. Market void if Vipers receive a bye."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Kitara FC advance past the CAF Confederation Cup preliminary round?',
  'Uganda Cup winners Kitara FC enter the 2026/27 CAF Confederation Cup at the preliminary round stage. First legs September 4–6; return legs September 11–13. Can Kitara make it through to the next stage?',
  '[{"id":"yes","label":"Yes — Kitara advance"},{"id":"no","label":"No — Kitara are eliminated"}]',
  'open', '2026-09-04 08:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"YES if Kitara FC progress to the next round of the 2026/27 CAF Confederation Cup after both legs of the first preliminary round. Market void if Kitara receive a bye."}'
);

-- ── SPORTS: SHE CRANES / COMMONWEALTH ───────────────────────────

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will the She Cranes reach the semifinals at the Commonwealth Netball Championship?',
  'Uganda''s She Cranes (ranked world #6) compete at the Commonwealth Netball Championship in Glasgow, running July 25 – August 2. They are in Pool B with New Zealand, Jamaica, Wales, Scotland and Trinidad & Tobago. Will they qualify for the last four?',
  '[{"id":"yes","label":"Yes — She Cranes reach semis"},{"id":"no","label":"No — knocked out in pools"}]',
  'open', '2026-07-31 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"YES if Uganda qualify for the semifinal stage of the 2026 Commonwealth Netball Championship in Glasgow. NO if they are eliminated in the pool stage or classification rounds."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'She Cranes vs Scotland: Will Uganda win their Commonwealth Netball pool match?',
  'Uganda''s She Cranes face hosts Scotland in Pool B at the Commonwealth Netball Championship in Glasgow (July 25 – Aug 2). Scotland will have home crowd advantage. Can the She Cranes overcome that pressure and take the win?',
  '[{"id":"yes","label":"Yes — Uganda win"},{"id":"no","label":"No — Scotland win or draw"}]',
  'open', '2026-07-29 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"YES if Uganda She Cranes beat Scotland in their pool match at the 2026 Commonwealth Netball Championship. NO if Scotland win or the match is tied. Market void if the match is cancelled."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Uganda win at least one medal at the Glasgow 2026 Commonwealth Games?',
  'Uganda won 5 medals (1 gold, 2 silver, 2 bronze) at Birmingham 2022. The Glasgow 2026 Commonwealth Games run through August 2. Athletics and boxing — Uganda''s strongest events — are on the programme. Will Uganda medal again?',
  '[{"id":"yes","label":"Yes — Uganda win a medal"},{"id":"no","label":"No — Uganda go home empty-handed"}]',
  'open', '2026-08-02 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"football","resolution_criteria":"YES if Uganda appear in the official Glasgow 2026 Commonwealth Games medal table with at least one medal of any colour by the closing ceremony on August 2."}'
);

-- ── ECONOMY ──────────────────────────────────────────────────────

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Uganda headline inflation for July 2026 exceed 4.0%?',
  'Uganda''s annual headline inflation reached 3.7% in June 2026 (up from 3.2% in May), driven by rising fuel and transport costs. UBOS releases the July CPI around July 31. Will inflation break above the 4% mark?',
  '[{"id":"yes","label":"Yes — above 4.0%"},{"id":"no","label":"No — 4.0% or below"}]',
  'open', '2026-07-30 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"economy","resolution_criteria":"YES if the Uganda Bureau of Statistics (UBOS) July 2026 Consumer Price Index release shows annual headline inflation strictly above 4.0%. NO if it is 4.0% or lower."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will August 2026 Uganda inflation be higher than July''s figure?',
  'Inflation has been rising month-on-month: 3.2% in May, 3.7% in June. If the trend continues, August (released ~August 29) would top July''s number. Will the upward trend hold?',
  '[{"id":"yes","label":"Yes — August higher than July"},{"id":"no","label":"No — same or lower"}]',
  'open', '2026-08-28 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"economy","resolution_criteria":"YES if the UBOS August 2026 CPI release shows a higher annual headline inflation rate than the July 2026 figure. Resolves when UBOS publishes the August CPI (expected ~August 29–31)."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will USD/UGX be above 3,750 on August 31, 2026?',
  'The Uganda shilling is trading around UGX 3,694–3,706 per US Dollar (July 14–15), down 3.3% year-on-year. Will the shilling weaken further to breach 3,750 by the end of August? Watch the Bank of Uganda official mid-rate.',
  '[{"id":"yes","label":"Yes — above UGX 3,750/USD"},{"id":"no","label":"No — UGX 3,750 or stronger"}]',
  'open', '2026-08-31 12:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"economy","resolution_criteria":"YES if the Bank of Uganda official USD/UGX mid-rate on August 31, 2026 is strictly above 3,750 (i.e. the shilling is weaker). NO if the rate is 3,750 or below. Resolves using the BoU daily rate published for August 31."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will MTN Uganda H1 2026 service revenue grow by at least 8% year-on-year?',
  'MTN Uganda Q1 2026 service revenue grew 7.7% year-on-year to UGX 905.9 billion. Full H1 2026 results are due August 6. Will the first half maintain or accelerate that momentum to hit 8%+ growth?',
  '[{"id":"yes","label":"Yes — 8% or more growth"},{"id":"no","label":"No — below 8%"}]',
  'open', '2026-08-05 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"economy","resolution_criteria":"YES if MTN Uganda''s H1 2026 results (published August 6) show service revenue year-on-year growth of 8.0% or more. NO if growth is below 8.0%. Resolves on the official earnings release."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Kampala petrol prices exceed UGX 6,500/litre by September 1?',
  'Kampala pump prices hit a peak of UGX 6,499/litre in mid-June 2026, with petrol inflation running at +26.3% year-on-year. Will petrol prices break above UGX 6,500 per litre by September 1?',
  '[{"id":"yes","label":"Yes — above UGX 6,500/litre"},{"id":"no","label":"No — UGX 6,500 or below"}]',
  'open', '2026-09-01 12:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"economy","resolution_criteria":"YES if the average retail petrol price in Kampala, as reported by a major outlet (Daily Monitor fuel snapshot or GlobalPetrolPrices.com), is strictly above UGX 6,500/litre on or before September 1, 2026."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will the Bank of Uganda hold its Central Bank Rate in August 2026?',
  'The Bank of Uganda Monetary Policy Committee meets every two months. With inflation rising and the shilling under pressure, will the MPC leave the Central Bank Rate unchanged at its August 2026 meeting, or will they cut or raise?',
  '[{"id":"hold","label":"Yes — rate held unchanged"},{"id":"change","label":"No — rate cut or raised"}]',
  'open', '2026-08-15 23:59:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"economy","resolution_criteria":"YES if the Bank of Uganda Monetary Policy Statement released in August 2026 shows the Central Bank Rate is held at its current level. NO if the rate is changed (either cut or raised). Resolves on the BoU MPC statement."}'
);

-- ── INFRASTRUCTURE / OIL ─────────────────────────────────────────

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will EACOP officially announce pipeline commissioning before September 14?',
  'The East Africa Crude Oil Pipeline (EACOP) is ~79–84% complete as of July 2026, with officials targeting July 2026 for commissioning and first exports by October. Will a formal commissioning announcement be made before September 14?',
  '[{"id":"yes","label":"Yes — commissioning announced"},{"id":"no","label":"No — still not announced"}]',
  'open', '2026-09-14 12:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"infrastructure","resolution_criteria":"YES if the EACOP consortium, UNOC, or the Government of Uganda officially announces the start of pipeline commissioning before September 14, 2026. NO if no such announcement is made by that date."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Uganda officially announce first crude oil production before September 14?',
  'The Tilenga (67% complete) and Kingfisher (77% complete) upstream oil projects are racing toward first oil. Officials have named 2026 as the year. Will either project announce actual first oil produced before September 14?',
  '[{"id":"yes","label":"Yes — first oil announced"},{"id":"no","label":"No — not yet"}]',
  'open', '2026-09-14 12:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"infrastructure","resolution_criteria":"YES if the Government of Uganda, TotalEnergies, or CNOOC officially announces first crude oil production from Tilenga or Kingfisher before September 14, 2026. NO if no such announcement is made."}'
);

-- ── POLITICS ─────────────────────────────────────────────────────

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Dr. Kizza Besigye be granted bail before September 14?',
  'Opposition leader Dr. Kizza Besigye has been detained since late 2024. His treason trial formally opened on July 13, 2026 after a constitutional reference was dismissed. He has refused state-appointed lawyers. Will a court grant him bail before September 14?',
  '[{"id":"yes","label":"Yes — bail granted"},{"id":"no","label":"No — remains in custody"}]',
  'open', '2026-09-14 12:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"politics","resolution_criteria":"YES if a Ugandan court grants Dr. Kizza Besigye bail at any point before September 14, 2026, as reported by credible Ugandan media (Daily Monitor, New Vision). NO if he remains in custody on September 14."}'
);

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will the Besigye treason trial hear prosecution witnesses before August 31?',
  'The Besigye treason trial opened July 13, 2026 but Besigye has refused state-appointed legal counsel, potentially causing delays. Will the court move to actual prosecution witness testimony (not just procedural hearings) before the end of August?',
  '[{"id":"yes","label":"Yes — witnesses heard by Aug 31"},{"id":"no","label":"No — still procedural"}]',
  'open', '2026-08-31 12:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"politics","resolution_criteria":"YES if the High Court in the Besigye treason case records prosecution witness testimony (not just procedural motions or adjournments) before August 31, 2026, per official court records or credible media."}'
);

-- ── ENTERTAINMENT ────────────────────────────────────────────────

INSERT INTO public.markets (title, description, options, status, closes_at, created_by, total_pool, rake_pct, verification_type, verification_config, metadata)
VALUES (
  'Will Irene Namatovu''s "Strong Woman" concert happen on August 21 as planned?',
  'Veteran Ugandan gospel singer Irene Namatovu has announced her "Strong Woman" concert at Kampala Serena Hotel on August 21, 2026 — complete with imported anti-forgery tickets. Will the concert take place on that date as promoted?',
  '[{"id":"yes","label":"Yes — concert happens August 21"},{"id":"no","label":"No — postponed or cancelled"}]',
  'open', '2026-08-21 12:00:00+03',
  '872fa080-c08c-490c-aa89-dfba258be987', 0, 0.08, 'manual', '{}',
  '{"category":"entertainment","resolution_criteria":"YES if Irene Namatovu''s Strong Woman concert is held at Kampala Serena Hotel on August 21, 2026. NO if it is postponed to a different date or cancelled entirely."}'
);
