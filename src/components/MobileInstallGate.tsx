'use client'
import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'

type Platform = 'ios' | 'android' | 'other'

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua))           return 'android'
  return 'other'
}

function isMobile(): boolean {
  return /iphone|ipad|ipod|android|mobile/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  // iOS
  if ((navigator as { standalone?: boolean }).standalone === true) return true
  // Android / Chrome
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  return false
}

export default function MobileInstallGate() {
  const pathname = usePathname()
  const [show, setShow]         = useState(false)
  const [platform, setPlatform] = useState<Platform>('other')
  const [step, setStep]         = useState<'ios_1' | 'ios_2' | null>(null)
  const deferredPrompt = useRef<{ prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null)

  useEffect(() => {
    // Never gate the admin panel
    if (pathname.startsWith('/admin')) return
    if (!isMobile() || isStandalone()) return

    const p = detectPlatform()
    setPlatform(p)
    setShow(true)

    // Capture Android install prompt
    function onBeforeInstall(e: Event) {
      e.preventDefault()
      deferredPrompt.current = e as unknown as typeof deferredPrompt.current
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [pathname])

  async function handleAndroidInstall() {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt()
      const { outcome } = await deferredPrompt.current.userChoice
      if (outcome === 'accepted') setShow(false)
      deferredPrompt.current = null
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: '#08080e' }}>
      {/* Top accent */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#7c3aed,#a855f7,#7c3aed)' }} />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        {/* App icon */}
        <div className="mb-6 relative">
          <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl"
            style={{ border: '2px solid rgba(124,58,237,0.4)', boxShadow: '0 0 40px rgba(124,58,237,0.3)' }}>
            <img src="/icon-192.png" alt="Sabula 256" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-emerald-500 flex items-center justify-center text-xs font-black text-white shadow-lg">✓</div>
        </div>

        <h1 className="text-2xl font-black text-white mb-2">Install Sabula 256</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-xs">
          Get the full app experience — faster, offline-ready, and built for your phone. Only takes 5 seconds.
        </p>

        {/* ── iOS instructions ── */}
        {platform === 'ios' && (
          <div className="w-full max-w-xs space-y-4">
            {step === null && (
              <>
                <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d18] p-4 text-left space-y-3">
                  <StepRow n={1} text="Tap the Share button at the bottom of Safari" icon="⬆️" />
                  <div className="h-px bg-[#1e1e2e]" />
                  <StepRow n={2} text='Scroll down and tap "Add to Home Screen"' icon="➕" />
                  <div className="h-px bg-[#1e1e2e]" />
                  <StepRow n={3} text='Tap "Add" — the app opens instantly' icon="✅" />
                </div>
                <button
                  onClick={() => setStep('ios_1')}
                  className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                >
                  Show me how →
                </button>
              </>
            )}
            {step === 'ios_1' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-violet-800/30 bg-[#0d0d14] p-5">
                  <div className="text-4xl mb-3">⬆️</div>
                  <p className="text-white font-bold mb-1">Tap the Share button</p>
                  <p className="text-slate-500 text-xs">In Safari, look for the box with an arrow pointing up at the bottom of the screen.</p>
                </div>
                <button
                  onClick={() => setStep('ios_2')}
                  className="w-full rounded-2xl py-3.5 text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                >
                  Done, next step →
                </button>
              </div>
            )}
            {step === 'ios_2' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-violet-800/30 bg-[#0d0d14] p-5">
                  <div className="text-4xl mb-3">➕</div>
                  <p className="text-white font-bold mb-1">Tap "Add to Home Screen"</p>
                  <p className="text-slate-500 text-xs">Scroll the share sheet until you see "Add to Home Screen", tap it, then tap "Add".</p>
                </div>
                <button
                  onClick={() => setShow(false)}
                  className="w-full rounded-2xl py-3.5 text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}
                >
                  I've installed it — open app ✓
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Android instructions ── */}
        {platform === 'android' && (
          <div className="w-full max-w-xs space-y-3">
            {deferredPrompt.current ? (
              <button
                onClick={handleAndroidInstall}
                className="w-full rounded-2xl py-3.5 text-sm font-black text-white"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
              >
                Install App →
              </button>
            ) : (
              <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d18] p-4 text-left space-y-3">
                <StepRow n={1} text='In Chrome, tap the 3-dot menu (⋮) at the top right' icon="⋮" />
                <div className="h-px bg-[#1e1e2e]" />
                <StepRow n={2} text='"Add to Home Screen" or "Install App"' icon="➕" />
                <div className="h-px bg-[#1e1e2e]" />
                <StepRow n={3} text='Tap "Install" — done!' icon="✅" />
              </div>
            )}
            <button
              onClick={() => setShow(false)}
              className="w-full rounded-2xl py-3 text-sm font-bold text-slate-500 border border-[#1e1e2e] transition-colors hover:border-[#2a2a3e]"
            >
              I&apos;ve installed it ✓
            </button>
          </div>
        )}

        {/* Fallback for other mobile */}
        {platform === 'other' && (
          <div className="w-full max-w-xs space-y-3">
            <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d18] p-4 text-sm text-slate-400">
              Open this page in Chrome or Safari, then use your browser&apos;s menu to &ldquo;Add to Home Screen&rdquo; or &ldquo;Install App&rdquo;.
            </div>
            <button
              onClick={() => setShow(false)}
              className="w-full rounded-2xl py-3 text-sm font-bold text-slate-500 border border-[#1e1e2e]"
            >
              I&apos;ve installed it ✓
            </button>
          </div>
        )}

        {/* Footer trust markers */}
        <div className="mt-10 flex items-center gap-4 text-[11px] text-slate-700">
          <span>🔒 No app store needed</span>
          <span>·</span>
          <span>⚡ Instant install</span>
          <span>·</span>
          <span>📴 Works offline</span>
        </div>
      </div>
    </div>
  )
}

function StepRow({ n, text, icon }: { n: number; text: string; icon: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 mt-0.5"
        style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>
        {n}
      </div>
      <div className="flex-1">
        <span className="text-slate-300 text-xs">{text}</span>
      </div>
      <span className="text-base">{icon}</span>
    </div>
  )
}
