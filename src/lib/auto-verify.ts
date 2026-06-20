export type VerificationType = 'manual' | 'crypto_price' | 'fx_rate' | 'polymarket' | 'football'

export interface VerificationConfig {
  // crypto_price
  asset?:        string               // 'bitcoin' | 'ethereum' | 'solana'
  threshold?:    number
  optAWinsWhen?: 'above' | 'below'   // what must be true for opt_a to win
  // fx_rate
  pair?:         string               // 'ugx' | 'kes' | 'tzs'
  // polymarket
  conditionId?:  string
  // football
  eventId?:      string               // TheSportsDB event ID
  eventName?:    string               // display label
  optAOutcome?:  'home_win' | 'away_win' | 'draw'
}

/** Returns the winning option ID, or null if the outcome cannot yet be determined. */
export async function resolveVerification(
  type: VerificationType,
  config: VerificationConfig,
): Promise<'opt_a' | 'opt_b' | null> {
  switch (type) {
    case 'crypto_price': return resolveCryptoPrice(config)
    case 'fx_rate':      return resolveFxRate(config)
    case 'polymarket':   return resolvePolymarket(config)
    case 'football':     return resolveFootball(config)
    default:             return null
  }
}

async function resolveCryptoPrice(cfg: VerificationConfig): Promise<'opt_a' | 'opt_b' | null> {
  const { asset = 'bitcoin', threshold, optAWinsWhen = 'above' } = cfg
  if (!threshold) return null
  try {
    const res  = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${asset}&vs_currencies=usd`, { cache: 'no-store' })
    const data = await res.json()
    const price: number = data[asset]?.usd
    if (!price) return null
    const isAbove  = price > threshold
    const optAWins = optAWinsWhen === 'above' ? isAbove : !isAbove
    return optAWins ? 'opt_a' : 'opt_b'
  } catch { return null }
}

async function resolveFxRate(cfg: VerificationConfig): Promise<'opt_a' | 'opt_b' | null> {
  const { pair = 'ugx', threshold, optAWinsWhen = 'above' } = cfg
  if (!threshold) return null
  try {
    const res  = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' })
    const data = await res.json()
    const rate: number = data.rates?.[pair.toUpperCase()]
    if (!rate) return null
    const isAbove  = rate > threshold
    const optAWins = optAWinsWhen === 'above' ? isAbove : !isAbove
    return optAWins ? 'opt_a' : 'opt_b'
  } catch { return null }
}

async function resolvePolymarket(cfg: VerificationConfig): Promise<'opt_a' | 'opt_b' | null> {
  const { conditionId } = cfg
  if (!conditionId) return null
  try {
    const res  = await fetch(`https://gamma-api.polymarket.com/markets?conditionIds=${conditionId}`, { cache: 'no-store' })
    const data = await res.json()
    const market = Array.isArray(data) ? data[0] : null
    if (!market || !market.closed) return null

    const prices: string[] = Array.isArray(market.outcomePrices)
      ? market.outcomePrices
      : JSON.parse(market.outcomePrices ?? '[]')

    if (parseFloat(prices[0] ?? '0') >= 0.99) return 'opt_a'
    if (parseFloat(prices[1] ?? '0') >= 0.99) return 'opt_b'
    return null
  } catch { return null }
}

async function resolveFootball(cfg: VerificationConfig): Promise<'opt_a' | 'opt_b' | null> {
  const { eventId, optAOutcome = 'home_win' } = cfg
  if (!eventId) return null
  try {
    const res   = await fetch(`https://www.thesportsdb.com/api/v1/json/3/lookupevent.php?id=${eventId}`, { cache: 'no-store' })
    const data  = await res.json()
    const event = data.events?.[0]
    if (!event) return null

    const status = (event.strStatus ?? '').toLowerCase()
    const done   = status.includes('finish') || status === 'ft' || status === 'aet' || status === 'pen'
    if (!done) return null

    const home = parseInt(event.intHomeScore ?? '-1', 10)
    const away = parseInt(event.intAwayScore ?? '-1', 10)
    if (home < 0 || away < 0) return null

    const actual: 'home_win' | 'away_win' | 'draw' =
      home > away ? 'home_win' : away > home ? 'away_win' : 'draw'

    return actual === optAOutcome ? 'opt_a' : 'opt_b'
  } catch { return null }
}
