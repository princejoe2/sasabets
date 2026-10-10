'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { AnimatePresence, motion } from 'framer-motion'

// Base64-decoded at runtime to bypass BOM injection from Vercel env vars at compile time
const _d = (b: string) => Buffer.from(b, 'base64').toString('utf8')
const _SB_URL = _d('aHR0cHM6Ly9qc2lncGh5cmhnbXBheWRvempmYS5zdXBhYmFzZS5jbw==')
const _SB_KEY = _d('ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW1wemFXZHdhSGx5YUdkdGNHRjVaRzk2YW1aaElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzT0RFMk9ERTJNVGNzSW1WNGNDSTZNakE1TnpJMU56WXhOMzAuQUFmaEdqTzdYODlvLUhMMlFWbXBjTnJYeV9NajdhSnFvTEZvZHAwcnlhSQ==')

type Mode = 'login' | 'register'
type Step = 'form' | 'otp' | 'totp' | 'forgot' | 'forgot-sent'

export default function AuthPage() {
  const supabase = createBrowserClient(_SB_URL, _SB_KEY)
  const router   = useRouter()

  const [mode, setMode] = useState<Mode>('login')
  const [step, setStep] = useState<Step>('form')

  const [email,       setEmail]       = useState('')
  const [name,        setName]        = useState('')
  const [phone,       setPhone]       = useState('')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [totp,        setTotp]        = useState('')
  const [isAdmin,     setIsAdmin]     = useState(false)
  const [otpCode,     setOtpCode]     = useState('')

  const [normalizedPhone, setNormalizedPhone] = useState('')

  const [username,       setUsername]       = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockedUntil,    setLockedUntil]    = useState(0)
  const [termsAccepted,  setTermsAccepted]  = useState(false)

  const [regStep, setRegStep] = useState<1 | 2>(1)
  const [stepDir, setStepDir] = useState<1 | -1>(1)

  function switchMode(m: Mode) {
    setMode(m); setStep('form')
    setError(''); setTotp('')
    setPassword(''); setConfirm('')
    setUsername('')
    setTermsAccepted(false)
    setRegStep(1)
  }

  function handleNextStep() {
    setError('')
    if (!email.trim()) { setError('Email is required'); return }
    if (!/\S+@\S+\.\S+/.test(email.trim())) { setError('Enter a valid email address'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setStepDir(1)
    setRegStep(2)
  }

  function handleBack() {
    setError('')
    setStepDir(-1)
    setRegStep(1)
  }

  // ─── Registration ───────────────────────────────────────────────────────────

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

    const raw = phone.replace(/[\s\-()]/g, '')
    if (!/^(\+256|256|0)(7\d{8}|39\d{7})$/.test(raw)) {
      setError('Enter a valid Ugandan mobile number (MTN or Airtel, e.g. 0771234567)')
      return
    }
    const ph = raw.startsWith('+256') ? raw
              : raw.startsWith('256')  ? '+' + raw
              : '+256' + raw.slice(1)

    setNormalizedPhone(ph)
    setLoading(true)

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

  // ─── Forgot password ────────────────────────────────────────────────────────

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

  // ─── Google OAuth ───────────────────────────────────────────────────────────

  async function handleGoogleLogin() {
    setError(''); setLoading(true)
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/markets` },
    })
    if (oauthErr) {
      setError(oauthErr.message || 'Google sign-in failed — please try again.')
      setLoading(false)
    }
  }

  // ─── Login ──────────────────────────────────────────────────────────────────

  async function handleLogin() {
    setError('')
    if (!email || !password) { setError('Email and password are required'); return }

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
      const lockSecs = next >= 9 ? 300 : next >= 6 ? 120 : next >= 3 ? 30 : 0
      if (lockSecs > 0) setLockedUntil(Date.now() + lockSecs * 1000)
      setError('Email or password is incorrect.')
      setLoading(false)
      return
    }

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

    const endpoint = isAdmin ? '/api/admin/2fa/verify' : '/api/auth/2fa/verify'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: totp }),
    })

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

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (step === 'otp') {
    return (
      <div className="min-h-dvh bg-mk-bg flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[420px] bg-mk-card border border-mk-card-border rounded-r-card shadow-2xl shadow-black/60 p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📧</div>
            <h1 className="text-xl font-black text-mk-text mb-2">Check your email</h1>
            <p className="text-sm text-mk-muted leading-relaxed">
              We sent a confirmation code to{' '}
              <strong className="text-mk-text">{email}</strong>.
              <br />Enter the 6-digit code below.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">Confirmation code</label>
            <input
              style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: 24 }}
              className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3.5 text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              autoFocus
              inputMode="numeric"
            />
          </div>

          {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

          <button
            className="w-full bg-mk-accent text-black font-bold rounded-r-btn py-3.5 text-[15px] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 mt-2"
            disabled={loading || otpCode.length !== 6}
            onClick={handleVerifyOtp}
          >
            {loading ? 'Verifying…' : 'Verify code'}
          </button>

          <div className="rounded-r-btn border border-blue-800/40 bg-blue-900/20 px-4 py-3 my-4">
            <p className="text-blue-300 text-[13px] leading-relaxed">
              Can&apos;t find the email? Check your spam folder. The code expires in 1 hour.
            </p>
          </div>

          <button
            className="w-full bg-mk-card border border-mk-border text-mk-text font-bold rounded-r-btn py-3.5 text-[15px] hover:bg-mk-raised transition-colors disabled:opacity-50"
            disabled={loading}
            onClick={handleResendConfirmation}
          >
            {loading ? 'Sending…' : 'Resend confirmation email'}
          </button>

          <div className="text-center mt-4">
            <button
              onClick={() => { setStep('form'); setError(''); setOtpCode('') }}
              className="text-[13px] text-mk-muted hover:text-mk-secondary transition-colors bg-transparent border-none cursor-pointer"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'totp') {
    return (
      <div className="min-h-dvh bg-mk-bg flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[420px] bg-mk-card border border-mk-card-border rounded-r-card shadow-2xl shadow-black/60 p-8">
          <div className="text-center mb-7">
            <div className="text-3xl mb-2">🔐</div>
            <h1 className="text-xl font-black text-mk-text mb-1.5">Two-factor authentication</h1>
            <p className="text-sm text-mk-muted">Open your authenticator app and enter the 6-digit code</p>
          </div>

          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">Authenticator code</label>
            <input
              style={{ letterSpacing: '0.25em', textAlign: 'center', fontSize: 22 }}
              className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
              value={totp}
              onChange={e => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoFocus
              maxLength={6}
            />
          </div>

          {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

          <button
            className="w-full bg-mk-accent text-black font-bold rounded-r-btn py-3.5 text-[15px] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 mt-2"
            disabled={loading}
            onClick={handleTotpVerify}
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>

          <div className="text-center mt-4">
            <button
              onClick={async () => { await supabase.auth.signOut(); setStep('form'); setTotp(''); setError('') }}
              className="text-[13px] text-mk-muted hover:text-mk-secondary transition-colors bg-transparent border-none cursor-pointer"
            >
              Cancel &amp; sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'forgot') {
    return (
      <div className="min-h-dvh bg-mk-bg flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[420px] bg-mk-card border border-mk-card-border rounded-r-card shadow-2xl shadow-black/60 p-8">
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">🔑</div>
            <h1 className="text-xl font-black text-mk-text mb-1.5">Reset your password</h1>
            <p className="text-sm text-mk-muted leading-relaxed">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">Email address</label>
            <input
              type="email"
              className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

          <button
            className="w-full bg-mk-accent text-black font-bold rounded-r-btn py-3.5 text-[15px] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 mt-2"
            disabled={loading}
            onClick={handleForgotPassword}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>

          <div className="text-center mt-4">
            <button
              onClick={() => { setStep('form'); setError('') }}
              className="text-[13px] text-mk-muted hover:text-mk-secondary transition-colors bg-transparent border-none cursor-pointer"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'forgot-sent') {
    return (
      <div className="min-h-dvh bg-mk-bg flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[420px] bg-mk-card border border-mk-card-border rounded-r-card shadow-2xl shadow-black/60 p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📧</div>
            <h1 className="text-xl font-black text-mk-text mb-2">Check your email</h1>
            <p className="text-sm text-mk-muted leading-relaxed">
              We sent a password reset link to{' '}
              <strong className="text-mk-text">{email}</strong>.
              <br />Click the link to set a new password.
            </p>
          </div>

          <div className="rounded-r-btn border border-blue-800/40 bg-blue-900/20 px-4 py-3 mb-4">
            <p className="text-blue-300 text-[13px] leading-relaxed">
              Can&apos;t find the email? Check your spam folder. The link expires in 1 hour.
            </p>
          </div>

          <button
            className="w-full bg-mk-card border border-mk-border text-mk-text font-bold rounded-r-btn py-3.5 text-[15px] hover:bg-mk-raised transition-colors"
            onClick={() => { setStep('form'); setError('') }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  // ── Login / Register ────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-mk-bg flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-[420px] bg-mk-card border border-mk-card-border rounded-r-card shadow-2xl shadow-black/60 p-8">

        {/* Brand */}
        <div className="text-center mb-7">
          <div className="text-[13px] font-black tracking-[0.15em] text-mk-accent uppercase mb-1">
            Sabula 256
          </div>
          <h1 className="text-[22px] font-black text-mk-text mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-[13px] text-mk-muted">
            {mode === 'login' ? 'Sign in to your account' : 'Start predicting with Sabula 256'}
          </p>
        </div>

        {/* Mode tabs */}
        <div className="flex bg-mk-raised rounded-r-btn p-1 mb-6 gap-0.5">
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 rounded-r-btn py-2.5 text-sm font-bold transition-all ${
                mode === m
                  ? 'bg-mk-accent text-black'
                  : 'text-mk-muted hover:text-mk-secondary bg-transparent'
              }`}
            >
              {m === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 bg-white text-[#1f2937] border border-gray-300 rounded-r-btn py-3 text-[15px] font-bold mb-5 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {loading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-mk-border" />
          <span className="text-[12px] text-mk-muted font-semibold">or</span>
          <div className="flex-1 h-px bg-mk-border" />
        </div>

        {/* ── Login form ── */}
        {mode === 'login' && (
          <>
            <div className="mb-4">
              <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">Email address</label>
              <input
                type="email"
                className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="text-[13px] font-semibold text-mk-muted">Password</label>
                <button
                  type="button"
                  onClick={() => { setStep('forgot'); setError('') }}
                  className="text-[12px] text-mk-accent hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

            <button
              className="w-full bg-mk-accent text-black font-bold rounded-r-btn py-3.5 text-[15px] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 mt-2"
              disabled={loading}
              onClick={handleLogin}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </>
        )}

        {/* ── Register form — 2 steps ── */}
        {mode === 'register' && (
          <>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {([1, 2] as const).map(n => (
                <div
                  key={n}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    regStep === n ? 'w-6 bg-mk-accent' : 'w-2 bg-mk-border'
                  }`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait" custom={stepDir}>
              {regStep === 1 ? (
                <motion.div
                  key="step1"
                  custom={stepDir}
                  initial={{ x: stepDir * 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: stepDir * -40, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <div className="mb-4">
                    <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">Email address</label>
                    <input
                      type="email"
                      className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">Password</label>
                    <input
                      type="password"
                      className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">Confirm password</label>
                    <input
                      type="password"
                      className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>

                  {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

                  <button
                    className="w-full bg-mk-accent text-black font-bold rounded-r-btn py-3.5 text-[15px] hover:brightness-110 active:scale-95 transition-all mt-2"
                    onClick={handleNextStep}
                  >
                    Next →
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  custom={stepDir}
                  initial={{ x: stepDir * 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: stepDir * -40, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <div className="mb-4">
                    <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">Full name</label>
                    <input
                      type="text"
                      className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your full name"
                      autoComplete="name"
                      autoFocus
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">
                      Phone <span className="font-normal text-mk-muted">(for deposits &amp; withdrawals)</span>
                    </label>
                    <input
                      type="tel"
                      className="w-full bg-mk-raised border border-mk-border rounded-r-btn px-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="0712 345 678"
                      autoComplete="tel"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-[13px] font-semibold text-mk-muted mb-1.5">
                      Username <span className="font-normal text-mk-muted">(optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mk-muted text-[15px] pointer-events-none">@</span>
                      <input
                        type="text"
                        className="w-full bg-mk-raised border border-mk-border rounded-r-btn pl-7 pr-3.5 py-3 text-[15px] text-mk-text outline-none focus:border-mk-accent transition-colors placeholder:text-mk-muted"
                        value={username}
                        onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20))}
                        placeholder="your_handle"
                        autoComplete="username"
                        maxLength={20}
                      />
                    </div>
                    {username && username.length < 3 && (
                      <p className="text-[11px] text-mk-muted mt-1">At least 3 characters</p>
                    )}
                  </div>

                  <div className="flex items-start gap-2.5 mb-4">
                    <input
                      id="terms-cb"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={e => { setTermsAccepted(e.target.checked); if (e.target.checked) setError('') }}
                      className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer"
                      style={{ accentColor: 'var(--mk-accent)' }}
                    />
                    <label htmlFor="terms-cb" className="text-[13px] text-mk-muted leading-relaxed cursor-pointer">
                      I agree to the{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-mk-accent underline" onClick={e => e.stopPropagation()}>Terms</a>
                      ,{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-mk-accent underline" onClick={e => e.stopPropagation()}>Privacy Policy</a>
                      {' & '}
                      <a href="/responsible-gambling" target="_blank" rel="noopener noreferrer" className="text-mk-accent underline" onClick={e => e.stopPropagation()}>Responsible Gambling Policy</a>
                      . I am 18+.
                    </label>
                  </div>

                  {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

                  <button
                    className="w-full bg-mk-accent text-black font-bold rounded-r-btn py-3.5 text-[15px] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 mt-2"
                    disabled={loading || !termsAccepted}
                    onClick={handleRegister}
                  >
                    {loading ? 'Creating account…' : 'Create account'}
                  </button>

                  <button
                    onClick={handleBack}
                    className="w-full mt-3 text-[13px] text-mk-muted hover:text-mk-secondary transition-colors bg-transparent border-none cursor-pointer py-2"
                  >
                    ← Back
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}
