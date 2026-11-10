import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { unstable_cache } from 'next/cache'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import WhatsAppPopup from '@/components/WhatsAppPopup'
import PhoneGate from '@/components/PhoneGate'
import BottomNav from '@/components/BottomNav'
// Client-only widgets (ssr: false) — dynamic imports live in a Client Component
import { ClosingSoonBanner, StreakTracker } from '@/components/LazyClient'

// is_admin rarely changes — cache per user for 5 minutes
const isAdminCached = unstable_cache(
  async (uid: string) => {
    const { data } = await createAdminClient().from('profiles').select('is_admin').eq('id', uid).single()
    return !!data?.is_admin
  },
  ['profile-is-admin'],
  { revalidate: 300 },
)

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  try {
    // Anonymous visitors (no Supabase auth cookie) skip every auth round-trip.
    const hasAuthCookie = (await cookies()).getAll().some(c => c.name.startsWith('sb-') && c.name.includes('auth-token'))
    if (hasAuthCookie) {
      // Middleware already verified the session with getUser(); here we only need the id
      // for the admin redirect (a UX redirect — admin pages enforce their own guards).
      const supabase = await createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user && await isAdminCached(session.user.id)) redirect('/admin')
    }
  } catch (err: unknown) {
    if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw err
    // Auth check failed — render without user session
  }

  return (
    <>
      <Navbar />
      <main className="pb-16 sm:pb-0 bg-mk-bg">
        <ClosingSoonBanner />
        {children}
      </main>
      <Footer />
      <WhatsAppPopup />
      <PhoneGate />
      <BottomNav />
      <StreakTracker />
    </>
  )
}
