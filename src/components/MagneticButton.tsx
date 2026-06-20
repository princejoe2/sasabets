'use client'
import { useRef } from 'react'
import Link from 'next/link'

interface Props {
  href: string
  children: React.ReactNode
  className?: string
  variant?: 'primary' | 'secondary'
}

export default function MagneticButton({ href, children, className = '', variant = 'primary' }: Props) {
  const ref = useRef<HTMLAnchorElement>(null)

  function onMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const dx = e.clientX - rect.left - rect.width / 2
    const dy = e.clientY - rect.top  - rect.height / 2
    el.style.transform = `translate(${dx * 0.28}px, ${dy * 0.28}px)`
    el.style.transition = 'transform 0.1s ease'
  }

  function onLeave() {
    const el = ref.current
    if (!el) return
    el.style.transform = 'translate(0, 0)'
    el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
  }

  const base = 'inline-block rounded-2xl font-black text-lg transition-colors select-none'
  const variants = {
    primary:   'btn-glow bg-violet-600 px-9 py-4 hover:bg-violet-500 text-white',
    secondary: 'border border-[#2a2a3e] bg-[#13131a] px-9 py-4 text-slate-300 hover:border-violet-600 hover:text-white',
  }

  return (
    <Link
      ref={ref}
      href={href}
      className={`${base} ${variants[variant]} ${className}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </Link>
  )
}
