import { useEffect, useRef, useState } from 'react'
import { GoogleOAuthProvider, useGoogleOneTapLogin } from '@react-oauth/google'
import { toast } from 'sonner'
import { useAuthUser } from '../hooks/useAuthUser'
import {
  signInWithGoogleOneTap,
  getGoogleClientId,
  googleOneTapSupported,
} from '../lib/auth'

/**
 * Homepage Google One Tap for signed-out visitors.
 *
 * Google's One Tap is powerful but intrusive — production sites cap how often
 * it can appear so it never nags. Rules enforced here:
 *   - only for signed-out visitors (and only when backend auth + client id
 *     are configured, same gate as the auth page);
 *   - shown at most once per browser session and at most once per calendar
 *     day, then suppressed until the visitor signs out (so a returning user
 *     can be prompted again, per Google's guidance);
 *   - a dismissal, a success, or an exchange failure all record the "shown"
 *     marker so it won't immediately re-prompt;
 *   - a ~2s delay after mount so it never fights first paint.
 */

const SESSION_KEY = 'expedition.googleOnetap.dismissedSession'
const DAILY_KEY = 'expedition.googleOnetap.lastShownDay'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Whether a homepage One Tap prompt should appear right now. Pure + testable. */
export function shouldPromptHomeOneTap(): boolean {
  if (!googleOneTapSupported()) return false
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return false
    return localStorage.getItem(DAILY_KEY) !== todayKey()
  } catch {
    // Storage blocked (private mode etc.) — fall back to allowing the prompt.
    return true
  }
}

/** Record that the prompt was shown/answered so it is not re-shown too soon. */
export function markHomeOneTapShown(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
    localStorage.setItem(DAILY_KEY, todayKey())
  } catch {
    /* ignore — storage is best-effort */
  }
}

/** Re-enable prompting (called when the visitor signs out). */
export function clearHomeOneTapCaps(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(DAILY_KEY)
  } catch {
    /* ignore */
  }
}

function GoogleOneTapInner() {
  useGoogleOneTapLogin({
    onSuccess: async (credentialResponse) => {
      markHomeOneTapShown()
      const credential = credentialResponse?.credential
      if (!credential) return
      try {
        await signInWithGoogleOneTap(credential)
        toast.success('Signed in successfully')
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Google sign in failed')
      }
    },
    onError: () => {
      // Covers the visitor dismissing the prompt — don't re-ask this session.
      markHomeOneTapShown()
    },
    cancel_on_tap_outside: false,
  })

  return null
}

export default function GoogleOneTapPrompt() {
  const user = useAuthUser()
  const [armed, setArmed] = useState(false)
  const prevUserRef = useRef(user)

  // Arm (after a short delay) only while signed out and within the caps.
  useEffect(() => {
    if (user || !googleOneTapSupported()) return
    if (!shouldPromptHomeOneTap()) return
    const timer = window.setTimeout(() => setArmed(true), 2000)
    return () => window.clearTimeout(timer)
  }, [user])

  // A real sign-out should allow prompting again on the next visit/session.
  useEffect(() => {
    if (prevUserRef.current && !user) {
      clearHomeOneTapCaps()
      setArmed(false)
    }
    prevUserRef.current = user
  }, [user])

  if (user || !googleOneTapSupported() || !armed) return null

  return (
    <GoogleOAuthProvider clientId={getGoogleClientId()}>
      <GoogleOneTapInner />
    </GoogleOAuthProvider>
  )
}
