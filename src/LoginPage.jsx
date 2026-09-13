import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth'
import { useState } from 'react'
import { auth, googleProvider } from './firebase'

const AUTH_ERRORS = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/invalid-email': 'That email address doesn’t look right.',
  'auth/missing-password': 'Enter your password.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/popup-blocked': 'Your browser blocked the sign-in popup. Allow popups for this site and try again.',
  'auth/account-exists-with-different-credential':
    'This email is already registered with a different sign-in method.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled in the Firebase console yet.',
  'auth/configuration-not-found':
    'Firebase Authentication is not set up for this project yet. Enable it in the Firebase console.',
  'auth/unauthorized-domain': 'This domain is not authorized for sign-in in the Firebase console.',
}

// The user closed or replaced the popup — not an error worth showing.
const IGNORED_ERRORS = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])

function describeError(err) {
  return AUTH_ERRORS[err?.code] ?? 'Something went wrong signing in. Please try again.'
}

export default function LoginPage() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const isSignUp = mode === 'signup'

  // On success, onAuthStateChanged in App swaps this page for the awards page.
  async function run(action) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
    } catch (err) {
      if (!IGNORED_ERRORS.has(err?.code)) setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  function handleEmailSubmit(e) {
    e.preventDefault()
    run(() =>
      isSignUp
        ? createUserWithEmailAndPassword(auth, email.trim(), password)
        : signInWithEmailAndPassword(auth, email.trim(), password),
    )
  }

  function handleForgotPassword() {
    if (!email.trim()) {
      setError('Enter your email above, then click “Forgot password?” again.')
      return
    }
    run(async () => {
      await sendPasswordResetEmail(auth, email.trim())
      setNotice(`If an account exists for ${email.trim()}, a password reset email is on its way.`)
    })
  }

  function switchMode() {
    setMode(isSignUp ? 'signin' : 'signup')
    setError('')
    setNotice('')
  }

  return (
    <main className="login">
      <div className="login-card">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">🏆</span>
          <h1>Award Tracker</h1>
        </div>
        <p className="muted">
          {isSignUp ? 'Create an account to start tracking your awards.' : 'Sign in to see your awards.'}
        </p>

        <button
          type="button"
          className="btn btn-google"
          onClick={() => run(() => signInWithPopup(auth, googleProvider))}
          disabled={busy}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="divider"><span>or</span></div>

        <form onSubmit={handleEmailSubmit} className="stack">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={isSignUp ? 6 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <p className="alert alert-error" role="alert">{error}</p>}
          {notice && <p className="alert alert-info" role="status">{notice}</p>}

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="login-footer">
          {!isSignUp && (
            <button type="button" className="link" onClick={handleForgotPassword} disabled={busy}>
              Forgot password?
            </button>
          )}
          <span>
            {isSignUp ? 'Already have an account?' : 'New here?'}{' '}
            <button type="button" className="link" onClick={switchMode} disabled={busy}>
              {isSignUp ? 'Sign in' : 'Create an account'}
            </button>
          </span>
        </div>
      </div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
