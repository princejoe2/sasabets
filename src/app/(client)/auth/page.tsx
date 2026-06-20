'use client'
import { useState, CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

// Base64-decoded at runtime to bypass BOM injection from Vercel env vars at compile time
const _d = (b: string) => Buffer.from(b, 'base64').toString('utf8')
const _SB_URL = _d('aHR0cHM6Ly9qc2lncGh5cmhnbXBheWRvempmYS5zdXBhYmFzZS5jbw==')
const _SB_KEY = _d('ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW1wemFXZHdhSGx5YUdkdGNHRjVaRzk2YW1aaElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzT0RFMk9ERTJNVGNzSW1WNGNDSTZNakE1TnpJMU56WXhOMzAuQUFmaEdqTzdYODlvLUhMMlFWbXBjTnJYeV9NajdhSnFvTEZvZHAwcnlhSQ==')

type Mode = 'login' | 'register'
type Step = 'form' | 'otp' | 'totp'

const T = {
  bg: '#07090f',
  card: '#0e1118',
  border: '#1c1f2e',
  text: '#e8eaf0',
  muted: '#5a6080',
  accent: '#4f8ef7',
  accentHover: '#3a7bf5',
  accentContrast: '#ffffff',
  input: '#0a0d18',
  inputBorder: '#1e2236',
  error: '#ef4444',
  success: '#22c55e',
  shadow: '0 24px 48px -12px rgba(0,0,0,.8), 0 0 0 1px rgba(79,142,247,.06)',
}

export default function AuthPage() {
  const supabase = createBrowserClient(_SB_URL, _SB_KEY)
  const router   = useRouter()

  const [mode, setMode]     = useState<Mode>('login')
  const [step, setStep]     = useState<Step>('form')

  // form fields
  const [email,       setEmail]       = useState('')
  const [name,        setName]        = useState('')
  const [phone,       setPhone]       = useState('')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [otp,         setOtp]         = useState('')
  const [totp,        setTotp]        = useState('')
  const [isAdmin,     setIsAdmin]     = useState(false)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function switchMode(m: Mode) {
    setMode(m); setStep('form')
    setError(''); setOtp(''); setTotp('')
    setPassword(''); setConfirm('')
  }

  // ─── Registration ──────────────────────────────────────────────────────────

  async function handleRegister() {
    setError('')
    if (!email || !password) { setError('Email and password are required'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (!phone) { setError('Phone number is required for deposits and withdrawals'); return }

    // Basic Uganda phone format
    const ph = phone.replace(/[\s\-()]/g, '')
    if (!/^(0|256|\+256)7\d{8}$/.test(ph)) {
      setError('Enter a valid Ugandan phone number (e.g. 0712345678)')
      return
    }

    setLoading(true)
    const { error: signUpErr } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: name.trim() || null, phone: ph },
      },
    })

    if (signUpErr) {
      setError(signUpErr.message)
      setLoading(false)
      return
    }

    // Supabase sends a 6-digit OTP to the email — show OTP step
    setStep('otp')
    setLoading(false)
  }

  async function handleOtpVerify() {
    setError('')
    if (otp.length !== 6) { setError('Enter the 6-digit code from your email'); return }
    setLoading(true)

    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp,
      type: 'signup',
    })

    if (verifyErr) {
      setError(verifyErr.message)
      setLoading(false)
      return
    }

    // Save phone + name to profile (server stores via admin client)
    if (data.user) {
      const ph = phone.replace(/[\s\-()]/g, '')
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: ph, name: name.trim() || null }),
      })
    }

    router.push('/markets')
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  async function handleLogin() {
    setError('')
    if (!email || !password) { setError('Email and password are required'); return }
    setLoading(true)

    const { data, error: loginErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (loginErr) {
      setError(loginErr.message)
      setLoading(false)
      return
    }

    // Check if admin or has 2FA
    const userId = data.user.id
    const res = await fetch('/api/auth/check-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const { isAdmin: admin, has2fa } = await res.json()

    if (admin || has2fa) {
      setIsAdmin(!!admin)
      setStep('totp')
      setLoading(false)
      return
    }

    router.push('/markets')
  }

  async function handleTotpVerify() {
    setError('')
    if (totp.length !== 6) { setError('Enter the 6-digit code from your authenticator app'); return }
    setLoading(true)

    const endpoint = isAdmin ? '/api/admin/2fa/verify' : '/api/auth/2fa/verify'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: totp }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Invalid code — try again')
      setLoading(false)
      return
    }

    router.push(isAdmin ? '/admin' : '/markets')
    router.refresh()
  }

  // ─── Resend OTP ────────────────────────────────────────────────────────────

  async function resendOtp() {
    setError('')
    setLoading(true)
    const { error: resendErr } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    })
    if (resendErr) setError(resendErr.message)
    else setError('')
    setLoading(false)
  }

  // ─── Styles ────────────────────────────────────────────────────────────────

  const wrap: CSSProperties = {
    minHeight: '100vh',
    background: T.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }

  const card: CSSProperties = {
    width: '100%',
    maxWidth: '420px',
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: '16px',
    padding: '32px',
    boxShadow: T.shadow,
  }

  const label: CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: T.muted,
    marginBottom: '6px',
    letterSpacing: '0.03em',
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    background: T.input,
    border: `1px solid ${T.inputBorder}`,
    borderRadius: '10px',
    padding: '11px 14px',
    fontSize: '15px',
    color: T.text,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const btn: CSSProperties = {
    width: '100%',
    background: T.accent,
    color: T.accentContrast,
    border: 'none',
    borderRadius: '10px',
    padding: '13px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '8px',
  }

  const fieldGap: CSSProperties = { marginBottom: '16px' }

  // ─── Render ────────────────────────────────────────────────────────────────

  // ── OTP verification step (after registration) ──────────────────────────
  if (step === 'otp') {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📧</div>
            <h1 style={{ color: T.text, fontSize: '20px', fontWeight: 800, margin: '0 0 6px' }}>Check your email</h1>
            <p style={{ color: T.muted, fontSize: '14px', margin: 0 }}>
              We sent a 6-digit code to <strong style={{ color: T.text }}>{email}</strong>
            </p>
          </div>

          <div style={fieldGap}>
            <label style={label}>Verification code</label>
            <input
              style={{ ...inputStyle, letterSpacing: '0.25em', textAlign: 'center', fontSize: '22px' }}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoFocus
              maxLength={6}
            />
          </div>

          {error && <p style={{ color: T.error, fontSize: '13px', margin: '0 0 12px' }}>{error}</p>}

          <button style={{ ...btn, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleOtpVerify}>
            {loading ? 'Verifying…' : 'Verify & continue'}
          </button>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              onClick={resendOtp}
              disabled={loading}
              style={{ background: 'none', border: 'none', color: T.accent, fontSize: '13px', cursor: 'pointer' }}
            >
              Resend code
            </button>
            <span style={{ color: T.muted, fontSize: '13px', margin: '0 8px' }}>·</span>
            <button
              onClick={() => { setStep('form'); setOtp(''); setError('') }}
              style={{ background: 'none', border: 'none', color: T.muted, fontSize: '13px', cursor: 'pointer' }}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── TOTP verification step (2FA during login) ───────────────────────────
  if (step === 'totp') {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔐</div>
            <h1 style={{ color: T.text, fontSize: '20px', fontWeight: 800, margin: '0 0 6px' }}>Two-factor authentication</h1>
            <p style={{ color: T.muted, fontSize: '14px', margin: 0 }}>
              Open your authenticator app and enter the 6-digit code
            </p>
          </div>

          <div style={fieldGap}>
            <label style={label}>Authenticator code</label>
            <input
              style={{ ...inputStyle, letterSpacing: '0.25em', textAlign: 'center', fontSize: '22px' }}
              value={totp}
              onChange={e => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoFocus
              maxLength={6}
            />
          </div>

          {error && <p style={{ color: T.error, fontSize: '13px', margin: '0 0 12px' }}>{error}</p>}

          <button style={{ ...btn, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleTotpVerify}>
            {loading ? 'Verifying…' : 'Verify'}
          </button>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              onClick={async () => { await supabase.auth.signOut(); setStep('form'); setTotp(''); setError('') }}
              style={{ background: 'none', border: 'none', color: T.muted, fontSize: '13px', cursor: 'pointer' }}
            >
              Cancel & sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Login / Register form ───────────────────────────────────────────────
  return (
    <div style={wrap}>
      <div style={card}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.15em', color: T.accent, textTransform: 'uppercase', marginBottom: '4px' }}>
            Sabula 256
          </div>
          <h1 style={{ color: T.text, fontSize: '22px', fontWeight: 800, margin: '0 0 4px' }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{ color: T.muted, fontSize: '13px', margin: 0 }}>
            {mode === 'login' ? 'Sign in to your account' : 'Start predicting with Sabula 256'}
          </p>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', background: T.input, borderRadius: '10px', padding: '3px', marginBottom: '24px', gap: '2px' }}>
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1, border: 'none', borderRadius: '8px', padding: '9px',
                fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                background: mode === m ? T.accent : 'transparent',
                color: mode === m ? T.accentContrast : T.muted,
                transition: 'all .15s',
              }}
            >
              {m === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        {/* Email */}
        <div style={fieldGap}>
          <label style={label}>Email address</label>
          <input
            type="email"
            style={inputStyle}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
          />
        </div>

        {/* Full name (register only) */}
        {mode === 'register' && (
          <div style={fieldGap}>
            <label style={label}>Full name</label>
            <input
              type="text"
              style={inputStyle}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
            />
          </div>
        )}

        {/* Phone (register only) */}
        {mode === 'register' && (
          <div style={fieldGap}>
            <label style={label}>Phone number <span style={{ color: T.muted, fontWeight: 400 }}>(for deposits &amp; withdrawals)</span></label>
            <input
              type="tel"
              style={inputStyle}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0712 345 678"
              autoComplete="tel"
            />
          </div>
        )}

        {/* Password */}
        <div style={fieldGap}>
          <label style={label}>Password</label>
          <input
            type="password"
            style={inputStyle}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
        </div>

        {/* Confirm password (register only) */}
        {mode === 'register' && (
          <div style={fieldGap}>
            <label style={label}>Confirm password</label>
            <input
              type="password"
              style={inputStyle}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
        )}

        {error && <p style={{ color: T.error, fontSize: '13px', margin: '0 0 12px' }}>{error}</p>}

        <button
          style={{ ...btn, opacity: loading ? 0.6 : 1 }}
          disabled={loading}
          onClick={mode === 'login' ? handleLogin : handleRegister}
        >
          {loading
            ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
            : (mode === 'login' ? 'Sign in' : 'Create account')
          }
        </button>

        {mode === 'register' && (
          <p style={{ color: T.muted, fontSize: '12px', textAlign: 'center', marginTop: '16px', lineHeight: 1.5 }}>
            By registering you agree to our{' '}
            <a href="/terms" style={{ color: T.accent }}>Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" style={{ color: T.accent }}>Privacy Policy</a>.
          </p>
        )}
      </div>
    </div>
  )
}
