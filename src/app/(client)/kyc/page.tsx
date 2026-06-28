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

type Step = { label: string; description: string; index: number }

const STEPS: Step[] = [
  { index: 0, label: 'Personal Details', description: 'Provide your name and ID information' },
  { index: 1, label: 'Under Review',     description: 'Our team verifies your submission'    },
  { index: 2, label: 'Verified',         description: 'Full withdrawal access unlocked'      },
]

function getActiveStep(status: string) {
  if (status === 'approved') return 2
  if (status === 'pending')  return 1
  return 0
}

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

  const activeStep = getActiveStep(kycStatus)

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-10">
        <div className="mx-auto max-w-xl">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-violet-500">Account verification</p>
          <h1 className="text-3xl font-black text-white">Identity Verification (KYC)</h1>
          <p className="mt-2 text-slate-500">Required for withdrawals above UGX 5,000,000. Your information is kept strictly confidential.</p>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 py-10 space-y-6">

        {/* Progress Stepper */}
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6">
          <div className="flex items-start gap-0">
            {STEPS.map((step, idx) => {
              const done    = activeStep > idx
              const current = activeStep === idx
              return (
                <div key={step.index} className="flex flex-1 flex-col items-center relative">
                  {/* connector line */}
                  {idx < STEPS.length - 1 && (
                    <div className={`absolute top-4 left-1/2 w-full h-0.5 ${done ? 'bg-emerald-500' : 'bg-[#2a2a3e]'}`} />
                  )}
                  {/* circle */}
                  <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                    done    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : current ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                    : 'border-[#2a2a3e] bg-[#0a0a0f] text-slate-600'
                  }`}>
                    {done ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  {/* label */}
                  <div className="mt-2 text-center px-1">
                    <p className={`text-xs font-semibold leading-tight ${
                      done    ? 'text-emerald-400'
                      : current ? 'text-amber-400'
                      : 'text-slate-600'
                    }`}>{step.label}</p>
                    <p className="mt-0.5 text-[10px] text-slate-600 leading-tight hidden sm:block">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Feedback message */}
        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${msg.ok ? 'bg-emerald-900/20 border border-emerald-800/40 text-emerald-400' : 'bg-red-900/20 border border-red-800/40 text-red-400'}`}>
            {msg.text}
          </div>
        )}

        {/* Status card: Approved */}
        {kycStatus === 'approved' && (
          <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/30 p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xl font-black text-emerald-400">Identity Verified</p>
            <p className="mt-2 text-sm text-slate-400">Your account is fully verified. You can withdraw any amount to your Mobile Money.</p>
          </div>
        )}

        {/* Status card: Pending */}
        {kycStatus === 'pending' && (
          <div className="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                <svg className="h-6 w-6 text-amber-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-amber-400">Documents under review</p>
                <p className="mt-1 text-sm text-slate-400">Your ID is being reviewed by our compliance team. This usually takes 1-2 business days.</p>
                <p className="mt-2 text-xs text-slate-500">You can already withdraw up to UGX 5,000,000 while waiting.</p>
              </div>
            </div>
          </div>
        )}

        {/* Status card: Rejected */}
        {kycStatus === 'rejected' && (
          <div className="rounded-2xl border border-red-800/40 bg-red-950/20 p-5 flex items-start gap-4">
            <span className="text-2xl">❌</span>
            <div>
              <p className="font-bold text-red-400">Verification rejected</p>
              <p className="mt-1 text-sm text-slate-400">Your ID could not be verified. Please re-submit with a clearer ID number or a different document type.</p>
            </div>
          </div>
        )}

        {/* Submission form: shown for none or rejected */}
        {(kycStatus === 'none' || kycStatus === 'rejected') && (
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6 space-y-5">
            <div>
              <h2 className="font-bold text-slate-200">Submit your ID</h2>
              <p className="mt-1 text-xs text-slate-500">Accepted documents: National ID, Passport, Driver&apos;s Licence, Refugee ID</p>
            </div>

            {/* Name fields */}
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

            {/* Document type selector */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Document Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {ID_TYPES.map(t => (
                  <button key={t.value} onClick={() => setIdType(t.value)}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${idType === t.value ? 'border-amber-500 bg-amber-900/20 text-amber-300' : 'border-[#2a2a3e] text-slate-500 hover:border-[#3a3a5e] hover:text-slate-300'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ID Number */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">ID Number *</label>
              <input value={idNumber} onChange={e => setIdNumber(e.target.value)}
                placeholder="Enter your ID number"
                className="w-full rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3 text-sm text-white outline-none focus:border-violet-600 transition-colors font-mono" />
            </div>

            {/* What happens next */}
            <div className="rounded-xl border border-[#1e1e2e] bg-[#0a0a0f] px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-slate-400">What happens next?</p>
              {[
                'We verify your details against the national registry',
                'Approval usually takes under 24 hours',
                'You get full withdrawal access once approved',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-500">
                  <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full bg-amber-900/40 text-amber-500 flex items-center justify-center text-[9px] font-bold">{i + 1}</span>
                  {item}
                </div>
              ))}
            </div>

            <button onClick={submit} disabled={loading}
              className="w-full rounded-xl bg-amber-600 py-3 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50 transition-colors">
              {loading ? 'Submitting…' : 'Submit for Verification'}
            </button>

            <p className="text-[11px] text-slate-600 text-center">
              Your ID details are encrypted and only accessed by our compliance team. We comply with Uganda&apos;s Data Protection and Privacy Act 2019.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
