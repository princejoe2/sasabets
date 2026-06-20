import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-[#1e1e2e] bg-[#0d0d14] px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-sm font-black text-white">S</span>
          <span className="text-sm font-black">
            <span className="text-violet-400">Sabula</span><span className="text-white"> 256</span>
          </span>
          <span className="ml-2 text-xs text-slate-600">© {new Date().getFullYear()} Sabula 256. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/terms"   className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Terms &amp; Conditions</Link>
          <Link href="/privacy" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Privacy Policy</Link>
          <span className="text-xs text-slate-700">18+ only. Gamble responsibly.</span>
        </div>
      </div>
    </footer>
  )
}
