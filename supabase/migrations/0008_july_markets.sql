-- July 2026 market batch: Sports, Ebola, Politics, Economy, Weather, Entertainment
-- All times in EAT (UTC+3). Today = 2026-06-28.

INSERT INTO public.markets (title, description, options, status, closes_at, metadata)
VALUES

-- ===================== SPORTS & FOOTBALL =====================

(
  'Will KCCA FC win their next Uganda Premier League match in early July?',
  'KCCA FC are one of Uganda''s biggest clubs. Will they take all three points in their next scheduled Uganda Premier League fixture in early July 2026?',
  '[{"id":"yes","label":"Yes — KCCA win"},{"id":"no","label":"No — draw or loss"}]'::jsonb,
  'open',
  '2026-07-07 23:59:00+03',
  '{"category":"football"}'::jsonb
),

(
  'Will there be a red card in the next Mashemeji Derby (Villa vs Express)?',
  'The Mashemeji Derby between SC Villa and Express FC is notorious for drama. Will a player be sent off in their next league or cup clash?',
  '[{"id":"yes","label":"Yes — red card issued"},{"id":"no","label":"No — no red card"}]'::jsonb,
  'open',
  '2026-07-13 23:59:00+03',
  '{"category":"football"}'::jsonb
),

(
  'Will Uganda Cranes score 2+ goals in their next international match?',
  'Uganda Cranes face an upcoming friendly or qualifier window match. Will they find the net at least twice in the full 90 minutes?',
  '[{"id":"yes","label":"Yes — 2 or more goals"},{"id":"no","label":"No — 0 or 1 goal"}]'::jsonb,
  'open',
  '2026-07-15 23:59:00+03',
  '{"category":"football"}'::jsonb
),

(
  'Will Vipers SC top the Uganda Premier League table after the next matchday?',
  'The UPL title race is tight. Will Vipers SC sit at the top of the table when early-July matchday results are confirmed?',
  '[{"id":"yes","label":"Yes — Vipers top"},{"id":"no","label":"No — another club leads"}]'::jsonb,
  'open',
  '2026-07-07 23:59:00+03',
  '{"category":"football"}'::jsonb
),

(
  'Will there be fan violence or a pitch invasion in the next major East African derby?',
  'Passionate East African derbies sometimes boil over. Will any major Ugandan or Kenyan league derby in early July be marred by fan disorder or a pitch invasion reported by official sources?',
  '[{"id":"yes","label":"Yes — incident reported"},{"id":"no","label":"No — peaceful match"}]'::jsonb,
  'open',
  '2026-07-13 23:59:00+03',
  '{"category":"football"}'::jsonb
),

(
  'Will a Ugandan university team medal at the next East Africa University Games event?',
  'Makerere and other Ugandan universities regularly compete in East African university sports. Will any Ugandan institution win a medal at the next scheduled qualifier or regional event before end of July?',
  '[{"id":"yes","label":"Yes — medal won"},{"id":"no","label":"No — no medal"}]'::jsonb,
  'open',
  '2026-07-31 23:59:00+03',
  '{"category":"football"}'::jsonb
),

-- ===================== EBOLA & PUBLIC HEALTH =====================

(
  'Will Uganda report 5+ new confirmed Ebola (Bundibugyo) cases in the next 7 days?',
  'Uganda''s Ministry of Health is actively tracking the current Ebola alert. Will official MoH communications confirm 5 or more new laboratory-confirmed cases between 29 June and 5 July 2026?',
  '[{"id":"yes","label":"Yes — 5 or more new cases"},{"id":"no","label":"No — fewer than 5"}]'::jsonb,
  'open',
  '2026-07-05 23:59:00+03',
  '{"category":"default"}'::jsonb
),

(
  'Will Uganda record zero new Ebola transmissions for 7 consecutive days by mid-July?',
  'A key WHO milestone is 42 days without transmission. Will MoH announce at least one unbroken 7-day window of zero new confirmed Ebola cases before 15 July 2026?',
  '[{"id":"yes","label":"Yes — 7 clean days confirmed"},{"id":"no","label":"No — new cases within window"}]'::jsonb,
  'open',
  '2026-07-15 23:59:00+03',
  '{"category":"default"}'::jsonb
),

(
  'Will Uganda announce new Ebola containment measures (e.g. school closures, border checks) in the next 10 days?',
  'Government responses to Ebola outbreaks often include restrictions. Will the Ugandan government officially announce any new containment measures — school closures, border screening upgrades, or movement restrictions — before 8 July 2026?',
  '[{"id":"yes","label":"Yes — new measures announced"},{"id":"no","label":"No — no new restrictions"}]'::jsonb,
  'open',
  '2026-07-08 23:59:00+03',
  '{"category":"default"}'::jsonb
),

-- ===================== POLITICS & GOVERNANCE =====================

(
  'Will there be a major NUP opposition protest or arrest in Uganda in the next 2 weeks?',
  'Post-2026 election tensions remain elevated. Will a credible news outlet report a significant NUP-led protest event or a senior opposition figure arrest in Uganda before 12 July 2026?',
  '[{"id":"yes","label":"Yes — protest or arrest reported"},{"id":"no","label":"No — no major incident"}]'::jsonb,
  'open',
  '2026-07-12 23:59:00+03',
  '{"category":"politics"}'::jsonb
),

(
  'Will Uganda''s 2026 oil production start date be officially reaffirmed in July?',
  'The government has projected first oil tied to 10%+ GDP growth. Will a senior official or UNOC/TotalEnergies statement in July 2026 reconfirm a 2026 commercial production start date?',
  '[{"id":"yes","label":"Yes — 2026 date reaffirmed"},{"id":"no","label":"No — delayed or no statement"}]'::jsonb,
  'open',
  '2026-07-31 23:59:00+03',
  '{"category":"politics"}'::jsonb
),

(
  'Will the next major East African budget revision include new taxes or oil revenue allocations?',
  'Kenya and Uganda have both tabled controversial budgets. Will any formal supplementary budget or finance statement from a major EAC country in July 2026 introduce new tax measures or ring-fence oil revenues?',
  '[{"id":"yes","label":"Yes — new taxes or oil allocation"},{"id":"no","label":"No — no such measure"}]'::jsonb,
  'open',
  '2026-07-31 23:59:00+03',
  '{"category":"economy"}'::jsonb
),

-- ===================== ECONOMY & DAILY LIFE =====================

(
  'Will the Uganda Shilling strengthen against the USD in the next 14 days?',
  'The UGX/USD rate is influenced by oil news, budget moves, and regional sentiment. Will the mid-market UGX/USD rate be lower (stronger shilling) on 12 July 2026 than it was on 28 June 2026?',
  '[{"id":"yes","label":"Yes — shilling strengthens"},{"id":"no","label":"No — weakens or flat"}]'::jsonb,
  'open',
  '2026-07-12 23:59:00+03',
  '{"category":"economy"}'::jsonb
),

(
  'Will pump fuel prices drop in Uganda or Kenya in July 2026?',
  'Regional oil prices and government levies drive fuel costs. Will UNBS (Uganda) or EPRA (Kenya) officially announce or confirm a reduction in petrol/diesel pump prices during July 2026?',
  '[{"id":"yes","label":"Yes — prices drop"},{"id":"no","label":"No — same or higher"}]'::jsonb,
  'open',
  '2026-07-31 23:59:00+03',
  '{"category":"economy"}'::jsonb
),

-- ===================== WEATHER & ENVIRONMENT =====================

(
  'Will Kampala experience above-average rainfall in the first half of July 2026?',
  'East Africa is in a warm, drier-than-normal phase. Will official UNMA (Uganda National Meteorological Authority) data or a credible weather service confirm above-average cumulative rainfall in Kampala for 1–15 July 2026?',
  '[{"id":"yes","label":"Yes — above average"},{"id":"no","label":"No — normal or below"}]'::jsonb,
  'open',
  '2026-07-16 23:59:00+03',
  '{"category":"agriculture"}'::jsonb
),

(
  'Will western Uganda record above-seasonal temperatures in early July 2026?',
  'Warmer-than-usual conditions have been flagged for the region. Will a credible meteorological report confirm that western Uganda districts (e.g. Mbarara, Fort Portal) recorded above-seasonal average temperatures in the first 10 days of July 2026?',
  '[{"id":"yes","label":"Yes — above seasonal"},{"id":"no","label":"No — normal or cooler"}]'::jsonb,
  'open',
  '2026-07-12 23:59:00+03',
  '{"category":"agriculture"}'::jsonb
),

-- ===================== ENTERTAINMENT, CULTURE & EVENTS =====================

(
  'Will a major Kampala or Nairobi music/festival event sell out or be cancelled in the next 2 weeks?',
  'East Africa''s live entertainment scene is buzzing. Will any headline music festival, comedy show, or major cultural event in Kampala or Nairobi either sell out completely or announce cancellation before 12 July 2026?',
  '[{"id":"yes","label":"Yes — sold out or cancelled"},{"id":"no","label":"No — normal run"}]'::jsonb,
  'open',
  '2026-07-12 23:59:00+03',
  '{"category":"entertainment"}'::jsonb
),

(
  'Will a Ugandan or Kenyan celebrity scandal go viral and be resolved by mid-July?',
  'Social media drama in Uganda and Kenya moves fast. Will a celebrity or public figure controversy originating on X/TikTok/Instagram trend nationally and reach a clear resolution (apology, clarification, or court outcome) before 15 July 2026?',
  '[{"id":"yes","label":"Yes — viral and resolved"},{"id":"no","label":"No — ongoing or didn''t trend"}]'::jsonb,
  'open',
  '2026-07-15 23:59:00+03',
  '{"category":"entertainment"}'::jsonb
),

(
  'Will a Chinese-funded or major infrastructure project in Uganda/Kenya hit a public milestone in July?',
  'Large infrastructure deals (roads, airports, railways) regularly generate announcements. Will any Chinese-funded or regionally significant infrastructure project in Uganda or Kenya announce a groundbreaking, completion phase, or formal handover in July 2026?',
  '[{"id":"yes","label":"Yes — milestone announced"},{"id":"no","label":"No — no announcement"}]'::jsonb,
  'open',
  '2026-07-31 23:59:00+03',
  '{"category":"infrastructure"}'::jsonb
),

(
  'Will the EAC digital/single market initiative see a positive update in July 2026?',
  'The East African Community is pushing digital integration and a single market. Will an EAC secretariat statement, summit communiqué, or official press release confirm a concrete positive development (e.g. policy adoption, forum outcome) for digital trade or the single market in July 2026?',
  '[{"id":"yes","label":"Yes — positive update confirmed"},{"id":"no","label":"No — no notable development"}]'::jsonb,
  'open',
  '2026-07-31 23:59:00+03',
  '{"category":"economy"}'::jsonb
)

ON CONFLICT DO NOTHING;
