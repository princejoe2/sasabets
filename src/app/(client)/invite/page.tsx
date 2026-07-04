import type { Metadata } from 'next'
import ReferralCard from '@/components/ReferralCard'

export const metadata: Metadata = {
  title: 'Invite Friends – Earn UGX on Sabula 256',
  description: 'Invite friends to Sabula 256 and earn a bonus when they make their first deposit.',
}

export default function InvitePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Hero */}
      <div className="border-b border-[#1e1e2e] bg-gradient-to-b from-violet-950/40 to-transparent px-4 py-12">
        <div className="mx-auto max-w-lg text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-400">Referral Programme</p>
          <h1 className="text-4xl font-black text-white">Invite friends.<br/>Earn real UGX.</h1>
          <p className="mt-3 text-slate-400 leading-relaxed">
            Share your link. Every friend who signs up and deposits earns you a bonus — credited straight to your wallet.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-10 space-y-8">
        {/* Referral card */}
        <ReferralCard />

        {/* How it works */}
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6">
          <h2 className="mb-5 text-sm font-bold uppercase tracking-widest text-slate-500">How it works</h2>
          <ol className="space-y-4">
            {[
              { step: '1', title: 'Share your link', desc: 'Copy your unique referral link above and send it on WhatsApp, Telegram, or wherever your friends are.' },
              { step: '2', title: 'Friend signs up', desc: 'They click your link and create an account on Sabula 256 using your referral code.' },
              { step: '3', title: 'You both benefit', desc: 'When they make their first deposit, you automatically receive your referral bonus — no action needed.' },
            ].map(({ step, title, desc }) => (
              <li key={step} className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-900/40 text-sm font-black text-violet-400">
                  {step}
                </div>
                <div>
                  <p className="font-bold text-slate-200">{title}</p>
                  <p className="mt-0.5 text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Terms note */}
        <p className="text-center text-xs text-slate-700 leading-relaxed">
          Referral bonus is credited when your referred friend completes their first deposit.
          Bonus is held in your bonus balance and cannot be withdrawn — it can be used for predictions.
        </p>
      </div>
    </div>
  )
}
