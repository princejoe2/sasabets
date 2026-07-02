'use client'
import { useState, useEffect } from 'react'
import Confetti from './Confetti'

type Props = {
  marketTitle: string
  payout: number
  onClose: () => void
}

export default function WinCelebration({ marketTitle, payout, onClose }: Props) {
  const [show, setShow] = useState(true)

  useEffect(() => {
    // Auto-dismiss after 6 seconds
    const t = setTimeout(() => { setShow(false); onClose() }, 6000)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null

  return (
    <>
      <Confetti />
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
        onClick={() => { setShow(false); onClose() }}
      >
        <div
          className="relative overflow-hidden rounded-3xl bg-white p-8 text-center shadow-2xl dark:bg-slate-900 max-w-sm w-full"
          onClick={e => e.stopPropagation()}
          style={{ animation: 'bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          {/* Trophy */}
          <div className="text-7xl mb-4">🏆</div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">You won!</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 truncate px-4">{marketTitle}</p>
          <div className="mt-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 py-4">
            <p className="text-3xl font-black text-emerald-600">+UGX {payout.toLocaleString()}</p>
            <p className="text-xs text-emerald-500 mt-1">added to your wallet</p>
          </div>
          {/* Share to WhatsApp */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`I just won UGX ${payout.toLocaleString()} on Sabula 256! 🏆 Predict and win on Uganda's #1 prediction market 🔮 sabula256.com`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white hover:opacity-90"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Share your win!
          </a>
          <button
            onClick={() => { setShow(false); onClose() }}
            className="mt-3 text-sm text-slate-400 hover:text-slate-600"
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}
