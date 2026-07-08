import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Hardcoded public values — same as server.ts — to bypass Vercel BOM injection and
// Edge Runtime inlining quirks that can produce empty strings from NEXT_PUBLIC_ vars.
const SB_URL  = 'https://jsigphyrhgmpaydozjfa.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaWdwaHlyaGdtcGF5ZG96amZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODE2MTcsImV4cCI6MjA5NzI1NzYxN30.AAfhGjO7X89o-HL2QVmpcNrXy_Mj7aJqoLFodp0ryaI'

export async function middleware(request: NextRequest) {
  // Forward pathname so Server Component layouts can read it
  const requestHeaders = new Headers(request.headers)
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

  const protectedRoutes = ['/wallet', '/admin', '/bets', '/profile', '/kyc', '/dashboard', '/invite', '/create']
  const isProtected = protectedRoutes.some(r => path.startsWith(r))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
