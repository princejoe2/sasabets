'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ background: '#000000', color: '#F5F5F5', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Something went wrong</h1>
          {error.digest && <p style={{ color: '#6B6B6B', marginBottom: '1rem' }}>Error ID: {error.digest}</p>}
          <button
            onClick={reset}
            style={{ background: '#FF9F43', color: '#000000', border: 'none', padding: '0.75rem 2rem', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
