import { pageMeta } from '@/lib/seo'

export const metadata = pageMeta({
  title: "Create a Prediction Market in Uganda",
  description: "Ask any question, set two sides and stake UGX 5,000 to launch your own prediction market. Share the link — winners split the pool via MTN or Airtel Mobile Money.",
  path: "/create",
  keywords: [
    "create prediction market Uganda",
    "start a prediction market",
    "community market Uganda"
  ]
})

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
