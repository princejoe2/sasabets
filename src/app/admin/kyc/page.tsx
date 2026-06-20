import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import KycReviewClient from './KycReviewClient'

export const revalidate = 0

export default async function AdminKycPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const admin = createAdminClient()

  const { data: submissions } = await admin
    .from('profiles')
    .select('id, full_name, phone, kyc_status, kyc_id_type, kyc_id_number, updated_at')
    .in('kyc_status', ['pending', 'approved', 'rejected'])
    .order('updated_at', { ascending: false })

  return <KycReviewClient submissions={submissions ?? []} />
}
