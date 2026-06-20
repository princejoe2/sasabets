import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AutoCreateClient from './AutoCreateClient'

export default async function AutoCreatePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  return <AutoCreateClient />
}
