import { privateMeta } from '@/lib/seo'

export const metadata = privateMeta("Identity Verification")

export default function KycLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
