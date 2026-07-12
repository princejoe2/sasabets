// Run: node --env-file=.env.local scripts/seed-markets.mjs
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://jsigphyrhgmpaydozjfa.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY not set'); process.exit(1) }

const ADMIN_ID = '872fa080-c08c-490c-aa89-dfba258be987'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const yn = () => [
  { id: randomUUID(), label: 'YES', total_pool: 0 },
  { id: randomUUID(), label: 'NO', total_pool: 0 },
]

const mk = (title, description, options, category, closes_at, extra = {}) => ({
  title, description, options,
  status: 'open', total_pool: 0, rake_pct: 0.10,
  closes_at, created_by: ADMIN_ID,
  metadata: { category, ...extra },
})

const markets = [
  // ─── WORLD CUP 2026 (Final: July 19, Semi-finals: July 14-15) ───
  mk(
    'Will Brazil win the 2026 FIFA World Cup?',
    "Brazil are one of the tournament favorites heading into the semi-finals. Will the Seleção claim a record 6th World Cup title?",
    yn(), 'football', '2026-07-19T22:00:00Z'
  ),
  mk(
    'Will Argentina defend their World Cup title in 2026?',
    "Argentina won the 2022 World Cup in Qatar. Can La Albiceleste make history with back-to-back titles?",
    yn(), 'football', '2026-07-19T22:00:00Z'
  ),
  mk(
    'Will France win the 2026 FIFA World Cup?',
    "France with Kylian Mbappé are among the top contenders. Will Les Bleus claim their third World Cup crown?",
    yn(), 'football', '2026-07-19T22:00:00Z'
  ),
  mk(
    'Will England win the 2026 FIFA World Cup?',
    "England have been building towards this moment for decades. Will football finally come home at World Cup 2026?",
    yn(), 'football', '2026-07-19T22:00:00Z'
  ),
  mk(
    'Will a South American team win the 2026 FIFA World Cup?',
    "South America has dominated recent World Cups. Will Brazil, Argentina, or another CONMEBOL side take the trophy in North America?",
    yn(), 'football', '2026-07-19T22:00:00Z'
  ),
  mk(
    'Will a European team win the 2026 FIFA World Cup?',
    "Europe has won the last two World Cups (France 2018, Germany 2014). Will UEFA reclaim glory in North America?",
    yn(), 'football', '2026-07-19T22:00:00Z'
  ),
  mk(
    'Will Kylian Mbappé win the Golden Boot at World Cup 2026?',
    "Mbappé has been one of the top scorers in the 2026 tournament. Will the Real Madrid star finish as the leading scorer?",
    yn(), 'football', '2026-07-19T22:00:00Z'
  ),
  mk(
    'Will the 2026 World Cup Final end in a penalty shootout?',
    "Penalty drama at the biggest stage. Will the World Cup Final be decided from the spot?",
    yn(), 'football', '2026-07-19T22:00:00Z'
  ),
  mk(
    'Will the 2026 World Cup Final have 3 or more goals?',
    "Goals galore or a tight tactical battle? Predict whether the final produces 3+ goals in normal time.",
    [
      { id: randomUUID(), label: 'YES – 3 or more goals', total_pool: 0 },
      { id: randomUUID(), label: 'NO – 2 or fewer goals', total_pool: 0 },
    ],
    'football', '2026-07-19T22:00:00Z'
  ),
  mk(
    'Will an African team reach the 2026 World Cup Final?',
    "Africa has never reached a World Cup Final. Could Morocco, Senegal, or another CAF side make history in 2026?",
    yn(), 'football', '2026-07-16T00:00:00Z'
  ),
  mk(
    'Will Spain reach the 2026 World Cup Final?',
    "Spain, the defending Euro 2024 champions, are in contention. Will La Roja make it all the way to the final?",
    yn(), 'football', '2026-07-16T00:00:00Z'
  ),
  mk(
    'Will Vinicius Jr. score in the 2026 World Cup Final?',
    "Brazil's Vinicius Jr. has been electric in this tournament. Will the Real Madrid star find the net in the final?",
    yn(), 'football', '2026-07-19T22:00:00Z'
  ),
  mk(
    'Will the 2026 World Cup produce a record total attendance?',
    "With 48 teams and matches across USA, Canada, and Mexico, will 2026 break the all-time World Cup attendance record?",
    yn(), 'football', '2026-07-19T22:00:00Z'
  ),
  mk(
    'Who wins the 2026 World Cup semi-final: Brazil or France?',
    "Two of the biggest footballing nations clash in the semi-final. Will Vinicius or Mbappé lead their side to the final?",
    [
      { id: randomUUID(), label: 'Brazil', total_pool: 0 },
      { id: randomUUID(), label: 'France', total_pool: 0 },
    ],
    'football', '2026-07-15T22:00:00Z',
    {
      team1: 'Brazil', team2: 'France',
      team1Image: 'https://flagcdn.com/w80/br.png',
      team2Image: 'https://flagcdn.com/w80/fr.png',
    }
  ),
  mk(
    'Who wins the 2026 World Cup semi-final: Argentina or England?',
    "South America vs Europe in a blockbuster semi-final. Who advances to the 2026 World Cup Final?",
    [
      { id: randomUUID(), label: 'Argentina', total_pool: 0 },
      { id: randomUUID(), label: 'England', total_pool: 0 },
    ],
    'football', '2026-07-14T22:00:00Z',
    {
      team1: 'Argentina', team2: 'England',
      team1Image: 'https://flagcdn.com/w80/ar.png',
      team2Image: 'https://flagcdn.com/w80/gb-eng.png',
    }
  ),

  // ─── UGANDA / EAST AFRICA ───
  mk(
    'Will Uganda Cranes qualify for AFCON 2027?',
    "Uganda is in AFCON 2027 qualifying. AFCON 2027 is co-hosted by Uganda, Kenya, and Tanzania. Will the Cranes secure a place at the tournament on home soil?",
    yn(), 'football', '2026-11-30T00:00:00Z'
  ),
  mk(
    'Will Uganda beat Tanzania in AFCON 2027 qualifying?',
    "Uganda and Tanzania are rivals in the AFCON 2027 qualifying group. With the tournament on home soil, will the Cranes beat the Taifa Stars?",
    [
      { id: randomUUID(), label: 'Uganda Cranes Win', total_pool: 0 },
      { id: randomUUID(), label: 'Tanzania Win or Draw', total_pool: 0 },
    ],
    'football', '2026-09-30T00:00:00Z',
    {
      team1: 'Uganda', team2: 'Tanzania',
      team1Image: 'https://flagcdn.com/w80/ug.png',
      team2Image: 'https://flagcdn.com/w80/tz.png',
    }
  ),
  mk(
    'Will Uganda Cranes reach the AFCON 2027 quarter-finals?',
    "AFCON 2027 is co-hosted by Uganda, Kenya, and Tanzania. With home advantage, can the Cranes make it past the group stage and into the knockouts?",
    yn(), 'football', '2027-03-31T00:00:00Z'
  ),
  mk(
    'Will Uganda win the CECAFA Senior Challenge Cup in 2026?',
    "The CECAFA Cup is the premier regional football tournament in East and Central Africa. Will Uganda Cranes lift the title in 2026?",
    yn(), 'football', '2026-12-31T00:00:00Z'
  ),
  mk(
    "Will Uganda's GDP growth rate exceed 6% in FY 2026/27?",
    "The World Bank projects Uganda's economy to grow around 5.7–6% in 2026/27. Will the East African nation beat that target?",
    [
      { id: randomUUID(), label: 'YES – above 6%', total_pool: 0 },
      { id: randomUUID(), label: 'NO – 6% or below', total_pool: 0 },
    ],
    'economy', '2027-06-30T00:00:00Z'
  ),
  mk(
    "Will Uganda's inflation rate drop below 5% before end of 2026?",
    "Inflation in Uganda has been elevated over the past year. Will the Bank of Uganda's monetary policy bring it under 5% by December 2026?",
    yn(), 'economy', '2026-12-31T00:00:00Z'
  ),
  mk(
    'Will the East African Crude Oil Pipeline (EACOP) start operations by 2028?',
    "Uganda's EACOP — the 1,443km pipeline to Tanzania's Tanga port — has faced repeated delays and international pressure. Will oil finally flow before 2028?",
    [
      { id: randomUUID(), label: 'YES – starts by 2028', total_pool: 0 },
      { id: randomUUID(), label: 'NO – delayed past 2028', total_pool: 0 },
    ],
    'economy', '2028-01-01T00:00:00Z'
  ),
  mk(
    'Will the Uganda shilling trade below UGX 3,500 per USD by end of 2026?',
    "The Uganda shilling has been weakening against the dollar. Will UGX strengthen to below 3,500 per dollar by December 31, 2026?",
    [
      { id: randomUUID(), label: 'YES – strengthens below 3,500', total_pool: 0 },
      { id: randomUUID(), label: 'NO – stays above 3,500', total_pool: 0 },
    ],
    'economy', '2026-12-31T00:00:00Z'
  ),
  mk(
    'Will MTN Uganda declare a higher dividend in 2026 vs 2025?',
    "MTN Uganda is the most actively traded stock on the Uganda Securities Exchange. Will shareholders receive a larger payout in 2026 compared to 2025?",
    [
      { id: randomUUID(), label: 'YES – higher dividend', total_pool: 0 },
      { id: randomUUID(), label: 'NO – same or lower', total_pool: 0 },
    ],
    'economy', '2026-12-31T00:00:00Z'
  ),
  mk(
    'Will the Kampala-Jinja Expressway be fully open to traffic by end of 2027?',
    "Uganda's most significant road project has faced construction delays. Will the expressway be complete and open to all traffic by December 2027?",
    [
      { id: randomUUID(), label: 'YES – fully open by 2027', total_pool: 0 },
      { id: randomUUID(), label: 'NO – still incomplete', total_pool: 0 },
    ],
    'infrastructure', '2027-12-31T00:00:00Z'
  ),
  mk(
    "Will Uganda's Standard Gauge Railway (SGR) break ground before 2028?",
    "Uganda's SGR linking Malaba to Kampala has been discussed for years. Will construction actually begin before 2028?",
    [
      { id: randomUUID(), label: 'YES – construction begins', total_pool: 0 },
      { id: randomUUID(), label: 'NO – still in planning', total_pool: 0 },
    ],
    'infrastructure', '2027-12-31T00:00:00Z'
  ),
  mk(
    'Will a Ugandan tech startup raise more than $5 million in 2026?',
    "Uganda's tech ecosystem is growing fast. Will any Ugandan-founded startup close a funding round of $5M+ before the end of 2026?",
    yn(), 'tech', '2026-12-31T00:00:00Z'
  ),
  mk(
    "Will Uganda reduce or abolish the Mobile Money transaction tax by end of 2026?",
    "Uganda's 0.5% Mobile Money levy has been controversial and critics say it hurts financial inclusion. Will parliament act to reduce or remove it before end of 2026?",
    [
      { id: randomUUID(), label: 'YES – reduced or removed', total_pool: 0 },
      { id: randomUUID(), label: 'NO – stays the same', total_pool: 0 },
    ],
    'economy', '2026-12-31T00:00:00Z'
  ),
  mk(
    "Will Bobi Wine (Robert Kyagulanyi) contest in Uganda's 2031 Presidential Election?",
    "NUP leader Bobi Wine was a major challenger in 2021. Will he run again in 2031 or step away from active politics?",
    yn(), 'politics', '2030-12-31T00:00:00Z'
  ),
  mk(
    'Will Uganda launch a Central Bank Digital Currency (e-shilling) before 2028?',
    "Bank of Uganda has been researching a digital shilling (e-UGX). Will Uganda officially launch a CBDC before 2028?",
    [
      { id: randomUUID(), label: 'YES – e-shilling launches', total_pool: 0 },
      { id: randomUUID(), label: 'NO – still in research phase', total_pool: 0 },
    ],
    'economy', '2027-12-31T00:00:00Z'
  ),
  mk(
    'Will Eddy Kenzo win a major international music award in 2026?',
    "Eddy Kenzo is Uganda's biggest Afrobeats export. Will he take home a BET Award, MTV Africa Music Award, or similar international prize in 2026?",
    yn(), 'entertainment', '2026-12-31T00:00:00Z'
  ),
  mk(
    'Will a Ugandan artist headline a major concert venue outside Africa in 2026?',
    "Can Ugandan music conquer the world stage? Will any Ugandan musician headline a major venue (5,000+ capacity) outside Africa before end of 2026?",
    yn(), 'entertainment', '2026-12-31T00:00:00Z'
  ),
  mk(
    'Will a Ugandan athlete win a medal at the 2028 Los Angeles Olympics?',
    "Joshua Cheptegei, Peruth Chemutai, and others are Olympic medal contenders. Will Uganda bring home gold, silver, or bronze from LA 2028?",
    [
      { id: randomUUID(), label: 'YES – Uganda wins a medal', total_pool: 0 },
      { id: randomUUID(), label: 'NO – no medal this time', total_pool: 0 },
    ],
    'other', '2028-09-15T00:00:00Z'
  ),
  mk(
    "Will Uganda's population exceed 50 million before 2028?",
    "Uganda is one of the world's fastest-growing populations, currently around 48 million. Will the country cross the 50 million mark before 2028?",
    [
      { id: randomUUID(), label: 'YES – crosses 50M before 2028', total_pool: 0 },
      { id: randomUUID(), label: 'NO – still below 50M in 2028', total_pool: 0 },
    ],
    'other', '2027-12-31T00:00:00Z'
  ),
]

console.log(`Inserting ${markets.length} markets...`)

const { data, error } = await supabase.from('markets').insert(markets).select('id, title')

if (error) {
  console.error('Insert failed:', error.message, error.details)
  process.exit(1)
}

console.log(`\n✅ Inserted ${data.length} markets:\n`)
data.forEach((m, i) => console.log(`  ${String(i + 1).padStart(2, ' ')}. ${m.title.slice(0, 75)}`))
