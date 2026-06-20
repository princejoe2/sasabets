export const metadata = {
  title: 'Privacy Policy — Sabula 256',
  description: 'Sabula 256 Privacy Policy — how we collect, use, and protect your personal data.',
}

const EFFECTIVE = '19 June 2026'
const CONTACT_EMAIL = 'joelukwago1@gmail.com'
const COMPANY = 'Sabula 256'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-500">Legal</p>
          <h1 className="text-4xl font-black text-white">Privacy Policy</h1>
          <p className="mt-3 text-slate-500">Effective date: {EFFECTIVE}</p>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="space-y-10 text-slate-300">

          {/* Intro */}
          <section>
            <p className="text-sm leading-relaxed text-slate-400">
              {COMPANY} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is committed to protecting your personal
              data. This Privacy Policy explains what information we collect when you use the Platform, why we collect it,
              how we use and share it, and your rights under the <strong className="text-slate-300">Uganda Data Protection
              and Privacy Act, 2019 (&ldquo;DPPA&rdquo;)</strong>.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              By using the Platform you consent to the practices described in this Policy. If you do not agree, please
              stop using the Platform and contact us to close your account.
            </p>
          </section>

          <Divider />

          {/* 1 */}
          <section>
            <H2 n="1">Who We Are (Data Controller)</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              {COMPANY} is the data controller responsible for your personal data. Our contact details are:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-400">
              <li>Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:text-violet-300">{CONTACT_EMAIL}</a></li>
              <li>Location: Kampala, Uganda</li>
            </ul>
          </section>

          <Divider />

          {/* 2 */}
          <section>
            <H2 n="2">What Personal Data We Collect</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              We collect the following categories of personal data:
            </p>

            <SubH>2.1 Account &amp; Identity Data</SubH>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-400">
              <li>Mobile phone number (used as your unique identifier and for OTP authentication)</li>
              <li>Account creation date and last login timestamp</li>
              <li>Admin status flag (internal use)</li>
            </ul>

            <SubH>2.2 Financial &amp; Transaction Data</SubH>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-400">
              <li>Wallet balance (UGX)</li>
              <li>Deposit and withdrawal amounts, timestamps, and statuses</li>
              <li>Mobile Money number used for payment (may differ from registered number)</li>
              <li>Relworx internal reference numbers for each transaction</li>
              <li>Stakes placed, market selections, amounts, and outcomes</li>
            </ul>

            <SubH>2.3 Usage &amp; Technical Data</SubH>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-400">
              <li>IP address and approximate geolocation (country/city)</li>
              <li>Device type, browser type, and operating system</li>
              <li>Pages visited, features used, and session duration (via Supabase analytics)</li>
              <li>Error logs and crash reports</li>
            </ul>

            <SubH>2.4 Communications Data</SubH>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-400">
              <li>SMS OTP delivery logs (via Twilio) — we do not store the OTP codes themselves</li>
              <li>Support emails or messages you send to us</li>
            </ul>

            <SubH>2.5 Data We Do Not Collect</SubH>
            <p className="mt-2 text-sm text-slate-400">
              We do not collect national ID numbers, passport details, physical addresses, or payment card details.
              We do not knowingly collect data from persons under 18.
            </p>
          </section>

          <Divider />

          {/* 3 */}
          <section>
            <H2 n="3">How We Use Your Data</H2>
            <div className="mt-4 overflow-hidden rounded-xl border border-[#1e1e2e]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e2e] bg-[#13131a]">
                    <th className="px-4 py-3 text-left font-bold text-slate-300">Purpose</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-300">Legal Basis (DPPA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e2e] text-slate-400">
                  <Row a="Account creation and authentication via phone OTP" b="Performance of contract" />
                  <Row a="Processing deposits and withdrawals via Relworx" b="Performance of contract" />
                  <Row a="Calculating and distributing market payouts" b="Performance of contract" />
                  <Row a="Sending SMS OTP codes for login (via Twilio)" b="Performance of contract" />
                  <Row a="Detecting fraud, abuse, and money laundering" b="Legitimate interest / legal obligation" />
                  <Row a="Complying with Ugandan financial regulations and tax obligations" b="Legal obligation" />
                  <Row a="Improving Platform features and fixing bugs" b="Legitimate interest" />
                  <Row a="Sending service notifications (e.g. market settlement, withdrawal status)" b="Performance of contract" />
                  <Row a="Responding to support enquiries" b="Legitimate interest" />
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              We will not use your data for purposes incompatible with those listed above without your explicit consent.
            </p>
          </section>

          <Divider />

          {/* 4 */}
          <section>
            <H2 n="4">How We Share Your Data</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              We share your personal data only as described below. We do not sell your data.
            </p>

            <SubH>4.1 Relworx (Payment Processor)</SubH>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              We share your Mobile Money number and transaction amounts with Relworx to process deposits and disbursements.
              Relworx acts as a data processor on our behalf and is contractually bound to protect your data and use it only
              for payment processing. Relworx is regulated as a payment service provider and complies with the Uganda
              National Payment Systems Act, 2020.
            </p>

            <SubH>4.2 Twilio (SMS Provider)</SubH>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Your phone number is shared with Twilio Inc. (USA) solely for the purpose of delivering OTP SMS messages.
              Twilio processes data in the United States. We rely on Twilio&apos;s standard contractual protections for
              international transfers.
            </p>

            <SubH>4.3 Supabase (Infrastructure)</SubH>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Your account, wallet, and transaction data is stored in Supabase&apos;s cloud database. Supabase Inc. acts
              as a data processor under our instructions. Data may be stored in servers located outside Uganda. We rely on
              appropriate contractual safeguards for these transfers.
            </p>

            <SubH>4.4 Legal &amp; Regulatory Disclosure</SubH>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              We may disclose your data to government authorities, law enforcement, the Uganda Revenue Authority, or
              financial regulators where required by law or court order.
            </p>

            <SubH>4.5 Business Transfer</SubH>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              If {COMPANY} is acquired, merged, or its assets are transferred, your data may be transferred as part of that
              transaction. We will notify you if this occurs and your data will remain subject to this Policy.
            </p>
          </section>

          <Divider />

          {/* 5 */}
          <section>
            <H2 n="5">International Data Transfers</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Your data may be transferred to and processed in countries outside Uganda, including the United States
              (Twilio, Supabase). Where we make such transfers, we ensure appropriate safeguards are in place, including
              contractual clauses that require the recipient to protect data to a standard equivalent to that required
              under the DPPA.
            </p>
          </section>

          <Divider />

          {/* 6 */}
          <section>
            <H2 n="6">Data Retention</H2>
            <div className="mt-4 overflow-hidden rounded-xl border border-[#1e1e2e]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e2e] bg-[#13131a]">
                    <th className="px-4 py-3 text-left font-bold text-slate-300">Data Category</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-300">Retention Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e2e] text-slate-400">
                  <Row a="Account & identity data (active accounts)" b="Duration of account + 5 years" />
                  <Row a="Transaction & financial records" b="7 years (tax/regulatory obligation)" />
                  <Row a="Betting history (stakes, outcomes, payouts)" b="5 years after account closure" />
                  <Row a="SMS OTP delivery logs" b="90 days" />
                  <Row a="Technical logs & IP data" b="12 months" />
                  <Row a="Support correspondence" b="3 years" />
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              After the applicable retention period, data is securely deleted or anonymised.
            </p>
          </section>

          <Divider />

          {/* 7 */}
          <section>
            <H2 n="7">Your Rights Under the DPPA</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Under Uganda&apos;s Data Protection and Privacy Act, 2019, you have the following rights:
            </p>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li><strong className="text-slate-300">Right of access.</strong> You may request a copy of the personal data we hold about you.</li>
              <li><strong className="text-slate-300">Right to rectification.</strong> You may request correction of inaccurate or incomplete data.</li>
              <li><strong className="text-slate-300">Right to erasure.</strong> You may request deletion of your data where we no longer have a legal basis to retain it. Note that financial and transaction records must be retained for regulatory periods regardless.</li>
              <li><strong className="text-slate-300">Right to object.</strong> You may object to processing based on our legitimate interests where your situation warrants it.</li>
              <li><strong className="text-slate-300">Right to data portability.</strong> You may request your data in a structured, machine-readable format.</li>
              <li><strong className="text-slate-300">Right to withdraw consent.</strong> Where processing is based on consent, you may withdraw it at any time. This will not affect the lawfulness of prior processing.</li>
              <li><strong className="text-slate-300">Right to lodge a complaint.</strong> You have the right to complain to the <strong className="text-slate-300">Personal Data Protection Office of Uganda</strong> if you believe we have mishandled your data.</li>
            </ol>
            <p className="mt-4 text-sm text-slate-400">
              To exercise any of these rights, email us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:text-violet-300">{CONTACT_EMAIL}</a>.
              We will respond within 30 days.
            </p>
          </section>

          <Divider />

          {/* 8 */}
          <section>
            <H2 n="8">Security</H2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
              <li>We use industry-standard security measures including TLS encryption in transit, encrypted storage, and row-level security policies on our database.</li>
              <li>Access to production data is restricted to authorised personnel via multi-factor authentication.</li>
              <li>We regularly review and update our security practices.</li>
              <li>No system is completely secure. If you believe your account has been compromised, contact us immediately at {CONTACT_EMAIL}.</li>
              <li>In the event of a personal data breach that affects your rights, we will notify you and the relevant authority as required by the DPPA.</li>
            </ol>
          </section>

          <Divider />

          {/* 9 */}
          <section>
            <H2 n="9">Cookies &amp; Tracking</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              The Platform uses essential session cookies to maintain your login state (managed by Supabase Auth).
              We do not use advertising or third-party tracking cookies. Browser local storage may be used to preserve
              UI preferences. You can disable cookies in your browser settings, but this will prevent you from logging in.
            </p>
          </section>

          <Divider />

          {/* 10 */}
          <section>
            <H2 n="10">Children&apos;s Privacy</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              The Platform is not directed at persons under 18. We do not knowingly collect personal data from children.
              If we become aware that we have collected data from someone under 18, we will delete it immediately and close
              the account. If you believe a child has registered, contact us at {CONTACT_EMAIL}.
            </p>
          </section>

          <Divider />

          {/* 11 */}
          <section>
            <H2 n="11">Changes to This Policy</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              We may update this Privacy Policy from time to time. We will notify you of material changes by SMS or a
              notice on the Platform at least 7 days before they take effect. The &ldquo;Effective date&rdquo; at the top
              of this page will always reflect the current version.
            </p>
          </section>

          <Divider />

          {/* 12 */}
          <section>
            <H2 n="12">Contact &amp; Complaints</H2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              For data protection enquiries, access requests, or complaints:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-400">
              <li>Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:text-violet-300">{CONTACT_EMAIL}</a></li>
              <li>Kampala, Uganda</li>
            </ul>
            <p className="mt-4 text-sm text-slate-400">
              If you are not satisfied with our response, you may contact the{' '}
              <strong className="text-slate-300">Personal Data Protection Office of Uganda</strong> (under the National
              Information Technology Authority — NITA-U).
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}

function Divider() {
  return <hr className="border-[#1e1e2e]" />
}

function H2({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h2 className="flex items-baseline gap-3 text-xl font-black text-white">
      <span className="font-mono text-sm font-bold text-violet-500">{n}.</span>
      {children}
    </h2>
  )
}

function SubH({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-5 text-sm font-bold text-slate-300">{children}</h3>
}

function Row({ a, b }: { a: string; b: string }) {
  return (
    <tr>
      <td className="px-4 py-3">{a}</td>
      <td className="px-4 py-3 text-violet-400">{b}</td>
    </tr>
  )
}
