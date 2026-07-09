import Link from 'next/link'
import SocialFlipButton from '@/components/ui/social-flip-button'
import { FaFacebook, FaInstagram, FaWhatsapp, FaYoutube, FaTelegram, FaTiktok, FaEnvelope } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'

const SOCIAL_ITEMS = [
  { letter: 'C', icon: <FaFacebook />,  label: 'Facebook',  href: '#' },
  { letter: 'O', icon: <FaXTwitter />,  label: 'X',         href: '#' },
  { letter: 'N', icon: <FaInstagram />, label: 'Instagram', href: '#' },
  { letter: 'T', icon: <FaWhatsapp />,  label: 'WhatsApp',  href: '#' },
  { letter: 'A', icon: <FaYoutube />,   label: 'YouTube',   href: '#' },
  { letter: 'C', icon: <FaTelegram />,  label: 'Telegram',  href: '#' },
  { letter: 'T', icon: <FaTiktok />,    label: 'TikTok',    href: '#' },
  { letter: 'S', icon: <FaEnvelope />,  label: 'Email',     href: '/support' },
]

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-8 dark:border-slate-700 dark:bg-slate-900">
      {/* Social links */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Contacts</p>
        <SocialFlipButton
          items={SOCIAL_ITEMS}
          frontClassName="bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
          backClassName="bg-violet-600 text-white dark:bg-violet-500 dark:text-white"
        />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-sm font-black text-white">S</span>
          <span className="text-sm font-black">
            <span className="text-violet-600">Sabula</span><span className="text-slate-900 dark:text-white"> 256</span>
          </span>
          <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">© {new Date().getFullYear()} Sabula 256. All rights reserved.</span>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <Link href="/about"              className="text-xs text-slate-500 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white">About</Link>
          <Link href="/help"               className="text-xs text-slate-500 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white">Help</Link>
          <Link href="/terms"              className="text-xs text-slate-500 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white">Terms</Link>
          <Link href="/privacy"            className="text-xs text-slate-500 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white">Privacy</Link>
          <Link href="/responsible-gambling" className="text-xs text-slate-500 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white">Responsible Play</Link>
          <span className="text-xs text-slate-300 dark:text-slate-600">18+ only.</span>
        </div>
      </div>
    </footer>
  )
}
