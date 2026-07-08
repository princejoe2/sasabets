import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#061a0e"/>
      <stop offset="100%" stop-color="#040c06"/>
    </radialGradient>
    <linearGradient id="bar1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#00ff88"/>
      <stop offset="100%" stop-color="#003322"/>
    </linearGradient>
    <linearGradient id="bar2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#00ff88"/>
      <stop offset="100%" stop-color="#005533"/>
    </linearGradient>
    <linearGradient id="bar3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#00ff88"/>
      <stop offset="100%" stop-color="#009944"/>
    </linearGradient>
    <linearGradient id="boxG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00ff88"/>
      <stop offset="100%" stop-color="#00cc66"/>
    </linearGradient>
    <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="tGlow" x="-5%" y="-20%" width="110%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="200" height="200" rx="36" fill="url(#bg)"/>

  <!-- SABULA text box (Logo E top section) -->
  <rect x="10" y="8" width="180" height="46" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" stroke-width="1.5"/>
  <text x="100" y="45" text-anchor="middle"
        font-family="Impact, Arial Black, sans-serif"
        font-size="34" fill="white" letter-spacing="8"
        filter="url(#tGlow)">SABULA</text>

  <!-- Chart grid lines (Logo C) -->
  <line x1="18" y1="148" x2="182" y2="148" stroke="rgba(0,255,136,0.14)" stroke-width="1"/>
  <line x1="18" y1="118" x2="182" y2="118" stroke="rgba(0,255,136,0.07)" stroke-width="1"/>
  <line x1="18" y1="88"  x2="182" y2="88"  stroke="rgba(0,255,136,0.07)" stroke-width="1"/>

  <!-- 3 ascending bars (Logo C) -->
  <rect x="26"  y="112" width="28" height="36" rx="4" fill="url(#bar1)"/>
  <rect x="68"  y="84"  width="28" height="64" rx="4" fill="url(#bar2)"/>
  <rect x="110" y="62"  width="28" height="86" rx="4" fill="url(#bar3)"/>

  <!-- Yellow trend line from bar 1 top → bar 2 top → bar 3 top → top-right (Logo C) -->
  <polyline points="40,112 82,84 124,62 162,58"
            stroke="#f5c518" stroke-width="3.5" fill="none"
            stroke-linecap="round" stroke-linejoin="round"
            filter="url(#lineGlow)" opacity="0.92"/>
  <!-- Arrowhead at trend line end -->
  <polygon points="162,58 150,53 155,65" fill="#f5c518"/>
  <circle cx="162" cy="58" r="5" fill="#f5c518" filter="url(#dotGlow)"/>

  <!-- 256 box (Logo E bottom section) -->
  <rect x="10" y="156" width="180" height="36" rx="10" fill="url(#boxG)"/>
  <rect x="10" y="156" width="180" height="18" rx="10" fill="rgba(255,255,255,0.13)"/>
  <rect x="10" y="166" width="180" height="8"  fill="rgba(255,255,255,0.06)"/>
  <text x="100" y="183" text-anchor="middle"
        font-family="Courier New, Courier, monospace"
        font-size="24" font-weight="900" fill="#040c06" letter-spacing="3">256</text>
</svg>`

const svgBuf = Buffer.from(svgContent)

async function run() {
  await sharp(svgBuf).resize(192, 192).png({ quality: 100 }).toFile(join(publicDir, 'icon-192.png'))
  console.log('✓ icon-192.png')

  await sharp(svgBuf).resize(512, 512).png({ quality: 100 }).toFile(join(publicDir, 'icon-512.png'))
  console.log('✓ icon-512.png')

  console.log('Icons generated successfully.')
}

run().catch(err => { console.error(err); process.exit(1) })
