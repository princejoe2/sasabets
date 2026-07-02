import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import WhatsAppPopup from '@/components/WhatsAppPopup'
import PhoneGate from '@/components/PhoneGate'
import BottomNav from '@/components/BottomNav'

// Client-only: these components read sessionStorage/auth and must not SSR
const ClosingSoonBanner = dynamic(() => import('@/components/ClosingSoonBanner'), { ssr: false })
const StreakTracker = dynamic(() => import('@/components/StreakTracker'), { ssr: false })

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profile?.is_admin) redirect('/admin')
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
