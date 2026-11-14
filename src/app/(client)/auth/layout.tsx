import { pageMeta } from '@/lib/seo'

export const metadata = pageMeta({
  title: "Log In or Sign Up",
  description: "Log in to Sabula 256 or create a free account to predict Ugandan football, politics and economy markets and get paid via Mobile Money.",
  path: "/auth",
  noindex: true
})

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
