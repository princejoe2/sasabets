import { privateMeta } from '@/lib/seo'

export const metadata = privateMeta("Contact Support")

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
