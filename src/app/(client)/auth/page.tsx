'use client'
import { useState, CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import AnimatedButton from '@/components/ui/animated-button'

// Base64-decoded at runtime to bypass BOM injection from Vercel env vars at compile time
const _d = (b: string) => Buffer.from(b, 'base64').toString('utf8')
const _SB_URL = _d('aHR0cHM6Ly9qc2lncGh5cmhnbXBheWRvempmYS5zdXBhYmFzZS5jbw==')
const _SB_KEY = _d('ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW1wemFXZHdhSGx5YUdkdGNHRjVaRzk2YW1aaElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzT0RFMk9ERTJNVGNzSW1WNGNDSTZNakE1TnpJMU56WXhOMzAuQUFmaEdqTzdYODlvLUhMMlFWbXBjTnJYeV9NajdhSnFvTEZvZHAwcnlhSQ==')

type Mode = 'login' | 'register'
type Step = 'form' | 'otp' | 'totp' | 'forgot' | 'forgot-sent'

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
  const [totp,        setTotp]        = useState('')
  const [isAdmin,     setIsAdmin]     = useState(false)
  const [otpCode,     setOtpCode]     = useState('')

  const [normalizedPhone, setNormalizedPhone] = useState('')

  const [username,      setUsername]      = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockedUntil,   setLockedUntil]   = useState(0)
  const [termsAccepted, setTermsAccepted] = useState(false)

  function switchMode(m: Mode) {
    setMode(m); setStep('form')
    setError(''); setTotp('')
    setPassword(''); setConfirm('')
    setUsername('')
    setTermsAccepted(false)
  }

  // ─── Registration ──────────────────────────────────────────────────────────

  async function handleRegister() {
    setError('')
    if (!email || !password) { setError('Email and password are required'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (!phone) { setError('Phone number is required for deposits and withdrawals'); return }
    if (!termsAccepted) { setError('You must accept the Terms of Service and Privacy Policy to continue'); return }
    if (username && !/^[a-z0-9_-]{3,20}$/.test(username)) {
      setError('Username must be 3–20 characters: letters, numbers, _ or - only'); return
    }

    // Basic Uganda phone format
    const raw = phone.replace(/[\s\-()]/g, '')
    if (!/^(\+256|256|0)(7\d{8}|39\d{7})$/.test(raw)) {
      setError('Enter a valid Ugandan mobile number (MTN or Airtel, e.g. 0771234567)')
      return
    }
    // Normalise to international format (+256XXXXXXXXX) to avoid DB trigger mismatches
    const ph = raw.startsWith('+256') ? raw
              : raw.startsWith('256')  ? '+' + raw
              : '+256' + raw.slice(1)

    setNormalizedPhone(ph)
    setLoading(true)

    // Verify phone format and availability before creating the account
    try {
      const vRes = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: ph }),
      })
      const vData = await vRes.json()
      if (!vData.valid) {
        setError('Phone number could not be verified. Please enter an active MTN or Airtel Uganda number.')
        setLoading(false)
        return
      }
      if (vData.available === false) {
        setError('This phone number is already registered. Please use a different number or sign in.')
        setLoading(false)
        return
      }
    } catch { /* network error — proceed without blocking */ }

    try {
      const { error: signUpErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: name.trim() || null, phone: ph },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/markets`,
        },
      })

      if (signUpErr) {
        setError(signUpErr.message || 'Registration failed — please try again.')
        setLoading(false)
        return
      }
    } catch {
      setError('Network error — please check your connection and try again.')
      setLoading(false)
      return
    }

    // Confirmation email sent — show OTP entry screen
    setStep('otp')
    setLoading(false)
  }

  async function handleResendConfirmation() {
    setError(''); setLoading(true)
    const { error: e } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() })
    if (e) setError(e.message || 'Failed to resend — please try again.')
    setLoading(false)
  }

  async function handleVerifyOtp() {
    setError(''); setLoading(true)
    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otpCode,
      type: 'signup',
    })
    if (verifyErr) {
      setError(verifyErr.message || 'Verification failed — please try again.')
      setLoading(false)
      return
    }
    if (!data?.session) {
      setError('Verification failed — try again or request a new code.')
      setLoading(false)
      return
    }
    // Persist phone + name to profile and credit referral if applicable.
    // Use the already-normalised +256 number so the register API doesn't
    // need to re-normalise and the duplicate check is format-consistent.
    try {
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone || phone, name, username: username.trim().toLowerCase() || undefined }),
      })
      if (!regRes.ok) {
        const regData = await regRes.json().catch(() => ({}))
        if (regRes.status === 409) {
          setError(regData.error ?? 'This phone number is already taken. Please update your phone in profile settings.')
          setLoading(false)
          return
        }
      }
    } catch { /* non-critical — phone already saved via trigger on signUp */ }
    router.push('/markets')
    router.refresh()
  }

  // ─── Forgot password ───────────────────────────────────────────────────────

  async function handleForgotPassword() {
    setError('')
    if (!email) { setError('Enter your email address'); return }
    setLoading(true)
    const { error: e } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/auth/reset-password` },
    )
    if (e) { setError(e.message); setLoading(false); return }
    setStep('forgot-sent')
    setLoading(false)
  }

  // ─── Google OAuth ──────────────────────────────────────────────────────────

  async function handleGoogleLogin() {
    setError(''); setLoading(true)
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/markets`,
      },
    })
    if (oauthErr) {
      setError(oauthErr.message || 'Google sign-in failed — please try again.')
      setLoading(false)
    }
    // On success, browser redirects to Google — no need to do anything else
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  async function handleLogin() {
    setError('')
    if (!email || !password) { setError('Email and password are required'); return }

    // Enforce client-side lockout after repeated failures
    const now = Date.now()
    if (lockedUntil > now) {
      const secs = Math.ceil((lockedUntil - now) / 1000)
      setError(`Too many failed attempts. Try again in ${secs} second${secs !== 1 ? 's' : ''}.`)
      return
    }

    setLoading(true)

    const { data, error: loginErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (loginErr) {
      const next = failedAttempts + 1
      setFailedAttempts(next)
      // Progressive lockout: 30s after 3 fails, 120s after 6, 300s after 9
      const lockSecs = next >= 9 ? 300 : next >= 6 ? 120 : next >= 3 ? 30 : 0
      if (lockSecs > 0) setLockedUntil(Date.now() + lockSecs * 1000)
      setError('Email or password is incorrect.')
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
    const userInfo = await res.json()

    if (userInfo.suspended) {
      await supabase.auth.signOut()
      setError(userInfo.suspend_reason ?? 'Your account has been suspended. Contact support.')
      setLoading(false)
      return
    }

    const { isAdmin: admin, isStaff, has2fa } = userInfo

    // Staff and admins both use the admin TOTP flow
    if (admin || isStaff || has2fa) {
      setIsAdmin(!!(admin || isStaff))
      setStep('totp')
      setLoading(false)
      return
    }

    setFailedAttempts(0)
    setLockedUntil(0)
    router.push('/markets')
  }

  async function handleTotpVerify() {
    setError('')
    if (totp.length !== 6) { setError('Enter the 6-digit code from your authenticator app'); return }

    const now = Date.now()
    if (lockedUntil > now) {
      const secs = Math.ceil((lockedUntil - now) / 1000)
      setError(`Too many attempts. Try again in ${secs} second${secs !== 1 ? 's' : ''}.`)
      return
    }

    setLoading(true)

    // Admin and staff both verify via the admin endpoint (it sets the TOTP cookie the layout checks)
    const endpoint = isAdmin ? '/api/admin/2fa/verify' : '/api/auth/2fa/verify'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: totp }),
    })
    const data = await res.json()

    if (!res.ok) {
      const next = failedAttempts + 1
      setFailedAttempts(next)
      if (next >= 5) setLockedUntil(Date.now() + 300 * 1000)
      else if (next >= 3) setLockedUntil(Date.now() + 60 * 1000)
      setError('Invalid code — try again')
      setLoading(false)
      return
    }

    router.push(isAdmin ? '/admin' : '/markets')
    router.refresh()
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

  // ── Email confirmation screen (after registration) ─────────────────────
  if (step === 'otp') {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📧</div>
            <h1 style={{ color: T.text, fontSize: '20px', fontWeight: 800, margin: '0 0 8px' }}>Check your email</h1>
            <p style={{ color: T.muted, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              We sent a confirmation code to{' '}
              <strong style={{ color: T.text }}>{email}</strong>.
              <br />Enter the 6-digit code below to activate your account.
            </p>
          </div>

          <div style={fieldGap}>
            <label style={label}>Confirmation code</label>
            <input
              style={{ ...inputStyle, letterSpacing: '0.3em', textAlign: 'center', fontSize: '24px', padding: '14px' }}
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              autoFocus
              inputMode="numeric"
            />
          </div>

          {error && <p style={{ color: T.error, fontSize: '13px', margin: '0 0 12px' }}>{error}</p>}

          <button
            style={{ ...btn, opacity: loading || otpCode.length !== 6 ? 0.6 : 1 }}
            disabled={loading || otpCode.length !== 6}
            onClick={handleVerifyOtp}
          >
            {loading ? 'Verifying…' : 'Verify code'}
          </button>

          <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: '10px', padding: '14px', margin: '16px 0' }}>
            <p style={{ color: '#93c5fd', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
              Can&apos;t find the email? Check your spam folder. The code expires in 1 hour.
              You can also click the confirmation link in the email instead.
            </p>
          </div>

          <button
            style={{ ...btn, background: T.card, border: `1px solid ${T.border}`, color: T.text, marginTop: 0, opacity: loading ? 0.6 : 1 }}
            disabled={loading}
            onClick={handleResendConfirmation}
          >
            {loading ? 'Sending…' : 'Resend confirmation email'}
          </button>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              onClick={() => { setStep('form'); setError(''); setOtpCode('') }}
              style={{ background: 'none', border: 'none', color: T.muted, fontSize: '13px', cursor: 'pointer' }}
            >
              Back to sign in
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

  // ── Forgot password form ───────────────────────────────────────────────
  if (step === 'forgot') {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔑</div>
            <h1 style={{ color: T.text, fontSize: '20px', fontWeight: 800, margin: '0 0 6px' }}>Reset your password</h1>
            <p style={{ color: T.muted, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

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

          {error && <p style={{ color: T.error, fontSize: '13px', margin: '0 0 12px' }}>{error}</p>}

          <button
            style={{ ...btn, opacity: loading ? 0.6 : 1 }}
            disabled={loading}
            onClick={handleForgotPassword}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              onClick={() => { setStep('form'); setError('') }}
              style={{ background: 'none', border: 'none', color: T.muted, fontSize: '13px', cursor: 'pointer' }}
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Forgot password sent ────────────────────────────────────────────────
  if (step === 'forgot-sent') {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📧</div>
            <h1 style={{ color: T.text, fontSize: '20px', fontWeight: 800, margin: '0 0 8px' }}>Check your email</h1>
            <p style={{ color: T.muted, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              We sent a password reset link to{' '}
              <strong style={{ color: T.text }}>{email}</strong>.
              <br />Click the link in the email to set a new password.
            </p>
          </div>

          <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
            <p style={{ color: '#93c5fd', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
              Can&apos;t find the email? Check your spam folder. The link expires in 1 hour.
            </p>
          </div>

          <button
            style={{ ...btn, background: T.card, border: `1px solid ${T.border}`, color: T.text, marginTop: 0 }}
            onClick={() => { setStep('form'); setError('') }}
          >
            Back to sign in
          </button>
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

        {/* Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            background: '#ffffff',
            color: '#1f2937',
            border: '1px solid #d1d5db',
            borderRadius: '10px',
            padding: '12px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '20px',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ffffff' }}
        >
          {/* Google logo */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {loading ? 'Redirecting…' : mode === 'register' ? 'Sign up to Sabula 256 with Google' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: T.border }} />
          <span style={{ fontSize: '12px', color: T.muted, fontWeight: 600 }}>or</span>
          <div style={{ flex: 1, height: '1px', background: T.border }} />
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

        {/* Username (register only) */}
        {mode === 'register' && (
          <div style={fieldGap}>
            <label style={label}>
              Username <span style={{ color: T.muted, fontWeight: 400 }}>(optional, e.g. john_doe)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: T.muted, fontSize: '15px', pointerEvents: 'none' }}>@</span>
              <input
                type="text"
                style={{ ...inputStyle, paddingLeft: '28px' }}
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20))}
                placeholder="your_handle"
                autoComplete="username"
                maxLength={20}
              />
            </div>
            {username && username.length < 3 && (
              <p style={{ color: T.muted, fontSize: '11px', marginTop: '4px' }}>At least 3 characters</p>
            )}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <label style={{ ...label, margin: 0 }}>Password</label>
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => { setStep('forgot'); setError('') }}
                style={{ background: 'none', border: 'none', color: T.accent, fontSize: '12px', cursor: 'pointer', padding: 0 }}
              >
                Forgot password?
              </button>
            )}
          </div>
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

        {mode === 'register' && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', margin: '0 0 16px' }}>
            <input
              id="terms-checkbox"
              type="checkbox"
              checked={termsAccepted}
              onChange={e => { setTermsAccepted(e.target.checked); if (e.target.checked) setError('') }}
              style={{
                marginTop: '2px',
                width: '16px',
                height: '16px',
                minWidth: '16px',
                accentColor: T.accent,
                cursor: 'pointer',
              }}
            />
            <label htmlFor="terms-checkbox" style={{ fontSize: '13px', color: T.muted, lineHeight: 1.55, cursor: 'pointer' }}>
              I have read and agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: 'underline' }} onClick={e => e.stopPropagation()}>
                Terms of Service
              </a>
              ,{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: 'underline' }} onClick={e => e.stopPropagation()}>
                Privacy Policy
              </a>
              {', and '}
              <a href="/responsible-gambling" target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: 'underline' }} onClick={e => e.stopPropagation()}>
                Responsible Gambling Policy
              </a>
              . I confirm I am 18 years of age or older.
            </label>
          </div>
        )}

        {error && <p style={{ color: T.error, fontSize: '13px', margin: '0 0 12px' }}>{error}</p>}

        <AnimatedButton
          disabled={loading || (mode === 'register' && !termsAccepted)}
          onClick={mode === 'login' ? handleLogin : handleRegister}
          style={{ marginTop: '8px', opacity: loading || (mode === 'register' && !termsAccepted) ? 0.6 : 1 }}
          className="w-full rounded-[10px] py-[13px] text-[15px] font-bold !bg-[#4f8ef7] dark:!bg-[#4f8ef7] !border-[#3a7bf5] !text-white [--shine:rgba(255,255,255,0.6)] dark:[--shine:rgba(255,255,255,0.6)]"
        >
          {loading
            ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
            : (mode === 'login' ? 'Sign in' : 'Create account')
          }
        </AnimatedButton>
      </div>
    </div>
  )
}
