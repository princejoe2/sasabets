// Logo sources:
// - Countries: flagcdn.com (free, stable, no hotlink restrictions)
// - Football clubs: logo.clearbit.com (free CDN by domain, very reliable)
// - Crypto: coingecko.com (free CDN, stable)
// - Ugandan clubs/politicians: Wikipedia commons direct JPG (more stable than SVG thumbs)

const RAW: Record<string, string> = {
  // ── UGANDA ──────────────────────────────────────────────────────────
  'uganda cranes':         'https://flagcdn.com/w80/ug.png',
  'uganda':                'https://flagcdn.com/w80/ug.png',
  'harambee stars':        'https://flagcdn.com/w80/ke.png',

  // ── UGANDAN CLUBS ───────────────────────────────────────────────────
  'vipers sc':             'https://flagcdn.com/w80/ug.png',
  'vipers':                'https://flagcdn.com/w80/ug.png',
  'kcca fc':               'https://flagcdn.com/w80/ug.png',
  'kcca':                  'https://flagcdn.com/w80/ug.png',
  'express fc':            'https://upload.wikimedia.org/wikipedia/en/5/5f/ExpressFCLogo.png',
  'express':               'https://upload.wikimedia.org/wikipedia/en/5/5f/ExpressFCLogo.png',
  'sc villa':              'https://upload.wikimedia.org/wikipedia/en/4/4c/SC_Villa_Uganda_logo.png',
  'villa':                 'https://upload.wikimedia.org/wikipedia/en/4/4c/SC_Villa_Uganda_logo.png',
  'ura fc':                'https://upload.wikimedia.org/wikipedia/en/7/72/URA_FC.png',
  'ura':                   'https://upload.wikimedia.org/wikipedia/en/7/72/URA_FC.png',
  'wakiso giants':         'https://upload.wikimedia.org/wikipedia/en/a/a3/Wakiso_Giants_FC.png',
  'bul fc':                'https://flagcdn.com/w80/ug.png',
  'onduparaka':            'https://flagcdn.com/w80/ug.png',
  'mbarara city':          'https://flagcdn.com/w80/ug.png',

  // ── EAST AFRICAN NATIONAL TEAMS ─────────────────────────────────────
  'kenya':                 'https://flagcdn.com/w80/ke.png',
  'tanzania':              'https://flagcdn.com/w80/tz.png',
  'taifa stars':           'https://flagcdn.com/w80/tz.png',
  'rwanda':                'https://flagcdn.com/w80/rw.png',
  'amavubi':               'https://flagcdn.com/w80/rw.png',
  'ethiopia':              'https://flagcdn.com/w80/et.png',
  'walya antelopes':       'https://flagcdn.com/w80/et.png',
  'burundi':               'https://flagcdn.com/w80/bi.png',
  'south sudan':           'https://flagcdn.com/w80/ss.png',
  'congo':                 'https://flagcdn.com/w80/cd.png',
  'drc':                   'https://flagcdn.com/w80/cd.png',
  'leopards':              'https://flagcdn.com/w80/cd.png',

  // ── AFRICAN NATIONAL TEAMS ──────────────────────────────────────────
  'nigeria':               'https://flagcdn.com/w80/ng.png',
  'super eagles':          'https://flagcdn.com/w80/ng.png',
  'ghana':                 'https://flagcdn.com/w80/gh.png',
  'black stars':           'https://flagcdn.com/w80/gh.png',
  'egypt':                 'https://flagcdn.com/w80/eg.png',
  'pharaohs':              'https://flagcdn.com/w80/eg.png',
  'morocco':               'https://flagcdn.com/w80/ma.png',
  'atlas lions':           'https://flagcdn.com/w80/ma.png',
  'senegal':               'https://flagcdn.com/w80/sn.png',
  'lions of teranga':      'https://flagcdn.com/w80/sn.png',
  'cameroon':              'https://flagcdn.com/w80/cm.png',
  'indomitable lions':     'https://flagcdn.com/w80/cm.png',
  'ivory coast':           'https://flagcdn.com/w80/ci.png',
  'elephants':             'https://flagcdn.com/w80/ci.png',
  "cote d'ivoire":         'https://flagcdn.com/w80/ci.png',
  'mali':                  'https://flagcdn.com/w80/ml.png',
  'zambia':                'https://flagcdn.com/w80/zm.png',
  'chipolopolo':           'https://flagcdn.com/w80/zm.png',
  'zimbabwe':              'https://flagcdn.com/w80/zw.png',
  'south africa':          'https://flagcdn.com/w80/za.png',
  'bafana bafana':         'https://flagcdn.com/w80/za.png',
  'algeria':               'https://flagcdn.com/w80/dz.png',
  'desert foxes':          'https://flagcdn.com/w80/dz.png',
  'tunisia':               'https://flagcdn.com/w80/tn.png',
  'angola':                'https://flagcdn.com/w80/ao.png',
  'mozambique':            'https://flagcdn.com/w80/mz.png',
  'cape verde':            'https://flagcdn.com/w80/cv.png',
  'guinea':                'https://flagcdn.com/w80/gn.png',
  'gabon':                 'https://flagcdn.com/w80/ga.png',
  'equatorial guinea':     'https://flagcdn.com/w80/gq.png',
  'liberia':               'https://flagcdn.com/w80/lr.png',
  'sierra leone':          'https://flagcdn.com/w80/sl.png',
  'namibia':               'https://flagcdn.com/w80/na.png',
  'malawi':                'https://flagcdn.com/w80/mw.png',
  'flamingoes':            'https://flagcdn.com/w80/mw.png',

  // ── WORLD NATIONAL TEAMS ────────────────────────────────────────────
  'brazil':                'https://flagcdn.com/w80/br.png',
  'argentina':             'https://flagcdn.com/w80/ar.png',
  'france':                'https://flagcdn.com/w80/fr.png',
  'les bleus':             'https://flagcdn.com/w80/fr.png',
  'germany':               'https://flagcdn.com/w80/de.png',
  'spain':                 'https://flagcdn.com/w80/es.png',
  'england':               'https://flagcdn.com/w80/gb-eng.png',
  'three lions':           'https://flagcdn.com/w80/gb-eng.png',
  'netherlands':           'https://flagcdn.com/w80/nl.png',
  'oranje':                'https://flagcdn.com/w80/nl.png',
  'portugal':              'https://flagcdn.com/w80/pt.png',
  'italy':                 'https://flagcdn.com/w80/it.png',
  'azzurri':               'https://flagcdn.com/w80/it.png',
  'belgium':               'https://flagcdn.com/w80/be.png',
  'red devils':            'https://flagcdn.com/w80/be.png',
  'croatia':               'https://flagcdn.com/w80/hr.png',
  'usa':                   'https://flagcdn.com/w80/us.png',
  'mexico':                'https://flagcdn.com/w80/mx.png',
  'el tri':                'https://flagcdn.com/w80/mx.png',
  'japan':                 'https://flagcdn.com/w80/jp.png',
  'south korea':           'https://flagcdn.com/w80/kr.png',
  'australia':             'https://flagcdn.com/w80/au.png',
  'socceroos':             'https://flagcdn.com/w80/au.png',
  'saudi arabia':          'https://flagcdn.com/w80/sa.png',
  'colombia':              'https://flagcdn.com/w80/co.png',
  'uruguay':               'https://flagcdn.com/w80/uy.png',
  'chile':                 'https://flagcdn.com/w80/cl.png',
  'ecuador':               'https://flagcdn.com/w80/ec.png',
  'scotland':              'https://flagcdn.com/w80/gb-sct.png',
  'wales':                 'https://flagcdn.com/w80/gb-wls.png',
  'ireland':               'https://flagcdn.com/w80/ie.png',
  'turkey':                'https://flagcdn.com/w80/tr.png',

  // ── PREMIER LEAGUE — via Clearbit (club official domains) ──────────
  'arsenal':               'https://logo.clearbit.com/arsenal.com',
  'chelsea':               'https://logo.clearbit.com/chelseafc.com',
  'manchester united':     'https://logo.clearbit.com/manutd.com',
  'man united':            'https://logo.clearbit.com/manutd.com',
  'man utd':               'https://logo.clearbit.com/manutd.com',
  'manchester city':       'https://logo.clearbit.com/mancity.com',
  'man city':              'https://logo.clearbit.com/mancity.com',
  'liverpool':             'https://logo.clearbit.com/liverpoolfc.com',
  'tottenham':             'https://logo.clearbit.com/tottenhamhotspur.com',
  'spurs':                 'https://logo.clearbit.com/tottenhamhotspur.com',
  'newcastle':             'https://logo.clearbit.com/nufc.co.uk',
  'aston villa':           'https://logo.clearbit.com/avfc.co.uk',
  'west ham':              'https://logo.clearbit.com/whufc.com',
  'brighton':              'https://logo.clearbit.com/brightonandhovealbion.com',
  'brentford':             'https://logo.clearbit.com/brentfordfc.com',
  'everton':               'https://logo.clearbit.com/evertonfc.com',
  'wolves':                'https://logo.clearbit.com/wolves.co.uk',
  'wolverhampton':         'https://logo.clearbit.com/wolves.co.uk',
  'fulham':                'https://logo.clearbit.com/fulhamfc.com',
  'crystal palace':        'https://logo.clearbit.com/cpfc.co.uk',
  'nottingham forest':     'https://logo.clearbit.com/nottinghamforest.co.uk',
  'bournemouth':           'https://logo.clearbit.com/afcb.co.uk',
  'leicester':             'https://logo.clearbit.com/lcfc.com',
  'southampton':           'https://logo.clearbit.com/southamptonfc.com',
  'ipswich':               'https://logo.clearbit.com/itfc.co.uk',
  'sunderland':            'https://logo.clearbit.com/safc.com',
  'leeds':                 'https://logo.clearbit.com/leedsunited.com',

  // ── LA LIGA ─────────────────────────────────────────────────────────
  'real madrid':           'https://logo.clearbit.com/realmadrid.com',
  'barcelona':             'https://logo.clearbit.com/fcbarcelona.com',
  'barca':                 'https://logo.clearbit.com/fcbarcelona.com',
  'atletico madrid':       'https://logo.clearbit.com/atleticodemadrid.com',
  'atletico':              'https://logo.clearbit.com/atleticodemadrid.com',
  'sevilla':               'https://logo.clearbit.com/sevillafc.es',
  'real sociedad':         'https://logo.clearbit.com/realsociedad.eus',
  'villarreal':            'https://logo.clearbit.com/villarrealcf.es',
  'athletic bilbao':       'https://logo.clearbit.com/athletic-club.eus',

  // ── EUROPEAN CLUBS ──────────────────────────────────────────────────
  'psg':                   'https://logo.clearbit.com/psg.fr',
  'paris saint-germain':   'https://logo.clearbit.com/psg.fr',
  'paris sg':              'https://logo.clearbit.com/psg.fr',
  'bayern munich':         'https://logo.clearbit.com/fcbayern.com',
  'bayern':                'https://logo.clearbit.com/fcbayern.com',
  'borussia dortmund':     'https://logo.clearbit.com/bvb.de',
  'dortmund':              'https://logo.clearbit.com/bvb.de',
  'bvb':                   'https://logo.clearbit.com/bvb.de',
  'juventus':              'https://logo.clearbit.com/juventus.com',
  'juve':                  'https://logo.clearbit.com/juventus.com',
  'inter milan':           'https://logo.clearbit.com/inter.it',
  'inter':                 'https://logo.clearbit.com/inter.it',
  'internazionale':        'https://logo.clearbit.com/inter.it',
  'ac milan':              'https://logo.clearbit.com/acmilan.com',
  'milan':                 'https://logo.clearbit.com/acmilan.com',
  'napoli':                'https://logo.clearbit.com/sscnapoli.it',
  'ajax':                  'https://logo.clearbit.com/ajax.nl',
  'porto':                 'https://logo.clearbit.com/fcporto.pt',
  'benfica':               'https://logo.clearbit.com/slbenfica.pt',
  'sporting':              'https://logo.clearbit.com/sporting.pt',
  'celtic':                'https://logo.clearbit.com/celticfc.com',
  'rangers':               'https://logo.clearbit.com/rangers.co.uk',
  'rb leipzig':            'https://logo.clearbit.com/dierotenbullen.com',
  'bayer leverkusen':      'https://logo.clearbit.com/bayer04.de',
  'leverkusen':            'https://logo.clearbit.com/bayer04.de',
  'monaco':                'https://logo.clearbit.com/asmonaco.com',
  'marseille':             'https://logo.clearbit.com/om.fr',
  'lyon':                  'https://logo.clearbit.com/ol.fr',
  'galatasaray':           'https://logo.clearbit.com/galatasaray.org',
  'fenerbahce':            'https://logo.clearbit.com/fenerbahce.org',
  'anderlecht':            'https://logo.clearbit.com/rsca.be',
  'shakhtar':              'https://logo.clearbit.com/shakhtar.com',
  'psv':                   'https://logo.clearbit.com/psv.nl',

  // ── AFRICAN CLUBS ───────────────────────────────────────────────────
  'al ahly':               'https://upload.wikimedia.org/wikipedia/en/f/f6/Al_Ahly_SC_Logo.svg',
  'zamalek':               'https://upload.wikimedia.org/wikipedia/en/5/55/Zamalek_SC.png',
  'raja casablanca':       'https://upload.wikimedia.org/wikipedia/en/e/e0/Raja_CA_Logo.svg',
  'kaizer chiefs':         'https://upload.wikimedia.org/wikipedia/en/2/2f/Kaizer_Chiefs_logo.svg',
  'orlando pirates':       'https://upload.wikimedia.org/wikipedia/en/a/a5/Orlando_Pirates_Logo.svg',
  'mamelodi sundowns':     'https://upload.wikimedia.org/wikipedia/en/b/b1/Mamelodi_Sundowns_FC_logo.svg',
  'sundowns':              'https://upload.wikimedia.org/wikipedia/en/b/b1/Mamelodi_Sundowns_FC_logo.svg',
  'simba sc':              'https://upload.wikimedia.org/wikipedia/en/1/1f/Simba_FC.png',
  'simba':                 'https://upload.wikimedia.org/wikipedia/en/1/1f/Simba_FC.png',
  'young africans':        'https://upload.wikimedia.org/wikipedia/en/b/b8/Young_Africans_SC_logo.png',
  'yanga':                 'https://upload.wikimedia.org/wikipedia/en/b/b8/Young_Africans_SC_logo.png',
  'gor mahia':             'https://upload.wikimedia.org/wikipedia/en/8/82/Gor_Mahia_FC_logo.png',
  'afc leopards':          'https://upload.wikimedia.org/wikipedia/en/e/e3/AFC_Leopards_FC_logo.png',
  'leopards fc':           'https://upload.wikimedia.org/wikipedia/en/e/e3/AFC_Leopards_FC_logo.png',

  // ── CRYPTOCURRENCY ──────────────────────────────────────────────────
  'bitcoin':               'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
  'btc':                   'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
  'ethereum':              'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
  'eth':                   'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
  'bnb':                   'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
  'binance coin':          'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
  'xrp':                   'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
  'ripple':                'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
  'solana':                'https://assets.coingecko.com/coins/images/4128/large/solana.png',
  'sol':                   'https://assets.coingecko.com/coins/images/4128/large/solana.png',
  'cardano':               'https://assets.coingecko.com/coins/images/975/large/cardano.png',
  'ada':                   'https://assets.coingecko.com/coins/images/975/large/cardano.png',
  'dogecoin':              'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
  'doge':                  'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
  'usdt':                  'https://assets.coingecko.com/coins/images/325/large/Tether.png',
  'tether':                'https://assets.coingecko.com/coins/images/325/large/Tether.png',
  'polkadot':              'https://assets.coingecko.com/coins/images/12171/large/polkadot.png',
  'dot':                   'https://assets.coingecko.com/coins/images/12171/large/polkadot.png',
  'shiba inu':             'https://assets.coingecko.com/coins/images/11939/large/shiba.png',
  'shib':                  'https://assets.coingecko.com/coins/images/11939/large/shiba.png',
  'avalanche':             'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png',
  'avax':                  'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png',

  // ── UGANDAN POLITICIANS ─────────────────────────────────────────────
  'museveni':              'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Yoweri_Museveni_%282015_Official_Photo%29.jpg/200px-Yoweri_Museveni_%282015_Official_Photo%29.jpg',
  'yoweri museveni':       'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Yoweri_Museveni_%282015_Official_Photo%29.jpg/200px-Yoweri_Museveni_%282015_Official_Photo%29.jpg',
  'bobi wine':             'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Bobi_Wine_%28Robert_Kyagulanyi%29_%28cropped%29.jpg/200px-Bobi_Wine_%28Robert_Kyagulanyi%29_%28cropped%29.jpg',
  'kyagulanyi':            'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Bobi_Wine_%28Robert_Kyagulanyi%29_%28cropped%29.jpg/200px-Bobi_Wine_%28Robert_Kyagulanyi%29_%28cropped%29.jpg',
  'robert kyagulanyi':     'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Bobi_Wine_%28Robert_Kyagulanyi%29_%28cropped%29.jpg/200px-Bobi_Wine_%28Robert_Kyagulanyi%29_%28cropped%29.jpg',
  'norbert mao':           'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Norbert_Mao.jpg/200px-Norbert_Mao.jpg',
  'kizza besigye':         'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Kizza_Besigye_2015.jpg/200px-Kizza_Besigye_2015.jpg',
  'besigye':               'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Kizza_Besigye_2015.jpg/200px-Kizza_Besigye_2015.jpg',

  // ── YES/NO — explicitly no logo ──────────────────────────────────────
  'yes':   '',
  'no':    '',
  'true':  '',
  'false': '',
  'over':  '',
  'under': '',
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\b(fc|sc|afc|bfc|cf|f\.c\.|s\.c\.)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getEntityLogo(name: string): string | null {
  if (!name) return null
  const key = normalize(name)

  // Skip meaningless single-word yes/no options
  if (RAW[key] !== undefined) return RAW[key] || null

  // Partial match: "Uganda Cranes vs Kenya" → try substrings
  for (const [k, url] of Object.entries(RAW)) {
    if (!k || k.length < 3) continue
    if (key === k || key.startsWith(k + ' ') || key.endsWith(' ' + k) || key.includes(' ' + k + ' ')) {
      return url || null
    }
  }
  return null
}

// For markets where options are Yes/No, try to extract a logo from the market title
export function getEntityLogoFromTitle(title: string): { logoA: string | null; logoB: string | null } {
  if (!title) return { logoA: null, logoB: null }
  const t = normalize(title)

  const matched: Array<{ key: string; url: string; pos: number }> = []

  for (const [k, url] of Object.entries(RAW)) {
    if (!k || k.length < 3 || !url) continue
    const idx = t.indexOf(k)
    if (idx !== -1) matched.push({ key: k, url, pos: idx })
  }

  // Sort by position in title, take first 2
  matched.sort((a, b) => a.pos - b.pos)
  const distinct = matched.filter((m, i) =>
    i === 0 || !matched.slice(0, i).some(prev => prev.url === m.url)
  )

  return {
    logoA: distinct[0]?.url ?? null,
    logoB: distinct[1]?.url ?? null,
  }
}
