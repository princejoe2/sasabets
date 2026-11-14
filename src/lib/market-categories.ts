// Shared (server + client) market category detection, and the copy used by the
// crawlable category landing pages at /markets/category/[slug].

export type Category =
  | 'all' | 'updown' | 'football' | 'politics' | 'economy' | 'entertainment'
  | 'tech' | 'infrastructure' | 'agriculture' | 'default'

export const VALID_CATS: Category[] = ['football','politics','economy','entertainment','tech','infrastructure','agriculture','updown','default']

export function detectCat(title: string, desc = '', metadata?: Record<string, unknown>): Exclude<Category, 'all'> {
  if (metadata?.type === 'updown' || metadata?.type === 'price_level') return 'updown'
  const stored = metadata?.category as string | undefined
  if (stored && VALID_CATS.includes(stored as Category)) return stored as Exclude<Category, 'all'>
  const t = (title + ' ' + desc).toLowerCase()
  if (/football|soccer|premier.?league|fufa|kcca.*fc|vipers|express.?fc|cranes|afcon|scorer|derby|sc.villa|bul.fc|world.?cup|golden.?boot|messi|haaland|mbapp|bellingham|ronaldo|england.*group|group.?l|norway.*wc|wc.*final|africa.*semi|wc.*semi/.test(t)) return 'football'
  if (/president|election|parliament|political|bobi.?wine|museveni|besigye|social.?media.?tax|vote|contest|treason|muhoozi|lukwago|speaker|nabbanja|minister|mp.be|nup.mp|vetting|ayebare|oboth|foreign.?affair/.test(t)) return 'politics'
  if (/oil.?production|exchange.?rate|ugx.*usd|usd.*ugx|bank.*branch|share.?price|startup.?fund|largest.?fund|mtn.?uganda.?(share|profit|report)|robusta|farmgate|coffee|bitcoin|btc|crypto|gdp|shilling|profit|economy|eacop|pipeline|dividend|inflation/.test(t)) return 'economy'
  if (/music|artist|album|song|festival|nyege|afrimma|eddy.?kenzo|chameleone|fik.?fameica|pallaso|winnie.?nwagi|headline|ai.?product|openai|google.?deep|concert/.test(t)) return 'entertainment'
  if (/5g|mobile.?money|airtel.?money|mtn.?momo|telecom|users.?in.?uganda|startup|digital.?currency|cbdc/.test(t)) return 'tech'
  if (/expressway|railway|sgr|road.?repair|kampala.*jinja|infrastructure/.test(t)) return 'infrastructure'
  if (/rainfall|rain|agriculture|crop|climate|long.?rains/.test(t)) return 'agriculture'
  return 'default'
}

export const CATS: { id: Category; label: string }[] = [
  { id: 'all',            label: 'All'            },
  { id: 'updown',         label: 'Up/Down'        },
  { id: 'football',       label: 'Football'       },
  { id: 'politics',       label: 'Politics'       },
  { id: 'economy',        label: 'Economy'        },
  { id: 'entertainment',  label: 'Entertainment'  },
  { id: 'tech',           label: 'Technology'     },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'agriculture',    label: 'Agriculture'    },
  { id: 'default',        label: 'Other'          },
]

export type CategoryPage = {
  slug: Exclude<Category, 'all' | 'updown' | 'default'>
  label: string
  title: string
  description: string
  h1: string
  intro: string[]
  keywords: string[]
}

/** Categories with their own crawlable landing page. */
export const CATEGORY_PAGES: CategoryPage[] = [
  {
    slug: 'football',
    label: 'Football',
    title: 'Uganda Football Predictions – Cranes, UPL & AFCON Markets',
    description: 'Football prediction markets for Uganda: Uganda Cranes, Uganda Premier League, AFCON qualifiers and European football. Crowd-set odds, paid out via Mobile Money.',
    h1: 'Football prediction markets',
    intro: [
      'Predict Ugandan and international football on Sabula 256: Uganda Cranes fixtures and AFCON qualifying, Uganda Premier League title and relegation races, CAF competitions, and the big European leagues and tournaments.',
      'These are parimutuel markets, not bookmaker odds. Everyone who predicts stakes into one shared pool, the percentages you see are simply the share of money on each outcome, and when the result is confirmed the winners split the pool in proportion to their stake.',
    ],
    keywords: ['Uganda football predictions', 'Uganda Premier League predictions', 'Uganda Cranes prediction', 'AFCON predictions Uganda', 'football prediction market Uganda'],
  },
  {
    slug: 'politics',
    label: 'Politics',
    title: 'Uganda Politics Predictions – Elections & Parliament Markets',
    description: 'Prediction markets on Ugandan politics: elections, candidacies, Parliament, cabinet and policy decisions. See what the crowd expects and back your own view.',
    h1: 'Uganda politics prediction markets',
    intro: [
      'Follow Ugandan politics through markets instead of opinion columns. Questions cover presidential and parliamentary races, who will declare a candidacy, cabinet appointments, bills before Parliament and major policy decisions.',
      'Each market states what has to happen for an outcome to count. The live percentage on each side shows how the money is split — a real-time read of what predictors on Sabula 256 expect.',
    ],
    keywords: ['Uganda election predictions', 'Uganda politics prediction market', 'Uganda 2031 election odds', 'predict Uganda politics'],
  },
  {
    slug: 'economy',
    label: 'Economy',
    title: 'Uganda Economy Predictions – UGX Rate, Fuel & Inflation',
    description: 'Prediction markets on the Ugandan economy: the UGX/USD exchange rate, fuel prices, inflation, Bank of Uganda rate decisions, coffee prices and listed companies.',
    h1: 'Uganda economy prediction markets',
    intro: [
      'Economy markets turn the numbers that affect everyday life in Uganda into clear questions: where the shilling will trade against the dollar, whether pump prices rise, what the Bank of Uganda does with its policy rate, how coffee and other export prices move.',
      'Check the rules on each market page before you predict — they describe what the market will be settled on.',
    ],
    keywords: ['UGX USD exchange rate prediction', 'Uganda fuel price prediction', 'Uganda inflation forecast', 'Uganda economy prediction market'],
  },
  {
    slug: 'entertainment',
    label: 'Entertainment',
    title: 'Uganda Entertainment Predictions – Music, Awards & Festivals',
    description: 'Prediction markets on Ugandan entertainment and pop culture: music releases, award winners, concerts, festivals and trending moments.',
    h1: 'Entertainment prediction markets',
    intro: [
      'Predict the stories everyone is already arguing about: which Ugandan artist takes home the award, who headlines the big festival, whether a concert sells out, and which releases break through.',
      'Entertainment markets work the same way as every market on Sabula 256 — one shared pool, crowd-set percentages, and winners paid to their wallet when the outcome is confirmed.',
    ],
    keywords: ['Uganda music awards predictions', 'Uganda entertainment prediction market', 'Nyege Nyege predictions'],
  },
  {
    slug: 'tech',
    label: 'Technology',
    title: 'Technology Predictions – Telecoms, Startups & AI Markets',
    description: 'Prediction markets on technology in Uganda and beyond: telecoms and 5G rollout, mobile money, startup funding, crypto and AI product launches.',
    h1: 'Technology prediction markets',
    intro: [
      'Technology markets cover telecoms and mobile money in Uganda, network rollouts, startup funding rounds, and global stories such as crypto prices and AI product launches.',
      'If a question you care about is missing, anyone with an account can create a market or suggest one for the community to vote on.',
    ],
    keywords: ['Uganda tech predictions', 'MTN 5G Uganda prediction', 'technology prediction market'],
  },
  {
    slug: 'infrastructure',
    label: 'Infrastructure',
    title: 'Uganda Infrastructure Predictions – Roads, Rail & Energy',
    description: 'Prediction markets on Ugandan infrastructure projects: expressways, the standard gauge railway, the EACOP pipeline, power and public works deadlines.',
    h1: 'Infrastructure prediction markets',
    intro: [
      'Will the project be finished on time? Infrastructure markets track delivery dates and milestones for roads and expressways, rail, the oil pipeline, power projects and other public works in Uganda.',
      'The rules on each market page describe the milestone being predicted, so read them before you pick a side.',
    ],
    keywords: ['EACOP prediction', 'Kampala Jinja Expressway prediction', 'Uganda infrastructure prediction market'],
  },
  {
    slug: 'agriculture',
    label: 'Agriculture',
    title: 'Uganda Agriculture Predictions – Coffee Prices & Harvests',
    description: 'Prediction markets on Ugandan agriculture: coffee farmgate prices, harvests, rainfall and seasonal outlooks.',
    h1: 'Agriculture prediction markets',
    intro: [
      'Agriculture markets cover the prices and seasons that matter to Ugandan farmers and traders: coffee farmgate prices, export volumes, rainfall and harvest outlooks.',
      'Like every market on Sabula 256, the percentages come from the pool itself — they show how predictors are split, not a forecast from us.',
    ],
    keywords: ['Uganda coffee price prediction', 'Uganda agriculture prediction market', 'rainfall prediction Uganda'],
  },
]

export function getCategoryPage(slug: string): CategoryPage | undefined {
  return CATEGORY_PAGES.find(c => c.slug === slug)
}
