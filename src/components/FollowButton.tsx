'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FollowButton({
  marketId,
  initialFollowing,
  isLoggedIn,
}: {
  marketId: string
  initialFollowing: boolean
  isLoggedIn: boolean
}) {
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (!isLoggedIn) { router.push('/auth'); return }
    setLoading(true)
    const method = following ? 'DELETE' : 'POST'
    const res = await fetch(`/api/market/${marketId}/follow`, { method })
    if (res.ok) setFollowing(!following)
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={following ? 'Unfollow market' : 'Follow to get notified when this market settles'}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${
        following
          ? 'border-violet-600 bg-violet-600/15 text-violet-400 hover:bg-violet-600/25'
          : 'border-[#2a2a3e] bg-transparent text-slate-500 hover:border-violet-600/50 hover:text-violet-400'
      }`}
    >
      <span>{following ? '🔔' : '🔕'}</span>
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
