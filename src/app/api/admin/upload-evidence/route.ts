import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const form     = await req.formData()
  const file     = form.get('file') as File | null
  const marketId = form.get('marketId') as string | null

  if (!file || !marketId) {
    return NextResponse.json({ error: 'file and marketId required' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files allowed' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 10 MB' }, { status: 400 })
  }

  // Ensure bucket exists (no-op if already created)
  await admin.storage.createBucket('settlement-evidence', { public: true }).catch(() => {})

  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${marketId}/${Date.now()}.${ext}`

  const { error } = await admin.storage
    .from('settlement-evidence')
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage
    .from('settlement-evidence')
    .getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
