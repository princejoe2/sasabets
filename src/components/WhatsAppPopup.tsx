'use client'
import { useEffect, useState } from 'react'

const WA_LINK = 'https://chat.whatsapp.com/Lq3eAdbkIi9JA67HTvpX6s?s=cl&p=a&mlu=4'
const STORAGE_KEY = 'wa-popup-dismissed'

export default function WhatsAppPopup() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(STORAGE_KEY)) return
    const t = setTimeout(() => setVisible(true), 2000)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, '1')
  }

  if (!visible) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        onClick={dismiss}
        style={{ animation: 'wa-fade 0.2s ease both' }}
      />

      {/* Centering wrapper — never animated, just positions */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center px-4 pointer-events-none">
        {/* Modal — only this gets the pop animation */}
        <div
          className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
          style={{ animation: 'wa-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          {/* Green header */}
          <div className="relative bg-[#25D366] px-6 py-6 text-center">
            <button
              onClick={dismiss}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/35"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>

            {/* WhatsApp icon */}
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
              <svg viewBox="0 0 24 24" className="h-11 w-11 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12.05.5C5.495.5.5 5.495.5 12.05c0 2.023.52 3.917 1.43 5.565L.5 23.5l6.05-1.41A11.5 11.5 0 0 0 12.05 23.6c6.555 0 11.55-4.995 11.55-11.55C23.6 5.495 18.605.5 12.05.5zm0 21.1a9.532 9.532 0 0 1-4.862-1.325l-.349-.207-3.592.838.878-3.506-.228-.36A9.51 9.51 0 0 1 2.5 12.05c0-5.27 4.28-9.55 9.55-9.55s9.55 4.28 9.55 9.55-4.28 9.55-9.55 9.55z"/>
              </svg>
            </div>

            <h2 className="text-2xl font-black text-white">Join the Community</h2>
            <p className="mt-1 text-sm font-semibold text-white/80">Sabula 256 WhatsApp Group</p>
          </div>

          {/* Body */}
          <div className="px-6 py-7 text-center">
            <p className="text-base leading-relaxed text-slate-600">
              Join our WhatsApp group to get platform updates, be the first to test new features, report issues, and connect with other predictors across Uganda.
            </p>

            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismiss}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-[#25D366] py-4 text-lg font-black text-white transition-all hover:bg-[#1db954] active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12.05.5C5.495.5.5 5.495.5 12.05c0 2.023.52 3.917 1.43 5.565L.5 23.5l6.05-1.41A11.5 11.5 0 0 0 12.05 23.6c6.555 0 11.55-4.995 11.55-11.55C23.6 5.495 18.605.5 12.05.5zm0 21.1a9.532 9.532 0 0 1-4.862-1.325l-.349-.207-3.592.838.878-3.506-.228-.36A9.51 9.51 0 0 1 2.5 12.05c0-5.27 4.28-9.55 9.55-9.55s9.55 4.28 9.55 9.55-4.28 9.55-9.55 9.55z"/>
              </svg>
              Join WhatsApp Group
            </a>

            <button
              onClick={dismiss}
              className="mt-4 w-full py-2.5 text-base font-semibold text-slate-400 transition-colors hover:text-slate-600"
            >
              No thanks, maybe later
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes wa-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes wa-pop {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}
