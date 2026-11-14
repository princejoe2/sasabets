import { privateMeta } from '@/lib/seo'

export const metadata = privateMeta("Profile")

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
