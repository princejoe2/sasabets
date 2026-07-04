import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateUpDownClient from './CreateUpDownClient'

export const dynamic = 'force-dynamic'

export default async function AdminUpDownPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  return <CreateUpDownClient />
}
