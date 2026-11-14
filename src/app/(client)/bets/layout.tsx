import { privateMeta } from '@/lib/seo'

export const metadata = privateMeta("My Predictions")

export default function BetsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
