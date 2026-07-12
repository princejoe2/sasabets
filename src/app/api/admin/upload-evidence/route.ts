import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/admin-guard'

export async function POST(req: NextRequest) {
  // Settlement evidence uploads back the settle queue: same roles as /api/admin/settle.
  const g = await guardAdmin(['moderator', 'settler'])
  if ('error' in g) return g.error
  const admin = g.admin

  const form     = await req.formData()
  const file     = form.get('file') as File | null
  const marketId = form.get('marketId') as string | null

  if (!file || !marketId) {
    return NextResponse.json({ error: 'file and marketId required' }, { status: 400 })
  }

  // marketId becomes a storage path segment — must be a UUID, never raw input
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(marketId)) {
    return NextResponse.json({ error: 'Invalid marketId' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files allowed' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 10 MB' }, { status: 400 })
  }

  const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  const rawExt = file.name.split('.').pop()?.toLowerCase() ?? ''
  const ext = ALLOWED_EXTS.includes(rawExt) ? rawExt : 'jpg'

  // Ensure bucket exists (no-op if already created)
  await admin.storage.createBucket('settlement-evidence', { public: true }).catch(() => {})

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
