import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ImageSlider } from "@/components/ui/image-slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import compyBg from '../assets/icons/compyIcon.png'
import {
  signInWithGoogle,
  signInWithGoogleOneTap,
  signInWithEmail,
  registerWithEmail,
  setAuthReturnTo,
  clearAuthReturnTo,
  getAuthReturnTo,
  getGoogleClientId,
  googleOneTapSupported,
  loadGoogleIdentityScript,
} from '../lib/auth'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface AuthFormProps {
  initialMode?: "signin" | "signup";
  onBack?: () => void;
  onAuthSuccess?: () => void;
}

const styles = `
.auth-spinner-sm {
  width: 18px;
  height: 18px;
  border: 2px solid #ccc;
  border-top-color: #333;
  border-radius: 50%;
  animation: auth-spin 0.6s linear infinite;
  flex-shrink: 0;
}
@keyframes auth-spin { to { transform: rotate(360deg); } }
`

const sliderImages = [
  '/Image01.webp',
  '/Image02.webp',
  '/Image03.webp',
  '/Image04.webp',
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
} as const;

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 12 },
  },
} as const;

/** After a successful sign-in/sign-up, honor a pending return path (e.g. supplier register). */
function useAuthSuccessRedirect(onAuthSuccess?: () => void) {
  const navigate = useNavigate()
  return () => {
    const returnTo = getAuthReturnTo()
    if (returnTo) {
      clearAuthReturnTo()
      navigate(returnTo)
      return
    }
    onAuthSuccess?.()
  }
}

/**
 * Google sign-in. When One Tap is configured (VITE_GOOGLE_CLIENT_ID + backend auth),
 * shows the Google One Tap prompt and exchanges the credential for our own tokens
 * via POST /api/auth/google/onetap. Otherwise falls back to the OAuth redirect flow.
 */
function useGoogleSignIn(successMessage: string, onAuthSuccess?: () => void) {
  const [googleLoading, setGoogleLoading] = useState(false)
  const handleAuthSuccess = useAuthSuccessRedirect(onAuthSuccess)

  useEffect(() => {
    return () => {
      try {
        window.google?.accounts?.id?.cancel()
      } catch {
        /* ignore */
      }
    }
  }, [])

  const handleGoogle = async () => {
    if (!getAuthReturnTo()) setAuthReturnTo('/')

    if (googleOneTapSupported()) {
      flushSync(() => setGoogleLoading(true))
      const loaded = await loadGoogleIdentityScript()
      const accounts = window.google?.accounts?.id
      if (!loaded || !accounts) {
        setGoogleLoading(false)
        toast.error('Unable to load Google sign-in')
        return
      }

      accounts.initialize({
        client_id: getGoogleClientId(),
        callback: async (response: GoogleOneTapResponse) => {
          setGoogleLoading(false)
          if (response?.error) {
            if (response.error !== 'user_cancel' && response.error !== 'canceled') {
              toast.error(response.error_description || 'Google sign in failed')
            }
            return
          }
          if (!response?.credential) return

          try {
            await signInWithGoogleOneTap(response.credential)
            toast.success(successMessage)
            handleAuthSuccess()
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Google sign in failed')
          }
        },
      })

      accounts.prompt()
      setTimeout(() => setGoogleLoading(false), 10000)
      return
    }

    flushSync(() => setGoogleLoading(true))
    try {
      const result = await signInWithGoogle()

      if (result && 'redirected' in result && result.redirected) return

      toast.success(successMessage)
      handleAuthSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Google sign in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  return { googleLoading, handleGoogle }
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GoogleButton({ onClick, loading }: { onClick?: () => void; loading?: boolean }) {
  const { t } = useTranslation()
  return (
    <Button variant="outline" className="w-full gap-2" onClick={onClick} disabled={loading}>
      {loading ? (
        <>
          <div className="auth-spinner-sm" />
          <span className="font-medium">Connecting...</span>
        </>
      ) : (
        <>
          <GoogleG />
          <span className="font-medium">{t('auth.google')}</span>
        </>
      )}
    </Button>
  );
}

function SignInForm({ onSwitchToSignUp, onAuthSuccess }: { onSwitchToSignUp: () => void; onAuthSuccess?: () => void }) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const handleAuthSuccess = useAuthSuccessRedirect(onAuthSuccess)
  const { googleLoading, handleGoogle } = useGoogleSignIn('Signed in successfully', onAuthSuccess)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signInWithEmail(email, password)
      toast.success('Signed in successfully')
      handleAuthSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="w-full max-w-sm"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      key="signin"
    >
      <motion.h1 variants={itemVariants} className="text-3xl font-bold tracking-tight mb-2 font-heading text-foreground">
        {t('auth.welcomeBack')}
      </motion.h1>
      <motion.p variants={itemVariants} className="text-muted-foreground mb-8">
        {t('auth.signInDesc')}
      </motion.p>

      <motion.div variants={itemVariants} className="mb-6">
        <GoogleButton onClick={handleGoogle} loading={googleLoading} />
      </motion.div>

      <motion.div variants={itemVariants} className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="px-2 text-muted-foreground">{t('auth.orContinueWith')}</span>
        </div>
      </motion.div>

      <motion.form variants={itemVariants} className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="signin-email" className="text-foreground">{t('auth.emailAddress')}</Label>
          <Input id="signin-email" type="email" placeholder="m@example.com" required className="bg-white" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="signin-password" className="text-foreground">{t('auth.password')}</Label>
            <a href="#" className="text-sm font-medium text-primary hover:underline">Forgot password?</a>
          </div>
          <Input id="signin-password" type="password" required className="bg-white" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {t('auth.signIn')}
        </Button>
      </motion.form>

      <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground mt-8">
        {t('auth.needNewAccount')}{" "}
        <a href="#" className="font-medium text-primary hover:underline" onClick={(e) => { e.preventDefault(); onSwitchToSignUp() }}>
          {t('auth.register')}
        </a>
      </motion.p>
    </motion.div>
  );
}

function SignUpForm({ onSwitchToSignIn, onAuthSuccess }: { onSwitchToSignIn: () => void; onAuthSuccess?: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const handleAuthSuccess = useAuthSuccessRedirect(onAuthSuccess)
  const { googleLoading, handleGoogle } = useGoogleSignIn('Signed up successfully', onAuthSuccess)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await registerWithEmail(name, email, password)
      toast.success('Account created successfully')
      handleAuthSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="w-full max-w-sm"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      key="signup"
    >
      <motion.h1 variants={itemVariants} className="text-3xl font-bold tracking-tight mb-2 font-heading text-foreground">
        {t('auth.createAccount')}
      </motion.h1>
      <motion.p variants={itemVariants} className="text-muted-foreground mb-8">
        {t('auth.registerDesc')}
      </motion.p>

      <motion.div variants={itemVariants} className="mb-6">
        <GoogleButton onClick={handleGoogle} loading={googleLoading} />
      </motion.div>

      <motion.div variants={itemVariants} className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="px-2 text-muted-foreground">{t('auth.orContinueWith')}</span>
        </div>
      </motion.div>

      <motion.form variants={itemVariants} className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="signup-name" className="text-foreground">{t('auth.fullName')}</Label>
          <Input id="signup-name" type="text" placeholder="Enter your full name" required className="bg-white" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email" className="text-foreground">{t('auth.emailAddress')}</Label>
          <Input id="signup-email" type="email" placeholder="m@example.com" required className="bg-white" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password" className="text-foreground">{t('auth.password')}</Label>
          <Input id="signup-password" type="password" placeholder="Create a password" required className="bg-white" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {t('auth.register')}
        </Button>
      </motion.form>

      <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground mt-8">
        {t('auth.alreadyHaveAccount')}{" "}
        <a href="#" className="font-medium text-primary hover:underline" onClick={(e) => { e.preventDefault(); onSwitchToSignIn() }}>
          {t('auth.signIn')}
        </a>
      </motion.p>
    </motion.div>
  );
}

export default function AuthForm({ initialMode = "signin", onBack, onAuthSuccess }: AuthFormProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);

  return (
    <>
      <style>{styles}</style>
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative">
      <div
        className="absolute inset-0 bg-cover bg-center lg:hidden"
        style={{ backgroundImage: `url(${compyBg})` }}
      />

      <div className="w-full max-w-5xl min-h-[600px] grid grid-cols-1 lg:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl border border-border relative bg-white/80 backdrop-blur-xl lg:bg-card lg:backdrop-blur-none">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow hover:bg-white transition-colors"
            aria-label={t('common.back')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        )}

        <div className="hidden lg:block relative">
          <ImageSlider images={sliderImages} interval={4000} />
        </div>

        <div className="w-full flex flex-col items-center justify-center p-8 md:p-12">
          <AnimatePresence mode="wait">
            {mode === "signin" ? (
              <SignInForm onSwitchToSignUp={() => setMode("signup")} onAuthSuccess={onAuthSuccess} />
            ) : (
              <SignUpForm onSwitchToSignIn={() => setMode("signin")} onAuthSuccess={onAuthSuccess} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
    </>
  );
}
