export const metadata = {
  title: 'Terms & Conditions — Sabula 256',
  description: 'Sabula 256 Terms and Conditions governing use of the platform.',
}

const EFFECTIVE = '19 June 2026'
const CONTACT_EMAIL = 'joelukwago1@gmail.com'
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
              If you do not agree, you must not use the Platform.
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
              <div><dt className="inline font-bold text-slate-300">&ldquo;Platform Fee&rdquo;</dt><dd className="inline"> — the {RAKE}% deducted from the Pool before distribution to winning predictors.</dd></div>
              <div><dt className="inline font-bold text-slate-300">&ldquo;Wallet&rdquo;</dt><dd className="inline"> — the in-platform UGX balance held on your account.</dd></div>
              <div><dt className="inline font-bold text-slate-300">&ldquo;Mobile Money&rdquo;</dt><dd className="inline"> — MTN Mobile Money or Airtel Money services used for deposits and withdrawals.</dd></div>
              <div><dt className="inline font-bold text-slate-300">&ldquo;Relworx&rdquo;</dt><dd className="inline"> — our third-party payment processor (Relworx Ltd) that facilitates Mobile Money disbursements and collections on our behalf.</dd></div>
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
              <li>Deposits are made in Ugandan Shillings (UGX) via MTN Mobile Money or Airtel Money, processed through our payment partner Relworx.</li>
              <li>When you initiate a deposit, a Mobile Money payment prompt will be pushed to your registered phone number. You must approve the prompt on your handset.</li>
              <li>Deposits are credited to your Wallet only after Relworx confirms successful collection. This typically occurs within minutes but may take longer depending on network conditions.</li>
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
              <li>Withdrawals are paid to the MTN Mobile Money or Airtel Money number registered to your account via Relworx.</li>
              <li>You may only withdraw to your own registered Mobile Money number. Withdrawal to third-party numbers is not permitted.</li>
              <li>Minimum withdrawal: UGX 1,000. Withdrawals are processed during business hours and are typically completed within 24 hours, subject to Relworx processing times and network availability.</li>
              <li>{COMPANY} does not charge a platform fee for withdrawals. Standard Mobile Money provider charges may apply.</li>
              <li>Withdrawals may be delayed or held pending identity verification or fraud review. We will notify you if this applies.</li>
              <li>If a withdrawal is returned or fails (e.g. due to an inactive Mobile Money account), the funds will be returned to your Wallet within 48 hours.</li>
              <li>By requesting a withdrawal, you authorise {COMPANY} and Relworx to disburse the requested amount to your registered Mobile Money number.</li>
            </ol>
          </section>

          <Divider />

          {/* 6 */}
          <section>
            <H2 n="6">How Markets &amp; Predictions Work</H2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li><strong className="text-slate-300">Parimutuel model.</strong> {COMPANY} operates a parimutuel (pool-based) prediction system. All stakes on a Market are pooled together. There is no fixed odds house betting. Your payout depends on the total pool size and how many other Users picked the winning outcome.</li>
              <li><strong className="text-slate-300">Platform fee.</strong> A {RAKE}% fee is deducted from the total Pool before distribution. The remaining {100 - RAKE}% is distributed proportionally among all Users who picked the correct outcome, based on the amount they staked.</li>
              <li><strong className="text-slate-300">Estimated payout.</strong> Any payout estimate displayed before a Market closes is indicative only. The final payout is calculated at settlement based on the final Pool size.</li>
              <li><strong className="text-slate-300">Closing time.</strong> Predictions must be placed before the Market&apos;s stated closing time. Stakes placed after a Market closes will be rejected and refunded to your Wallet.</li>
              <li><strong className="text-slate-300">Settlement.</strong> Markets are settled by {COMPANY} administrators after the real-world outcome is confirmed from official, publicly verifiable sources. Settlement may take up to 72 hours after the event concludes.</li>
              <li><strong className="text-slate-300">Settlement disputes.</strong> If you believe a market has been settled incorrectly, you must submit a dispute within 7 days of settlement by emailing {CONTACT_EMAIL} with your evidence. {COMPANY}&apos;s decision on settlement is final.</li>
              <li><strong className="text-slate-300">Void markets.</strong> {COMPANY} reserves the right to void a Market if the event is cancelled, postponed indefinitely, or if data integrity cannot be confirmed. All stakes on a voided Market are refunded to participants&apos; Wallets.</li>
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
              <li>Use insider information relating to an event when placing predictions.</li>
              <li>Create multiple accounts to circumvent limits, bonuses, or restrictions.</li>
              <li>Use the Platform to launder money or conduct any financial crime.</li>
              <li>Use automated bots, scripts, or tools to interact with the Platform.</li>
              <li>Exploit bugs, errors, or system malfunctions for financial gain. Any winnings derived from a bug must be reported and will be reversed.</li>
              <li>Share your account, OTP codes, or login credentials with any other person.</li>
              <li>Attempt to reverse-engineer, decompile, or attack the Platform infrastructure.</li>
              <li>Harass, threaten, or abuse {COMPANY} staff or other Users.</li>
            </ol>
            <p className="mt-4 text-sm text-slate-400">
              Violation of these prohibitions may result in immediate account suspension, forfeiture of balances, and referral to law enforcement authorities.
            </p>
          </section>

          <Divider />

          {/* 8 */}
          <section>
            <H2 n="8">Responsible Gambling</H2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li>Predicting on {COMPANY} should be a form of entertainment. Never stake more than you can afford to lose.</li>
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
              <li>The Platform Fee of {RAKE}% is charged on the total Pool of each settled Market and is deducted before payouts are calculated. This is non-refundable.</li>
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
              <li><strong className="text-slate-300">Relworx</strong> — Mobile Money payment processing (deposits &amp; withdrawals). By using the Platform&apos;s payment features you also agree to Relworx&apos;s applicable usage terms.</li>
              <li><strong className="text-slate-300">Pesapal</strong> — Additional payment facilitation where applicable.</li>
              <li><strong className="text-slate-300">Twilio</strong> — SMS OTP delivery for authentication.</li>
              <li><strong className="text-slate-300">Supabase</strong> — Cloud database and authentication infrastructure.</li>
            </ul>
            <p className="mt-4 text-sm text-slate-400">
              {COMPANY} is not responsible for the availability, reliability, or actions of these third-party providers.
            </p>
          </section>

          <Divider />

          {/* 12 */}
          <section>
            <H2 n="12">Disclaimer of Warranties</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              The Platform is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or uninterrupted availability.
              {COMPANY} does not warrant that the Platform will be error-free or that defects will be corrected.
            </p>
          </section>

          <Divider />

          {/* 13 */}
          <section>
            <H2 n="13">Limitation of Liability</H2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li>To the maximum extent permitted by Ugandan law, {COMPANY} shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Platform.</li>
              <li>{COMPANY}&apos;s total aggregate liability to you for any claim arising from your use of the Platform shall not exceed the amount you deposited in the 30 days preceding the event giving rise to the claim.</li>
              <li>{COMPANY} is not liable for losses resulting from: (a) Mobile Money network outages; (b) Relworx or Pesapal service failures; (c) your failure to comply with these Terms; (d) unauthorised access to your account caused by your negligence.</li>
              <li>Nothing in these Terms limits our liability for fraud, death, or personal injury caused by our negligence.</li>
            </ol>
          </section>

          <Divider />

          {/* 14 */}
          <section>
            <H2 n="14">Account Termination &amp; Suspension</H2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li>You may close your account at any time by contacting {CONTACT_EMAIL}. Any positive Wallet balance will be paid to your registered Mobile Money number within 5 business days.</li>
              <li>{COMPANY} may suspend or terminate your account without notice if you breach these Terms, if we are required to do so by law, or if we reasonably suspect fraud or money laundering.</li>
              <li>On termination by either party, any pending stakes will be settled according to normal procedures and any remaining balance will be refunded, less any amounts owed to {COMPANY}.</li>
            </ol>
          </section>

          <Divider />

          {/* 15 */}
          <section>
            <H2 n="15">Governing Law &amp; Disputes</H2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li>These Terms are governed by and construed in accordance with the laws of the Republic of Uganda.</li>
              <li>Any dispute arising from these Terms or your use of the Platform shall first be attempted to be resolved through good-faith negotiation. Contact us at {CONTACT_EMAIL}.</li>
              <li>If a dispute cannot be resolved amicably within 30 days, it shall be referred to the courts of competent jurisdiction in Kampala, Uganda.</li>
            </ol>
          </section>

          <Divider />

          {/* 16 */}
          <section>
            <H2 n="16">Changes to These Terms</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              {COMPANY} may update these Terms from time to time. We will notify you of material changes by SMS or a notice on the Platform at least 7 days before they take effect. Your continued use of the Platform after the effective date constitutes acceptance of the revised Terms. If you do not agree, you must stop using the Platform and close your account.
            </p>
          </section>

          <Divider />

          {/* 17 */}
          <section>
            <H2 n="17">Contact Us</H2>
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
