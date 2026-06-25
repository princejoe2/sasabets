import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AutoCreateClient from './AutoCreateClient'

export const dynamic = 'force-dynamic'

export default async function AutoCreatePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  return <AutoCreateClient />
}
