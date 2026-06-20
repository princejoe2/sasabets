'use client'
import { useState, CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

// Values decoded at runtime to avoid BOM injection from Vercel's env vars at compile time.
const _d = (b: string) => Buffer.from(b, 'base64').toString('utf8')
const _SB_URL = _d('aHR0cHM6Ly9qc2lncGh5cmhnbXBheWRvempmYS5zdXBhYmFzZS5jbw==')
const _SB_KEY = _d('ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW1wemFXZHdhSGx5YUdkdGNHRjVaRzk2YW1aaElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzT0RFMk9ERTJNVGNzSW1WNGNDSTZNakE1TnpJMU56WXhOMzAuQUFmaEdqTzdYODlvLUhMMlFWbXBjTnJYeV9NajdhSnFvTEZvZHAwcnlhSQ==')

type Mode = 'login' | 'register'
type Step = 'form' | 'otp' | 'totp'

const LIGHT = {
  bg: '#efe9e7',
  bgGrad: 'linear-gradient(rgba(120,20,20,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(120,20,20,.05) 1px,transparent 1px)',
  glow: 'rgba(155,28,28,.18)',
  glowVal: 'rgba(155,28,28,.15)',
  card: '#ffffff',
  text: '#1c1413',
  muted: '#9a8884',
  border: '#ead9d4',
  accent: '#9b1c1c',
  accentContrast: '#ffffff',
  input: '#f7f1f0',
  shadow: '0 40px 80px -28px rgba(120,20,20,.28),0 10px 24px -12px rgba(0,0,0,.10)',
}

const DARK = {
  bg: '#070a07',
  bgGrad: 'linear-gradient(rgba(52,217,109,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(52,217,109,.06) 1px,transparent 1px)',
  glow: 'rgba(52,217,109,.20)',
  glowVal: 'rgba(52,217,109,.16)',
  card: '#0e130d',
  text: '#e2f5df',
  muted: '#6f8a6c',
  border: '#1d2c1b',
  accent: '#34d96d',
  accentContrast: '#04140a',
  input: '#0a0f09',
  shadow: '0 40px 80px -24px rgba(0,0,0,.85),0 0 0 1px rgba(52,217,109,.05)',
}

function formatPhone(raw: string): string {
  let digits = raw.replace(/[\s\-()]/g, '')
  if (digits.startsWith('0')) digits = '256' + digits.slice(1)
  if (!digits.startsWith('+')) digits = '+' + digits
  return digits
}

export default function AuthPage() {
  const supabase = createBrowserClient(_SB_URL, _SB_KEY)
  const router = useRouter()

  const [dark, setDark] = useState(false)
  const [mode, setMode] = useState<Mode>('login')
  const [step, setStep] = useState<Step>('form')

  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [otp, setOtp] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const v = dark ? DARK : LIGHT
  const isRegister = mode === 'register'

  function switchMode(m: Mode) {
    setMode(m)
    setStep('form')
    setError('')
    setOtp('')
    setPassword('')
    setConfirm('')
  }

  async function handleSubmit() {
    setError('')

    if (isRegister) {
      const formatted = formatPhone(phone)
      if (formatted.length < 10) { setError('Enter a valid Ugandan phone number'); return }
      if (password.length < 6) { setError('Password must be at least 6 characters'); return }
      if (password !== confirm) { setError('Passwords do not match'); return }

      setLoading(true)

      // Block admin numbers from registering as clients
      const phoneDigits = formatted.replace('+', '')
      const checkRes = await fetch('/api/auth/check-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneDigits }),
      })
      const { isAdmin } = await checkRes.json()
      if (isAdmin) {
        setError('This number is reserved for platform administration.')
        setLoading(false)
        return
      }

      // Create user server-side (auto-confirmed, no OTP needed)
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatted, password, name }),
      })
      const regData = await regRes.json()
      if (!regRes.ok) {
        setError(regData.error ?? 'Registration failed')
        setLoading(false)
        return
      }

      // Immediately sign in
      const { error: loginErr } = await supabase.auth.signInWithPassword({ phone: formatted, password })
      if (loginErr) {
        setError(loginErr.message)
      } else {
        router.push('/markets')
      }
      setLoading(false)
    } else if (step === 'totp') {
      // Admin 2FA verification — inline after password
      if (otp.length !== 6) { setError('Enter the 6-digit code from Google Authenticator'); return }
      setLoading(true)
      const res = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otp }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Invalid code — try again')
      } else {
        router.push('/admin')
        router.refresh()
      }
      setLoading(false)
    } else {
      // Login: phone + password, no OTP
      const formatted = formatPhone(phone)
      if (formatted.length < 10) { setError('Enter a valid Ugandan phone number'); return }
      if (!password) { setError('Enter your password'); return }

      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        phone: formatted,
        password,
      })
      if (error) {
        setError(error.message)
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin, totp_enabled')
          .eq('id', data.user.id)
          .single()

        if (profile?.is_admin) {
          if (profile.totp_enabled) {
            setStep('totp') // show authenticator input inline
          } else {
            router.push('/admin/setup-2fa') // first-time: set up 2FA
          }
        } else {
          router.push('/markets')
        }
      }
      setLoading(false)
    }
  }

  // ---- styles ----
  const wrap: CSSProperties = {
    minHeight: '100vh',
    background: v.bg,
    fontFamily: "'JetBrains Mono', monospace",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
    position: 'relative',
  }

  const gridLayer: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundImage: v.bgGrad,
    backgroundSize: '30px 30px',
    pointerEvents: 'none',
    zIndex: 0,
  }

  const glowLayer: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: `radial-gradient(120% 80% at 50% -10%, ${v.glow}, transparent 60%)`,
    pointerEvents: 'none',
    zIndex: 0,
    opacity: 0.9,
  }

  const card: CSSProperties = {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: 404,
    background: v.card,
    border: `1px solid ${v.border}`,
    borderRadius: 22,
    padding: '38px',
    boxShadow: v.shadow,
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '13px 15px',
    border: `1px solid ${v.border}`,
    borderRadius: 11,
    background: v.input,
    color: v.text,
    fontFamily: 'inherit',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color .25s, box-shadow .25s',
  }

  const labelStyle: CSSProperties = {
    display: 'block',
    fontSize: 10,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    color: v.muted,
    fontWeight: 600,
    marginBottom: 8,
  }

  const field = (show: boolean, extra?: CSSProperties): CSSProperties => show
    ? { maxHeight: 110, opacity: 1, marginBottom: 18, overflow: 'hidden', transition: 'max-height .45s cubic-bezier(.4,0,.2,1), opacity .35s ease, margin .45s ease', ...extra }
    : { maxHeight: 0, opacity: 0, marginBottom: 0, overflow: 'hidden', transition: 'max-height .45s cubic-bezier(.4,0,.2,1), opacity .35s ease, margin .45s ease' }

  const heading = step === 'totp'
    ? 'Two-factor auth'
    : isRegister ? 'Create account' : 'Welcome back'

  const subheading = step === 'totp'
    ? 'Open Google Authenticator and enter the 6-digit code for Sabula 256.'
    : isRegister
    ? 'Set up your account to get started.'
    : 'Sign in with your phone and password.'

  const ctaLabel = loading
    ? (step === 'totp' ? 'Verifying...' : isRegister ? 'Creating account...' : 'Signing in...')
    : step === 'totp'
    ? 'Verify & enter dashboard'
    : isRegister ? 'Create account' : 'Sign in'

  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .sb-input::placeholder { color: ${v.muted}; opacity: .6; }
        .sb-input:focus { border-color: ${v.accent} !important; box-shadow: 0 0 0 4px ${v.glowVal} !important; }
        .sb-btn-main:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 22px 40px -12px ${v.glowVal}; }
        .sb-btn-main:active:not(:disabled) { transform: translateY(0); }
      `}</style>

      <div style={wrap}>
        <div style={gridLayer} />
        <div style={glowLayer} />

        <div style={card}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
            <span style={{ fontSize: 10.5, letterSpacing: 2, color: v.accent, fontWeight: 600 }}>
              {'// SECURE ACCESS'}
            </span>
            <button
              onClick={() => setDark(!dark)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
            >
              <span style={{ fontSize: 9.5, letterSpacing: 1.5, color: v.muted, fontWeight: 600 }}>
                {dark ? 'DARK' : 'LIGHT'}
              </span>
              <span style={{ position: 'relative', width: 50, height: 27, borderRadius: 999, background: v.input, border: `1px solid ${v.border}`, display: 'inline-block' }}>
                <span style={{
                  position: 'absolute', top: 2, left: 2,
                  width: 21, height: 21, borderRadius: 999,
                  background: v.accent,
                  boxShadow: `0 2px 8px ${v.glowVal}`,
                  transition: 'transform .35s cubic-bezier(.34,1.4,.5,1)',
                  transform: dark ? 'translateX(23px)' : 'translateX(0)',
                }} />
              </span>
            </button>
          </div>

          {/* Heading */}
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, color: v.text, margin: 0, lineHeight: 1.08, letterSpacing: '-.5px' }}>
            {heading}
          </h1>
          <p style={{ fontSize: 12.5, color: v.muted, margin: '10px 0 26px', lineHeight: 1.5 }}>
            {subheading}
          </p>

          {/* Segmented control — hidden in OTP and TOTP steps */}
          {step !== 'otp' && step !== 'totp' && (
            <div style={{ position: 'relative', display: 'flex', background: v.input, border: `1px solid ${v.border}`, borderRadius: 13, padding: 5, marginBottom: 24 }}>
              <span style={{
                position: 'absolute', top: 5, bottom: 5, left: 5,
                width: 'calc(50% - 5px)',
                background: v.accent,
                borderRadius: 9,
                boxShadow: `0 6px 16px -6px ${v.glowVal}`,
                transition: 'transform .4s cubic-bezier(.4,0,.2,1)',
                transform: isRegister ? 'translateX(100%)' : 'translateX(0)',
              }} />
              <button onClick={() => switchMode('login')} style={{ position: 'relative', zIndex: 1, flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 11, fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', transition: 'color .3s', color: isRegister ? v.muted : v.accentContrast }}>Sign in</button>
              <button onClick={() => switchMode('register')} style={{ position: 'relative', zIndex: 1, flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 11, fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', transition: 'color .3s', color: isRegister ? v.accentContrast : v.muted }}>Register</button>
            </div>
          )}

          {/* Full name — register only */}
          <div style={field(isRegister && step === 'form')}>
            <label style={labelStyle}>Full name</label>
            <input className="sb-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ada Lovelace" style={inputStyle} />
          </div>

          {/* Phone — hidden in OTP and TOTP steps */}
          <div style={field(step === 'form', { marginBottom: 18 })}>
            <label style={labelStyle}>Phone number</label>
            <input
              className="sb-input"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="+256 700 000 000"
              style={inputStyle}
            />
          </div>

          {/* Password — hidden in OTP and TOTP steps */}
          <div style={field(step === 'form', { marginBottom: 18 })}>
            <label style={labelStyle}>Password</label>
            <input
              className="sb-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isRegister && handleSubmit()}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {/* Confirm password — register only */}
          <div style={field(isRegister && step === 'form')}>
            <label style={labelStyle}>Confirm password</label>
            <input
              className="sb-input"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {/* OTP field — registration SMS verification */}
          <div style={field(step === 'otp')}>
            <label style={labelStyle}>Verification code</label>
            <input
              className="sb-input"
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••"
              maxLength={6}
              autoFocus={step === 'otp'}
              style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.4em', fontSize: 16 }}
            />
          </div>

          {/* TOTP field — admin 2FA after password */}
          <div style={field(step === 'totp')}>
            <label style={labelStyle}>Authenticator code</label>
            <input
              className="sb-input"
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••"
              maxLength={6}
              autoFocus={step === 'totp'}
              style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.4em', fontSize: 16 }}
            />
          </div>

          {/* Back link */}
          {(step === 'otp' || step === 'totp') && (
            <div style={{ textAlign: 'right', marginBottom: 10 }}>
              <button
                onClick={() => { setStep('form'); setOtp('') }}
                style={{ background: 'none', border: 'none', fontSize: 11, color: v.muted, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ← {step === 'totp' ? 'Back to login' : 'Different number'}
              </button>
            </div>
          )}

          {error && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{error}</p>}

          {/* CTA */}
          <button
            className="sb-btn-main"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: 15, marginTop: 6, border: 'none', borderRadius: 12,
              background: v.accent, color: v.accentContrast,
              fontFamily: 'inherit', fontWeight: 600, fontSize: 12.5, letterSpacing: 1, textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: `0 16px 32px -12px ${v.glowVal}`,
              transition: 'transform .2s, box-shadow .2s',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <span>{ctaLabel}</span>
            {!loading && <span style={{ fontSize: 15 }}>→</span>}
          </button>

          {/* Terms consent — register only */}
          {isRegister && step === 'form' && (
            <p style={{ textAlign: 'center', marginTop: 14, fontSize: 10.5, color: v.muted, lineHeight: 1.6 }}>
              By creating an account you agree to our{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: v.accent, textDecoration: 'underline', textUnderlineOffset: 2 }}>Terms &amp; Conditions</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: v.accent, textDecoration: 'underline', textUnderlineOffset: 2 }}>Privacy Policy</a>.
            </p>
          )}

          {/* Footer — hidden on TOTP step */}
          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 11.5, color: v.muted, display: step === 'totp' ? 'none' : undefined }}>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <span onClick={() => switchMode(isRegister ? 'login' : 'register')} style={{ color: v.accent, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>
              {isRegister ? 'Sign in' : 'Create one'}
            </span>
          </div>

          {/* Legal links */}
          {step !== 'totp' && (
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 10, color: v.muted, opacity: 0.6 }}>
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}>Terms</a>
              {' · '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}>Privacy</a>
              {' · 18+ only'}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
