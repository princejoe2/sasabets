import { NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/admin-guard'
import { detectAmlFlags } from '@/lib/aml-flags'

export async function GET() {
  // AML review lives under /admin/aml, which the support role can access.
  const g = await guardAdmin(['support'])
  if ('error' in g) return g.error

  try {
    const flags = await detectAmlFlags(g.admin)
    return NextResponse.json(flags)
  } catch (error) {
    console.error('[admin/aml] detection failed:', error)
    return NextResponse.json({ error: 'Detection failed' }, { status: 500 })
  }
}
