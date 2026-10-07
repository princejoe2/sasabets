import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import WhatsAppPopup from '@/components/WhatsAppPopup'
import PhoneGate from '@/components/PhoneGate'
import BottomNav from '@/components/BottomNav'
// Client-only widgets (ssr: false) — dynamic imports live in a Client Component
import { ClosingSoonBanner, StreakTracker } from '@/components/LazyClient'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  let user = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (profile?.is_admin) redirect('/admin')
    }
  } catch (err: unknown) {
    // Log the real error so it appears in Vercel runtime logs
    // (digest is sent to the browser; full message only on server)
    if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw err
    console.error('[ClientLayout] Server component error:', err)
  }

  return (
    <>
      <Navbar />
      <main className="pb-16 sm:pb-0">
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
