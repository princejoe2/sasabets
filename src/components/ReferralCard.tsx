'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ReferralCard() {
  const supabase = createClient()
  const [code, setCode] = useState<string | null>(null)
  const [earnings, setEarnings] = useState(0)
  const [count, setCount] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get or derive referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single()
      const refCode = profile?.referral_code ?? user.id.replace(/-/g, '').slice(0, 8).toUpperCase()
      setCode(refCode)

      // Get earnings from transactions
      const { data: txns } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'referral_bonus')
      if (txns) {
        setCount(txns.length)
        setEarnings(txns.reduce((s, t) => s + Math.abs(Number(t.amount)), 0))
      }
    }
    load()
  }, [])

  if (!code) return null

  const link = `https://sabula256.com/auth?ref=${code}`

  async function copy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(
    `Join Sabula 256 🔮 Uganda's prediction market — win with MTN MoMo! Sign up with my link: ${link}`
  )}`

  return (
    <div id="referral" className="overflow-hidden rounded-2xl border border-[#1e1e2e] bg-[#13131a]">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-200">Earn with referrals</p>
        <h3 className="mt-0.5 text-lg font-black text-white">Invite friends, earn UGX</h3>
        <p className="mt-1 text-sm text-violet-200">You earn a bonus every time your referral bets</p>
      </div>

      {/* Stats */}
      <div className="flex border-b border-[#1e1e2e]">
        <div className="flex-1 px-6 py-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Referrals</p>
          <p className="mt-0.5 text-2xl font-black text-slate-200">{count}</p>
        </div>
        <div className="w-px bg-[#1e1e2e]" />
        <div className="flex-1 px-6 py-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Earned</p>
          <p className="mt-0.5 text-xl font-black text-emerald-400">UGX {earnings.toLocaleString()}</p>
        </div>
      </div>

      {/* Link and actions */}
      <div className="space-y-3 px-6 py-5">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Your Referral Link</p>
          <div className="flex items-center gap-2 rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-3 py-2.5">
            <span className="flex-1 truncate font-mono text-xs text-slate-400">{link}</span>
            <button
              onClick={copy}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-violet-600 text-white hover:bg-violet-500'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Share on WhatsApp
        </a>
        <p className="text-center text-[11px] text-slate-600">
          Share your link. When your friend makes their first deposit, you earn a referral bonus automatically.
        </p>
      </div>
    </div>
  )
}
