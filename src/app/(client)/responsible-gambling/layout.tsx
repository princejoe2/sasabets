import { pageMeta } from '@/lib/seo'

export const metadata = pageMeta({
  title: "Responsible Gambling – Deposit Limits & Self-Exclusion",
  description: "Stay in control on Sabula 256: set a daily deposit limit, take a cooling-off break or self-exclude, and find support resources in Uganda. 18+ only.",
  path: "/responsible-gambling"
})

export default function RespGamblingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
