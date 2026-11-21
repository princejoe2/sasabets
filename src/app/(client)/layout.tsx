import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import WhatsAppPopup from '@/components/WhatsAppPopup'
import PhoneGate from '@/components/PhoneGate'
import BottomNav from '@/components/BottomNav'
// Client-only widgets (ssr: false) — dynamic imports live in a Client Component
import { ClosingSoonBanner, StreakTracker } from '@/components/LazyClient'

// NOTE: this layout must not read cookies()/headers(): doing so makes every page under
// it dynamic (Cache-Control: private, no-store). The "admins go to /admin" redirect that
// used to live here is done in middleware.ts instead.
export default function ClientLayout({ children }: { children: React.ReactNode }) {
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
