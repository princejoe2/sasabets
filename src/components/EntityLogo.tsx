'use client'
import { useState } from 'react'

type Props = {
  name: string
  src: string | null
  size?: number   // px, default 40
  className?: string
  shape?: 'circle' | 'square'  // default 'circle'
}

export default function EntityLogo({ name, src, size = 40, className = '', shape = 'circle' }: Props) {
  const [failed, setFailed] = useState(false)

  const initial = name?.charAt(0).toUpperCase() ?? '?'
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl'

  if (!src || failed) {
    // Fallback: colored circle with first letter
    return (
      <div
        className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-violet-600 to-violet-900 font-black text-white ${shapeClass} ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initial}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`shrink-0 object-contain ${shapeClass} ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
