import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function strip(s: string) {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c >= 0x20 && c <= 0x7E) out += s[i]
  }
  return out.trim()
}
const SB_URL     = strip(process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '')
const SB_ANON    = strip(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '')
const SB_SERVICE = strip(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')

// ── IP ban cache (per isolate, refreshes every 60 s) ──────────────────────
let ipBanCache: { ips: Set<string>; ts: number } | null = null
const BAN_CACHE_TTL = 60_000

async function loadBanCache() {
  if (!SB_URL || !SB_SERVICE) return
  try {
    const now = new Date().toISOString()
    const res = await fetch(
      `${SB_URL}/rest/v1/banned_ips?select=ip&or=(expires_at.is.null,expires_at.gt.${now})`,
      { headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}` }, cache: 'no-store' }
    )
    if (res.ok) {
      const rows: { ip: string }[] = await res.json()
      ipBanCache = { ips: new Set(rows.map(r => r.ip)), ts: Date.now() }
    }
  } catch { /* allow through if DB unreachable */ }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

async function isBanned(ip: string): Promise<boolean> {
  if (!ipBanCache || Date.now() - ipBanCache.ts > BAN_CACHE_TTL) {
    await loadBanCache()
  }
  return ipBanCache?.ips.has(ip) ?? false
}

export async function middleware(request: NextRequest) {
  // Block banned IPs before doing anything else
  const clientIp = getClientIp(request)
  if (await isBanned(clientIp)) {
    return new NextResponse(
      '<html><body style="font-family:sans-serif;text-align:center;padding:4rem"><h1>Access Denied</h1><p>Your IP address has been blocked.</p></body></html>',
      { status: 403, headers: { 'Content-Type': 'text/html' } }
    )
  }

  // Forward pathname so Server Component layouts can read it
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-client-ip', clientIp)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    SB_URL,
    SB_ANON,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Supabase unreachable — allow request through, protected routes will redirect on render
  }

  // Capture ?ref=CODE → cookie so the register route can credit the referrer
  const refCode = request.nextUrl.searchParams.get('ref')
  if (refCode && /^[A-Z2-9]{7}$/.test(refCode) && !request.cookies.get('sb_ref')) {
    supabaseResponse.cookies.set('sb_ref', refCode, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
      httpOnly: false,
    })
  }

  const path = request.nextUrl.pathname

  // Redirect logged-in users away from /auth (but not sub-paths like /auth/callback or /auth/reset-password)
  if (path === '/auth' && user) {
    return NextResponse.redirect(new URL('/markets', request.url))
  }

  const protectedRoutes = ['/wallet', '/admin', '/bets', '/profile', '/kyc', '/dashboard', '/invite', '/create', '/settings']
  const isProtected = protectedRoutes.some(r => path.startsWith(r))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
