'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function KYCBanner() {
  const supabase = createClient()
  const [status, setStatus] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('kyc_status').eq('id', user.id).single()
      setStatus(data?.kyc_status ?? 'none')
    }
    check()
    // Check if dismissed this session
    if (sessionStorage.getItem('kyc-banner-dismissed')) setDismissed(true)
  }, [])

  if (dismissed || !status || status === 'approved') return null

  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-950/30">
      <div className="text-2xl">🪪</div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-amber-900 dark:text-amber-200">
          {status === 'pending' ? 'Identity verification in progress' : 'Verify your identity to withdraw'}
        </p>
        <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300">
          {status === 'pending'
            ? 'Your documents are under review. This usually takes 1-2 business days.'
            : 'Required before withdrawing funds above UGX 5,000,000.'}
        </p>
      </div>
      {status !== 'pending' && (
        <Link
          href="/kyc"
          className="shrink-0 rounded-xl bg-amber-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-amber-500"
        >
          Verify now
        </Link>
      )}
      <button
        onClick={() => { setDismissed(true); sessionStorage.setItem('kyc-banner-dismissed', '1') }}
        className="shrink-0 text-amber-400 hover:text-amber-600"
        aria-label="Dismiss"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  )
}
