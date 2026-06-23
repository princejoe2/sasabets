'use client'
import { useState, useEffect, CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const _d = (b: string) => Buffer.from(b, 'base64').toString('utf8')
const _SB_URL = _d('aHR0cHM6Ly9qc2lncGh5cmhnbXBheWRvempmYS5zdXBhYmFzZS5jbw==')
const _SB_KEY = _d('ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW1wemFXZHdhSGx5YUdkdGNHRjVaRzk2YW1aaElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzT0RFMk9ERTJNVGNzSW1WNGNDSTZNakE1TnpJMU56WXhOMzAuQUFmaEdqTzdYODlvLUhMMlFWbXBjTnJYeV9NajdhSnFvTEZvZHAwcnlhSQ==')

const T = {
  bg: '#07090f', card: '#0e1118', border: '#1c1f2e',
  text: '#e8eaf0', muted: '#5a6080', accent: '#4f8ef7',
  accentContrast: '#ffffff', input: '#0a0d18', inputBorder: '#1e2236',
  error: '#ef4444', success: '#22c55e',
  shadow: '0 24px 48px -12px rgba(0,0,0,.8), 0 0 0 1px rgba(79,142,247,.06)',
}

export default function ResetPasswordPage() {
  const supabase = createBrowserClient(_SB_URL, _SB_KEY)
  const router = useRouter()

  const [ready, setReady]       = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  useEffect(() => {
    // @supabase/ssr uses cookies, not URL hash detection.
    // Manually parse the #access_token fragment Supabase puts in the recovery redirect.
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token') ?? ''
    const type = params.get('type')

    if (accessToken && type === 'recovery') {
      // Clear the hash so the token isn't visible or reusable from the address bar
      window.history.replaceState(null, '', window.location.pathname)
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) setError('Reset link is invalid or has expired.')
          else setReady(true)
        })
      return
    }

    // Fallback: already-active session (user navigated back after setting password)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset() {
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const { error: e } = await supabase.auth.updateUser({ password })
    if (e) {
      setError(e.message)
      setLoading(false)
      return
    }
    setDone(true)
    await supabase.auth.signOut()
    setTimeout(() => router.push('/auth'), 2000)
  }

  const wrap: CSSProperties = {
    minHeight: '100vh', background: T.bg, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    padding: '24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif',
  }
  const card: CSSProperties = {
    width: '100%', maxWidth: '420px', background: T.card,
    border: `1px solid ${T.border}`, borderRadius: '16px',
    padding: '32px', boxShadow: T.shadow,
  }
  const label: CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600,
    color: T.muted, marginBottom: '6px', letterSpacing: '0.03em',
  }
  const inputStyle: CSSProperties = {
    width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`,
    borderRadius: '10px', padding: '11px 14px', fontSize: '15px',
    color: T.text, outline: 'none', boxSizing: 'border-box',
  }
  const btn: CSSProperties = {
    width: '100%', background: T.accent, color: T.accentContrast,
    border: 'none', borderRadius: '10px', padding: '13px',
    fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginTop: '8px',
  }

  if (done) {
    return (
      <div style={wrap}>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
          <h1 style={{ color: T.text, fontSize: '20px', fontWeight: 800, margin: '0 0 8px' }}>Password updated</h1>
          <p style={{ color: T.muted, fontSize: '14px', margin: 0 }}>Redirecting you to sign in…</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div style={wrap}>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>↻</div>
          <p style={{ color: T.muted, fontSize: '14px', margin: 0 }}>Verifying reset link…</p>
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔑</div>
          <h1 style={{ color: T.text, fontSize: '20px', fontWeight: 800, margin: '0 0 6px' }}>Set new password</h1>
          <p style={{ color: T.muted, fontSize: '14px', margin: 0 }}>Choose a strong password for your account.</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={label}>New password</label>
          <input
            type="password"
            style={inputStyle}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            autoFocus
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={label}>Confirm new password</label>
          <input
            type="password"
            style={inputStyle}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>

        {error && <p style={{ color: T.error, fontSize: '13px', margin: '0 0 12px' }}>{error}</p>}

        <button
          style={{ ...btn, opacity: loading ? 0.6 : 1 }}
          disabled={loading}
          onClick={handleReset}
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <a href="/auth" style={{ color: T.muted, fontSize: '13px', textDecoration: 'none' }}>
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  )
}
