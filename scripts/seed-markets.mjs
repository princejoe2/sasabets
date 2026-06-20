import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jsigphyrhgmpaydozjfa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaWdwaHlyaGdtcGF5ZG96amZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY4MTYxNywiZXhwIjoyMDk3MjU3NjE3fQ.h6qg0eVlboTMpCW1F3bcQg3erJMpAu_Dm9fi1hHXOrE',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function opts(...labels) {
  return labels.map((label, i) => ({ id: `opt_${i + 1}`, label, total_pool: 0 }))
}

function closes(daysFromNow) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString()
}

const markets = [
  // ─── FUFA / Football ────────────────────────────────────────────
  {
    title: 'Who will win the 2024/25 Uganda Premier League?',
    description: 'The FUFA Uganda Premier League season is heading towards its final stages. Which club takes the championship?',
    options: opts('KCCA FC', 'Express FC', 'Vipers SC', 'SC Villa', 'BUL FC'),
    closes_at: closes(45),
  },
  {
    title: 'Will Uganda Cranes qualify for AFCON 2027?',
    description: 'Uganda is in AFCON 2027 qualifying. Will the Cranes secure their spot in the tournament?',
    options: opts('Yes – qualify', 'No – eliminated'),
    closes_at: closes(120),
  },
  {
    title: 'KCCA FC vs Vipers SC – who wins the next Kampala Derby?',
    description: 'The biggest fixture in Ugandan football. When these two meet, anything can happen.',
    options: opts('KCCA FC wins', 'Vipers SC wins', 'Draw'),
    closes_at: closes(14),
  },
  {
    title: 'Who finishes as top scorer in the 2024/25 Uganda Premier League?',
    description: 'The golden boot race is heating up. Which striker finishes with the most league goals?',
    options: opts('Muzamiru Mutyaba', 'Dan Sserunkuma', 'Steven Mukwala', 'Patrick Kaddu', 'Another player'),
    closes_at: closes(50),
  },

  // ─── Politics ────────────────────────────────────────────────────
  {
    title: 'Who wins the 2026 Uganda Presidential Election?',
    description: 'Uganda goes to the polls in early 2026. President Museveni has held power since 1986. Will 2026 bring change?',
    options: opts('Yoweri Museveni (NRM)', 'Bobi Wine (NUP)', 'Kizza Besigye', 'Another candidate'),
    closes_at: closes(200),
  },
  {
    title: 'Will Bobi Wine contest the 2026 Presidential Election?',
    description: 'Robert Kyagulanyi (Bobi Wine) stood in 2021. Will he run again in 2026?',
    options: opts('Yes – he contests', 'No – he sits out'),
    closes_at: closes(90),
  },
  {
    title: 'Will Uganda pass the Social Media Tax in 2025?',
    description: 'The government has proposed extending and expanding the OTT/social media tax. Will parliament pass new legislation this year?',
    options: opts('Yes – tax passes', 'No – blocked or dropped'),
    closes_at: closes(60),
  },

  // ─── Economy & Business ──────────────────────────────────────────
  {
    title: 'Will Uganda begin commercial oil production before 2027?',
    description: 'The TotalEnergies Tilenga and CNOOC Kingfisher projects have faced repeated delays. Will first oil flow before 2027?',
    options: opts('Yes – first oil before 2027', 'No – delayed again'),
    closes_at: closes(180),
  },
  {
    title: 'What will the USD/UGX exchange rate be at end of 2025?',
    description: 'The shilling has been under pressure. Where does it settle against the dollar by 31 December 2025?',
    options: opts('Below UGX 3,700', 'UGX 3,700 – 3,900', 'UGX 3,900 – 4,100', 'Above UGX 4,100'),
    closes_at: closes(180),
  },
  {
    title: 'Will MTN Uganda\'s share price rise or fall by end of Q3 2025?',
    description: 'MTN Uganda is listed on the Uganda Securities Exchange. Which direction does the stock move by September 30, 2025?',
    options: opts('Rise (above current price)', 'Fall (below current price)', 'Stays flat (within 2%)'),
    closes_at: closes(100),
  },
  {
    title: 'Which bank will have the most branches in Uganda by end of 2025?',
    description: 'Stanbic, Centenary, and DFCU are all expanding their networks. Who leads the branch count?',
    options: opts('Stanbic Bank', 'Centenary Bank', 'DFCU Bank', 'Equity Bank'),
    closes_at: closes(180),
  },

  // ─── Entertainment & Music ───────────────────────────────────────
  {
    title: 'Who wins the Afrimma Award for Best East African Artist 2025?',
    description: 'Afrimma celebrates African music globally. Which Ugandan or East African act takes the top regional prize?',
    options: opts('Chameleone', 'Fik Fameica', 'Pallaso', 'Winnie Nwagi', 'An artist from Kenya/Tanzania'),
    closes_at: closes(75),
  },
  {
    title: 'Will Eddy Kenzo release a new album before the end of 2025?',
    description: 'The BET Award winner has been teasing new music. Does a full album drop by 31 December 2025?',
    options: opts('Yes – album out in 2025', 'No – delayed to 2026'),
    closes_at: closes(180),
  },
  {
    title: 'Which artist headlines the 2025 Nyege Nyege Festival main stage?',
    description: 'The internationally acclaimed Nyege Nyege festival brings global acts to Jinja. Who tops the 2025 bill?',
    options: opts('A Ugandan artist', 'A Kenyan / East African artist', 'An international (non-African) artist', 'Two headliners announced'),
    closes_at: closes(80),
  },

  // ─── Technology & Telecoms ───────────────────────────────────────
  {
    title: 'Will Uganda launch a nationwide 5G network in 2025?',
    description: 'MTN and Airtel have been piloting 5G in Kampala. Does a full commercial nationwide 5G rollout happen this year?',
    options: opts('Yes – nationwide 5G in 2025', 'Limited / pilot only', 'No launch in 2025'),
    closes_at: closes(180),
  },
  {
    title: 'Which mobile money platform has more users in Uganda by end of 2025 – MTN MoMo or Airtel Money?',
    description: 'Mobile money is the backbone of Ugandan finance. Will MTN maintain its lead or will Airtel close the gap?',
    options: opts('MTN MoMo stays ahead', 'Airtel Money overtakes MTN', 'Too close to call (within 5%)'),
    closes_at: closes(180),
  },

  // ─── Infrastructure & Transport ──────────────────────────────────
  {
    title: 'Will the Kampala–Jinja Expressway be fully open to traffic by end of 2025?',
    description: 'The expressway has been under construction for years. Does full traffic flow open on all sections before 2026?',
    options: opts('Yes – fully open in 2025', 'Partial opening only', 'Delayed to 2026 or later'),
    closes_at: closes(150),
  },
  {
    title: 'Will the Standard Gauge Railway (SGR) Uganda section begin construction in 2025?',
    description: 'Uganda\'s SGR plans have stalled for years waiting on financing. Does ground-breaking happen in 2025?',
    options: opts('Yes – construction starts in 2025', 'No – still planning / financing'),
    closes_at: closes(180),
  },

  // ─── Climate & Agriculture ───────────────────────────────────────
  {
    title: 'Will Uganda experience above-average rainfall in the March–May 2025 long rains season?',
    description: 'UNMA has issued seasonal outlooks. Will the long rains season deliver above-average, average, or below-average rainfall?',
    options: opts('Above average', 'Near average', 'Below average / drought risk'),
    closes_at: closes(30),
  },
  {
    title: 'What will be the farmgate price of Robusta coffee (per kilo) in Kampala, July 2025?',
    description: 'Uganda is Africa\'s largest coffee exporter. Global prices are high — where does the farmgate price land in July?',
    options: opts('Below UGX 8,000/kg', 'UGX 8,000 – 10,000/kg', 'UGX 10,000 – 12,000/kg', 'Above UGX 12,000/kg'),
    closes_at: closes(30),
  },

  // ─── Bonus: Kampala City ─────────────────────────────────────────
  {
    title: 'Will Kampala Capital City Authority (KCCA) begin the city road repair mega-project in 2025?',
    description: 'KCCA has announced a major inner-city road rehabilitation programme. Does work actually start on the ground in 2025?',
    options: opts('Yes – works begin in 2025', 'No – still procurement / delayed'),
    closes_at: closes(120),
  },
  {
    title: 'Which Ugandan startup raises the largest funding round in 2025?',
    description: 'Uganda\'s tech ecosystem is growing. Which startup closes the biggest equity or debt round this year?',
    options: opts('A fintech startup', 'An agritech startup', 'A healthtech startup', 'A logistics / transport startup', 'An e-commerce startup'),
    closes_at: closes(180),
  },
]

const rows = markets.map(m => ({
  title: m.title,
  description: m.description,
  options: m.options,
  status: 'open',
  total_pool: 0,
  rake_pct: 0.08,
  closes_at: m.closes_at,
}))

const { data, error } = await supabase.from('markets').insert(rows).select('id, title')

if (error) {
  console.error('Insert failed:', error.message)
  process.exit(1)
}

console.log(`Inserted ${data.length} markets:`)
data.forEach((m, i) => console.log(`  ${i + 1}. ${m.title.slice(0, 70)}`))
