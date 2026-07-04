export const metadata = {
  title: 'Terms & Conditions — Sabula 256',
  description: 'Sabula 256 Terms and Conditions governing use of the platform.',
}

const EFFECTIVE = '21 June 2026'
const CONTACT_EMAIL = 'support@sabula256.com'
const CONTACT_PHONE = '+256 783 033 457'
const COMPANY = 'Sabula 256'
const MIN_AGE = 18
const RAKE = 8

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-500">Legal</p>
          <h1 className="text-4xl font-black text-white">Terms &amp; Conditions</h1>
          <p className="mt-3 text-slate-500">Effective date: {EFFECTIVE}</p>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="prose-legal space-y-10 text-slate-300">

          {/* Intro */}
          <section>
            <p className="leading-relaxed text-slate-400">
              Please read these Terms and Conditions (&ldquo;Terms&rdquo;) carefully before using the {COMPANY}{' '}
              platform (the &ldquo;Platform&rdquo;). By creating an account or placing any prediction on the Platform,
              you confirm that you have read, understood, and agree to be bound by these Terms and our{' '}
              <a href="/privacy" className="text-violet-400 hover:text-violet-300 underline">Privacy Policy</a>.
              If you do not agree, you must not use the Platform. These Terms constitute a legally binding agreement
              between you and {COMPANY}.
            </p>
          </section>

          <Divider />

          {/* 1 */}
          <section>
            <H2 n="1">Definitions</H2>
            <dl className="mt-4 space-y-3 text-sm leading-relaxed text-slate-400">
              <div><dt className="inline font-bold text-slate-300">&ldquo;Platform&rdquo;</dt><dd className="inline"> — the {COMPANY} website, mobile web app, and any associated APIs.</dd></div>
              <div><dt className="inline font-bold text-slate-300">&ldquo;User&rdquo; / &ldquo;you&rdquo;</dt><dd className="inline"> — any individual who registers for or uses the Platform.</dd></div>
              <div><dt className="inline font-bold text-slate-300">&ldquo;Market&rdquo;</dt><dd className="inline"> — a prediction event published on the Platform with one or more possible outcomes and a defined closing time.</dd></div>
              <div><dt className="inline font-bold text-slate-300">&ldquo;Stake&rdquo;</dt><dd className="inline"> — funds placed by a User on a specific outcome of a Market.</dd></div>
              <div><dt className="inline font-bold text-slate-300">&ldquo;Pool&rdquo;</dt><dd className="inline"> — the total amount staked on a Market by all Users.</dd></div>
              <div><dt className="inline font-bold text-slate-300">&ldquo;Platform Fee&rdquo;</dt><dd className="inline"> — the service fee deducted from qualifying Pools before distribution to winning predictors, as specified in Section 9.</dd></div>
              <div><dt className="inline font-bold text-slate-300">&ldquo;Wallet&rdquo;</dt><dd className="inline"> — the in-platform UGX balance held on your account.</dd></div>
              <div><dt className="inline font-bold text-slate-300">&ldquo;Mobile Money&rdquo;</dt><dd className="inline"> — MTN Mobile Money or Airtel Money services used for deposits and withdrawals.</dd></div>
              <div><dt className="inline font-bold text-slate-300">&ldquo;MarzPay&rdquo;</dt><dd className="inline"> — our third-party payment processor that facilitates Mobile Money collections and disbursements on our behalf.</dd></div>
            </dl>
          </section>

          <Divider />

          {/* 2 */}
          <section>
            <H2 n="2">Eligibility</H2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li>You must be at least {MIN_AGE} years of age to register or use the Platform. By creating an account you represent and warrant that you are {MIN_AGE} years of age or older.</li>
              <li>The Platform is intended for users located in Uganda and East Africa. It is your responsibility to ensure that using the Platform is lawful in your jurisdiction.</li>
              <li>Employees, directors, agents of {COMPANY}, and their immediate family members are not permitted to place predictions on the Platform.</li>
              <li>You may only hold one (1) account. Duplicate accounts will be suspended and balances may be forfeited.</li>
              <li>Persons who have self-excluded or been excluded by {COMPANY} are not permitted to register or use the Platform.</li>
              <li>You must not access the Platform from a location where it is restricted, nor use a VPN, proxy, or other tool to misrepresent your location or circumvent geographic restrictions.</li>
            </ol>
          </section>

          <Divider />

          {/* 3 */}
          <section>
            <H2 n="3">Account Registration &amp; Security</H2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li>You register using your Ugandan mobile number. A one-time password (OTP) is sent via SMS to verify your identity. You must provide a valid phone number that you own and control.</li>
              <li>You are responsible for maintaining the confidentiality of your account and any OTP codes sent to you. Do not share OTP codes with any third party.</li>
              <li>You must notify us immediately at {CONTACT_EMAIL} if you suspect unauthorised access to your account.</li>
              <li>{COMPANY} reserves the right to suspend or terminate accounts found to be involved in fraudulent activity, abuse, or violations of these Terms.</li>
              <li>You must not use bots, scripts, or automated tools to interact with the Platform.</li>
            </ol>
          </section>

          <Divider />

          {/* 4 */}
          <section>
            <H2 n="4">Deposits</H2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li>Deposits are made in Ugandan Shillings (UGX) via MTN Mobile Money or Airtel Money, processed through our payment partner MarzPay.</li>
              <li>When you initiate a deposit, a Mobile Money payment prompt will be pushed to your registered phone number. You must approve the prompt on your handset.</li>
              <li>Deposits are credited to your Wallet only after MarzPay confirms successful collection. This typically occurs within minutes but may take longer depending on network conditions.</li>
              <li>Minimum deposit: UGX 1,000. Maximum deposit limits may apply as communicated on the Platform from time to time.</li>
              <li>{COMPANY} does not charge fees for deposits; however, your Mobile Money provider may apply standard transaction charges.</li>
              <li>All funds on the Platform are held in UGX. {COMPANY} does not accept foreign currencies.</li>
              <li>Deposits are final. If a deposit fails or is disputed, contact us at {CONTACT_EMAIL} with the transaction reference.</li>
            </ol>
          </section>

          <Divider />

          {/* 5 */}
          <section>
            <H2 n="5">Withdrawals</H2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li>Withdrawals are paid to the MTN Mobile Money or Airtel Money number registered to your account via MarzPay.</li>
              <li>You may only withdraw to your own registered Mobile Money number. Withdrawal to third-party numbers is not permitted.</li>
              <li>Minimum withdrawal: UGX 1,000. Withdrawals are processed during business hours and are typically completed within 24 hours, subject to MarzPay processing times and network availability.</li>
              <li>{COMPANY} does not charge a platform fee for withdrawals. Standard Mobile Money provider charges may apply.</li>
              <li>Withdrawals may be delayed or held pending identity verification or fraud review. We will notify you if this applies.</li>
              <li>If a withdrawal is returned or fails (e.g. due to an inactive Mobile Money account), the funds will be returned to your Wallet within 48 hours.</li>
              <li>By requesting a withdrawal, you authorise {COMPANY} and MarzPay to disburse the requested amount to your registered Mobile Money number.</li>
            </ol>
          </section>

          <Divider />

          {/* 6 */}
          <section>
            <H2 n="6">How Markets &amp; Predictions Work</H2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li><strong className="text-slate-300">Parimutuel model.</strong> {COMPANY} operates a parimutuel (pool-based) prediction system. All stakes on a Market are pooled together. There is no fixed odds house betting. Your payout depends on the total pool size and how many other Users picked the winning outcome.</li>
              <li><strong className="text-slate-300">Platform fee.</strong> A platform fee may be deducted from the total Pool before distribution, as described in Section 9. The remainder is distributed proportionally among all Users who picked the correct outcome, based on the amount they staked.</li>
              <li><strong className="text-slate-300">Estimated payout.</strong> Any payout estimate displayed before a Market closes is indicative only. The final payout is calculated at settlement based on the final Pool size.</li>
              <li><strong className="text-slate-300">Closing time.</strong> Predictions must be placed before the Market&apos;s stated closing time. Stakes placed after a Market closes will be rejected and refunded to your Wallet.</li>
              <li><strong className="text-slate-300">Settlement.</strong> Markets are settled by {COMPANY} administrators after the real-world outcome is confirmed from official, publicly verifiable sources. Settlement may take up to 72 hours after the event concludes.</li>
              <li><strong className="text-slate-300">Settlement disputes.</strong> If you believe a market has been settled incorrectly, you must submit a dispute within 7 days of settlement by emailing {CONTACT_EMAIL} with your evidence. {COMPANY}&apos;s decision on settlement is final, subject to Section 16 (Dispute Resolution).</li>
              <li><strong className="text-slate-300">Void markets.</strong> {COMPANY} reserves the right to void a Market, in whole or in part, where any of the following occurs: (a) the underlying event is cancelled; (b) the event is postponed by more than thirty (30) days from its originally scheduled date; (c) the event is abandoned before reaching its natural conclusion; (d) the outcome cannot be verified from at least two (2) independent, reputable sources; (e) there is clear evidence of fixing, manipulation, or fraud affecting the event or the Market; or (f) the Market was published in error or with materially incorrect terms. Where a Market is voided, all stakes on the voided Market are refunded to participants&apos; Wallets and no Platform Fee is retained on the voided Pool.</li>
              <li><strong className="text-slate-300">No guaranteed returns.</strong> Predicting on the Platform involves risk. You may lose some or all of your staked amount. Past performance of a market or outcome is not indicative of future results.</li>
            </ol>
          </section>

          <Divider />

          {/* 7 */}
          <section>
            <H2 n="7">Prohibited Conduct</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">You must not:</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-400">
              <li>Use the Platform if you are under {MIN_AGE} years of age.</li>
              <li>Attempt to manipulate, fix, or influence the outcome of any Market event.</li>
              <li>Engage in market manipulation, including coordinated or collusive staking designed to distort a Pool, mislead other Users, or artificially influence payouts.</li>
              <li>Collude with one or more other Users, whether on or off the Platform, to gain an unfair advantage, share insider information, or coordinate stakes across multiple accounts.</li>
              <li>Use insider information relating to an event when placing predictions.</li>
              <li>Create multiple accounts to circumvent limits, bonuses, or restrictions.</li>
              <li>Use a VPN, proxy, the Tor network, or any other tool or technique to disguise your location or circumvent geographic restrictions on the Platform.</li>
              <li>Use the Platform to launder money or conduct any financial crime.</li>
              <li>Use automated bots, scripts, or tools to interact with the Platform.</li>
              <li>Exploit bugs, errors, or system malfunctions for financial gain. Any winnings derived from a bug must be reported and will be reversed.</li>
              <li>Share your account, OTP codes, or login credentials with any other person.</li>
              <li>Attempt to reverse-engineer, decompile, or attack the Platform infrastructure.</li>
              <li>Harass, threaten, or abuse {COMPANY} staff or other Users.</li>
            </ol>
            <p className="mt-4 text-sm text-slate-400">
              Violation of these prohibitions may result in immediate account suspension, forfeiture of balances, reversal of affected stakes and payouts, and referral to law enforcement authorities.
            </p>
          </section>

          <Divider />

          {/* 8 */}
          <section>
            <H2 n="8">Responsible Gambling</H2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li>Predicting on {COMPANY} should be a form of entertainment. Never stake more than you can afford to lose.</li>
              <li><strong className="text-slate-300">Deposit limits.</strong> You may set daily, weekly, or monthly deposit limits from your account settings. Once set, a reduction takes effect immediately, while an increase or removal of a limit is subject to a cooling-off delay before it takes effect.</li>
              <li><strong className="text-slate-300">Cooling-off periods.</strong> You may activate a temporary cooling-off period during which you will be unable to place stakes or deposit funds. You may continue to withdraw any available balance during this period.</li>
              <li><strong className="text-slate-300">Reality checks.</strong> The Platform provides reality-check reminders that display the time spent and amounts staked during your session, to help you stay in control.</li>
              <li>If you feel that your use of the Platform is becoming harmful, you may request a self-exclusion by contacting us at {CONTACT_EMAIL}. We will process self-exclusion requests within 24 hours.</li>
              <li>Once self-excluded, you may not circumvent this restriction by creating a new account. Any such account will be closed and funds returned.</li>
              <li>Resources: National Council on Problem Gambling Uganda — if you need help with gambling-related issues, please seek professional support.</li>
            </ol>
          </section>

          <Divider />

          {/* 9 */}
          <section>
            <H2 n="9">Platform Fee &amp; Taxes</H2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li>A Platform Fee may be charged on the total Pool of certain settled Markets and is deducted before payouts are calculated. The Platform Fee, where applicable, is non-refundable. {COMPANY} reserves the right to adjust the Platform Fee from time to time; any change will be communicated via a notice on the Platform.</li>
              <li>You are solely responsible for any taxes applicable to your winnings under the laws of Uganda or your country of residence. {COMPANY} does not provide tax advice.</li>
              <li>Where required by Ugandan law, {COMPANY} may withhold tax from winnings and remit to the Uganda Revenue Authority.</li>
            </ol>
          </section>

          <Divider />

          {/* 10 */}
          <section>
            <H2 n="10">Intellectual Property</H2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li>All content on the Platform, including the name &ldquo;Sabula 256&rdquo;, the logo, market data, design, and software, is owned by or licensed to {COMPANY} and is protected by copyright and other intellectual property laws.</li>
              <li>You are granted a limited, non-exclusive, non-transferable licence to access and use the Platform for personal, non-commercial purposes only.</li>
              <li>You must not copy, reproduce, distribute, or create derivative works from Platform content without our prior written consent.</li>
              <li><strong className="text-slate-300">User-submitted market proposals.</strong> If you submit a proposal, suggestion, or idea for a Market, the underlying idea remains yours. However, by submitting it you grant {COMPANY} a perpetual, irrevocable, worldwide, royalty-free, non-exclusive licence to use, reproduce, adapt, publish, and commercialise that proposal in connection with the Platform, without any obligation to compensate, credit, or notify you, and you waive any claim arising from our use of substantially similar markets independently developed by us or proposed by others.</li>
            </ol>
          </section>

          <Divider />

          {/* 11 */}
          <section>
            <H2 n="11">Third-Party Services</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              The Platform integrates with the following third-party services. Your use of these services is also governed by their respective terms and policies:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-400">
              <li><strong className="text-slate-300">MarzPay</strong> — our primary Mobile Money payment processor for both deposits and withdrawals. By using the Platform&apos;s payment features you also agree to MarzPay&apos;s applicable usage terms.</li>
              <li><strong className="text-slate-300">Supabase</strong> — Cloud database and authentication infrastructure.</li>
            </ul>
            <p className="mt-4 text-sm text-slate-400">
              {COMPANY} is not responsible for the availability, reliability, or actions of these third-party providers.
            </p>
          </section>

          <Divider />

          {/* 12 */}
          <section>
            <H2 n="12">Force Majeure</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              {COMPANY} shall not be liable for any failure or delay in performing its obligations under these Terms where such failure or delay results from causes beyond our reasonable control. These include, without limitation: outages, disruptions, or failures of MTN Mobile Money, Airtel Money, MarzPay, or any Mobile Money or payment network; internet shutdowns, throttling, or interruptions to telecommunications or connectivity; government action, directive, regulation, sanction, or order, including any suspension or restriction of internet or financial services; acts of God, natural disasters, fire, flood, epidemic, or pandemic; war, terrorism, civil unrest, or strikes; and failures of power, hosting, or third-party infrastructure.
            </p>
            <p className="mt-4 text-sm text-slate-400">
              During a force majeure event, settlement, deposits, withdrawals, and other functions may be delayed or suspended. We will use reasonable efforts to restore normal operation and to protect User balances, but we are not liable for losses arising from such events.
            </p>
          </section>

          <Divider />

          {/* 13 */}
          <section>
            <H2 n="13">Disclaimer of Warranties</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              The Platform is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or uninterrupted availability.
              {COMPANY} does not warrant that the Platform will be error-free or that defects will be corrected.
            </p>
          </section>

          <Divider />

          {/* 14 */}
          <section>
            <H2 n="14">Limitation of Liability</H2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li>To the maximum extent permitted by Ugandan law, {COMPANY} shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Platform.</li>
              <li>{COMPANY}&apos;s total aggregate liability to you for any claim arising from your use of the Platform shall not exceed the amount you deposited in the 30 days preceding the event giving rise to the claim.</li>
              <li>{COMPANY} is not liable for losses resulting from: (a) Mobile Money network outages; (b) MarzPay service failures; (c) your failure to comply with these Terms; (d) unauthorised access to your account caused by your negligence; (e) any force majeure event described in Section 12.</li>
              <li>Nothing in these Terms limits our liability for fraud, death, or personal injury caused by our negligence.</li>
            </ol>
          </section>

          <Divider />

          {/* 15 */}
          <section>
            <H2 n="15">Account Termination &amp; Suspension</H2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li>You may close your account at any time by contacting {CONTACT_EMAIL}. Any positive Wallet balance will be paid to your registered Mobile Money number within 5 business days.</li>
              <li>{COMPANY} may suspend or terminate your account without notice if you breach these Terms, if we are required to do so by law, or if we reasonably suspect fraud or money laundering.</li>
              <li>On termination by either party, any pending stakes will be settled according to normal procedures and any remaining balance will be refunded, less any amounts owed to {COMPANY}.</li>
            </ol>
          </section>

          <Divider />

          {/* 16 */}
          <section>
            <H2 n="16">Dispute Resolution</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Before commencing any litigation, you agree to follow the three-step process below. This process is a precondition to court proceedings, except where urgent injunctive relief is required.
            </p>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li><strong className="text-slate-300">Step 1 — Contact support.</strong> You must first raise the dispute in writing with our support team at {CONTACT_EMAIL}, setting out the nature of the dispute, the relevant transaction or market references, and the resolution you are seeking. We will acknowledge your dispute and work with you to resolve it.</li>
              <li><strong className="text-slate-300">Step 2 — Good-faith negotiation.</strong> If support cannot resolve the matter, both parties agree to engage in good-faith negotiation for a period of thirty (30) days from the date the dispute is first escalated, with a view to reaching an amicable settlement.</li>
              <li><strong className="text-slate-300">Step 3 — Binding arbitration.</strong> If the dispute remains unresolved after the 30-day negotiation period, it shall be referred to and finally resolved by binding arbitration seated in Kampala, Uganda, conducted in English by a single arbitrator appointed in accordance with the Arbitration and Conciliation Act of Uganda. The arbitrator&apos;s award shall be final and binding on both parties. Only after this arbitration process is exhausted may either party commence litigation.</li>
            </ol>
          </section>

          <Divider />

          {/* 17 */}
          <section>
            <H2 n="17">Governing Law &amp; Jurisdiction</H2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li>These Terms are governed by and construed in accordance with the laws of the Republic of Uganda.</li>
              <li>Subject to the Dispute Resolution process in Section 16, the courts of competent jurisdiction in Kampala, Uganda shall have exclusive jurisdiction over any matter not finally resolved by arbitration.</li>
            </ol>
          </section>

          <Divider />

          {/* 18 */}
          <section>
            <H2 n="18">Changes to These Terms</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              {COMPANY} may update these Terms from time to time. We will notify you of material changes by SMS or a notice on the Platform at least 7 days before they take effect. Your continued use of the Platform after the effective date constitutes acceptance of the revised Terms. If you do not agree, you must stop using the Platform and close your account.
            </p>
          </section>

          <Divider />

          {/* 19 */}
          <section>
            <H2 n="19">Contact Us</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              For questions, complaints, or support:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-400">
              <li>Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:text-violet-300">{CONTACT_EMAIL}</a></li>
              <li>Phone: {CONTACT_PHONE}</li>
              <li>Kampala, Uganda</li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  )
}

function H2({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h2 className="flex items-baseline gap-3 text-xl font-black text-white">
      <span className="font-mono text-sm font-bold text-violet-500">{n}.</span>
      {children}
    </h2>
  )
}

function Divider() {
  return <hr className="border-[#1e1e2e]" />
}
