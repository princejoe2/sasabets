'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ID_TYPES = [
  { value: 'national_id',       label: 'National ID'        },
  { value: 'passport',          label: 'Passport'           },
  { value: 'drivers_license',   label: "Driver's Licence"   },
  { value: 'refugee_id',        label: 'Refugee ID'         },
]

export default function KycPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [kycStatus, setKycStatus]   = useState<string>('none')
  const [idType,    setIdType]      = useState('')
  const [idNumber,  setIdNumber]    = useState('')
  const [firstName, setFirstName]   = useState('')
  const [lastName,  setLastName]    = useState('')
  const [loading,   setLoading]     = useState(false)
  const [msg,       setMsg]         = useState<{ text: string; ok: boolean } | null>(null)
  const [loaded,    setLoaded]      = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }
      const { data: p } = await supabase.from('profiles')
        .select('kyc_status, kyc_id_type, kyc_id_number, full_name')
        .eq('id', user.id).single()
      setKycStatus(p?.kyc_status ?? 'none')
      if (p?.kyc_id_type)   setIdType(p.kyc_id_type)
      if (p?.kyc_id_number) setIdNumber(p.kyc_id_number)
      if (p?.full_name) {
        const parts = p.full_name.split(' ')
        setFirstName(parts[0] ?? '')
        setLastName(parts.slice(1).join(' ') ?? '')
      }
      setLoaded(true)
    }
    load()
  }, [])

  async function submit() {
    if (!idType || !idNumber.trim() || !firstName.trim()) {
      setMsg({ text: 'Please fill in all required fields.', ok: false }); return
    }
    setLoading(true); setMsg(null)
    const res = await fetch('/api/kyc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_type: idType, id_number: idNumber.trim(), first_name: firstName.trim(), last_name: lastName.trim() }),
    })
    const d = await res.json()
    if (res.ok) {
      setKycStatus('pending')
      setMsg({ text: "Submitted for review. We'll verify within 24 hours.", ok: true })
    } else {
      setMsg({ text: d.error ?? 'Submission failed.', ok: false })
    }
    setLoading(false)
  }

  if (!loaded) return <div className="flex min-h-screen items-center justify-center"><p className="text-slate-500">Loading…</p></div>

  const STATUS_UI: Record<string, { icon: string; color: string; heading: string; body: string }> = {
    pending:  { icon: '⏳', color: 'text-amber-400',  heading: 'Verification pending',  body: 'Your ID is being reviewed. This usually takes under 24 hours. You can already withdraw up to UGX 500,000 while waiting.' },
    approved: { icon: '✅', color: 'text-emerald-400', heading: 'Identity verified',     body: 'Your account is fully verified. You can withdraw any amount.' },
    rejected: { icon: '❌', color: 'text-red-400',     heading: 'Verification rejected', body: 'Your ID could not be verified. Please re-submit with a clearer ID number or a different document type.' },
  }

  const statusInfo = STATUS_UI[kycStatus]

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-10">
        <div className="mx-auto max-w-xl">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-violet-500">Account verification</p>
          <h1 className="text-3xl font-black text-white">Identity Verification (KYC)</h1>
          <p className="mt-2 text-slate-500">Required for withdrawals above UGX 500,000. Your information is kept strictly confidential.</p>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 py-10 space-y-5">

        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${msg.ok ? 'bg-emerald-900/20 border border-emerald-800/40 text-emerald-400' : 'bg-red-900/20 border border-red-800/40 text-red-400'}`}>
            {msg.text}
          </div>
        )}

        {statusInfo && (
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-5 flex items-start gap-4">
            <span className="text-3xl">{statusInfo.icon}</span>
            <div>
              <p className={`font-bold ${statusInfo.color}`}>{statusInfo.heading}</p>
              <p className="mt-1 text-sm text-slate-400">{statusInfo.body}</p>
            </div>
          </div>
        )}

        {(kycStatus === 'none' || kycStatus === 'rejected') && (
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6 space-y-4">
            <h2 className="font-bold text-slate-200">Submit your ID</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">First Name *</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)}
                  placeholder="e.g. Joel"
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-white outline-none focus:border-violet-600 transition-colors" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Last Name</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)}
                  placeholder="e.g. Lukwago"
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-white outline-none focus:border-violet-600 transition-colors" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Document Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {ID_TYPES.map(t => (
                  <button key={t.value} onClick={() => setIdType(t.value)}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${idType === t.value ? 'border-violet-600 bg-violet-900/30 text-violet-300' : 'border-[#2a2a3e] text-slate-500 hover:border-[#3a3a5e] hover:text-slate-300'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">ID Number *</label>
              <input value={idNumber} onChange={e => setIdNumber(e.target.value)}
                placeholder="Enter your ID number"
                className="w-full rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-white outline-none focus:border-violet-600 transition-colors font-mono" />
            </div>

            <button onClick={submit} disabled={loading}
              className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors">
              {loading ? 'Submitting…' : 'Submit for Verification'}
            </button>

            <p className="text-[11px] text-slate-600 text-center">
              Your ID details are encrypted and only accessed by our compliance team. We comply with Uganda's Data Protection and Privacy Act 2019.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
