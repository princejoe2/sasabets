'use client'

import Link from 'next/link'

export default function ClientError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#040c06] text-[#e8f5e9]">
      <div className="text-center p-8 max-w-md">
        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
        <p className="text-gray-400 mb-6">
          We ran into an unexpected error. Please try again or go back to the homepage.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-600 mb-6">Error ID: {error.digest}</p>
        )}
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2 bg-[#00ff88] text-[#040c06] font-bold rounded-lg hover:bg-[#00cc66] transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-2 border border-[#00ff88] text-[#00ff88] font-bold rounded-lg hover:bg-[#00ff8811] transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
