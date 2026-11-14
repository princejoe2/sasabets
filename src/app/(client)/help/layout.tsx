import { pageMeta, ldJson, breadcrumbLd } from '@/lib/seo'
import { SECTIONS } from './faqs'

export const metadata = pageMeta({
  title: 'Help Centre – Deposits, Withdrawals & Payouts',
  description: 'Step-by-step help for Sabula 256: creating an account, depositing and withdrawing with MTN or Airtel Mobile Money, placing predictions, odds, payouts and account security.',
  path: '/help',
})

// FAQPage structured data generated from the same content the page renders.
const JSONLD = [
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': 'https://sabula256.com/help',
    mainEntity: SECTIONS.flatMap(section =>
      section.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    ),
  },
  breadcrumbLd([
    { name: 'Home', path: '/' },
    { name: 'Help Centre', path: '/help' },
  ]),
]

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(JSONLD) }} />
      {children}
    </>
  )
}
