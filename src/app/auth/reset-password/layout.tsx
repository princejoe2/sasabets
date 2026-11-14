import { privateMeta } from '@/lib/seo'

export const metadata = privateMeta("Reset Password")

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
