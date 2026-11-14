import { privateMeta } from '@/lib/seo'

export const metadata = privateMeta("Wallet")

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
