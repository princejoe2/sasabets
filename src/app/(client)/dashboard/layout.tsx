import { privateMeta } from '@/lib/seo'

export const metadata = privateMeta("Dashboard")

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
