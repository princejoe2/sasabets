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
      <body style={{ background: '#040c06', color: '#e8f5e9', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Something went wrong</h1>
          {error.digest && <p style={{ color: '#6b7280', marginBottom: '1rem' }}>Error ID: {error.digest}</p>}
          <button
            onClick={reset}
            style={{ background: '#00ff88', color: '#040c06', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
