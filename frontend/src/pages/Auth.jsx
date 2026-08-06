import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Loader2, Mail, Lock, AlertCircle, Sparkles, ArrowRight, Zap, User, ArrowLeft, CheckCircle2, KeyRound, Clock, Eye } from 'lucide-react';
import LogoIcon from '../components/LogoIcon';
import { api } from '../lib/api';
import { useGuestStore } from '../store/useGuestStore';

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState('login'); // login | signup | forgot | reset
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [cooldown, setCooldown] = useState(0); // seconds remaining
  const [shakeError, setShakeError] = useState(false);
  const cooldownRef = useRef(null);
  const { login, signup, signInWithGoogle, resetPassword, updatePassword, session } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [oauthProcessing, setOauthProcessing] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const startGuestSession = useGuestStore((state) => state.startGuestSession);
  const [guestLoading, setGuestLoading] = useState(false);

  // Detect OAuth callback: Supabase appends tokens to the hash fragment
  // e.g. /auth#access_token=...&refresh_token=...
  // We need to let Supabase's onAuthStateChange parse these before navigating.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token') || hash.includes('refresh_token') || hash.includes('type=recovery'))) {
      setOauthProcessing(true);
      // Supabase JS client automatically detects the hash fragment
      // and fires onAuthStateChange. We just need to wait.
      // Set a safety timeout in case something goes wrong.
      const timeout = setTimeout(() => {
        setOauthProcessing(false);
        setError('Sign-in took too long. Please try again.');
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, []);

  // If already logged in (or OAuth callback succeeded), redirect to dashboard
  useEffect(() => {
    if (session) {
      setOauthProcessing(false);
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  // Show toast if guest was blocked from an auth-only route
  useEffect(() => {
    if (location.state?.guestBlocked) {
      setError('Sign up to access this feature. Guest mode only includes AI demo tools.');
    }
  }, [location.state]);

  // Detect recovery callback from Supabase email link
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'recovery') {
      setMode('reset');
    }
  }, [searchParams]);

  // Restore cooldown from localStorage on mount (prevents bypass via refresh)
  useEffect(() => {
    const stored = localStorage.getItem('reset_cooldown_until');
    if (stored) {
      const remaining = Math.ceil((parseInt(stored) - Date.now()) / 1000);
      if (remaining > 0) setCooldown(remaining);
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) {
      clearInterval(cooldownRef.current);
      return;
    }
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          localStorage.removeItem('reset_cooldown_until');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current);
  }, [cooldown]);

  const startCooldown = (seconds = 60) => {
    setCooldown(seconds);
    localStorage.setItem('reset_cooldown_until', String(Date.now() + seconds * 1000));
  };

  const triggerShake = () => {
    setShakeError(true);
    setTimeout(() => setShakeError(false), 500);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/');
      } else if (mode === 'signup') {
        await signup(email, password, name);
        navigate('/');
      } else if (mode === 'forgot') {
        if (cooldown > 0) {
          setError(`Please wait ${cooldown}s before requesting another link.`);
          triggerShake();
          setIsLoading(false);
          return;
        }
        await resetPassword(email);
        setSuccess('Password reset link sent! Check your email inbox (including spam).');
        startCooldown(60);
      } else if (mode === 'reset') {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          triggerShake();
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          triggerShake();
          setIsLoading(false);
          return;
        }
        await updatePassword(password);
        setSuccess('Password updated successfully! Redirecting...');
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (err) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('exceeded')) {
        startCooldown(120); // enforce 2-minute cooldown on rate limit hit
        setError('Too many requests. Please wait 2 minutes before trying again.');
      } else if (msg.includes('user not found') || msg.includes('no user')) {
        // Don't reveal if email exists — security best practice
        setSuccess('If an account exists with this email, a reset link has been sent.');
        startCooldown(60);
      } else {
        setError(err.message || 'An error occurred.');
      }
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome back';
      case 'signup': return 'Create account';
      case 'forgot': return 'Reset password';
      case 'reset': return 'Set new password';
      default: return 'Welcome';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return 'Sign in to your Lockin account';
      case 'signup': return 'Start your AI productivity journey';
      case 'forgot': return "Enter your email and we'll send a reset link";
      case 'reset': return 'Choose a strong new password';
      default: return '';
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
  };

  // Show a loading screen while processing OAuth callback tokens
  if (oauthProcessing) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden noise-bg">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-6 z-10"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-accent to-neonPurple flex items-center justify-center shadow-[0_8px_32px_rgba(99,102,241,0.3)] relative"
          >
            <LogoIcon className="w-8 h-8 relative z-10" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary via-accent to-neonPurple animate-pulse opacity-40 blur-xl"></div>
          </motion.div>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-gray-400 font-medium">Signing you in...</p>
          </div>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/[0.06] border border-red-500/20 text-red-400 p-3.5 rounded-xl flex items-start gap-2.5 text-[13px] max-w-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden noise-bg">
      {/* Background gradient orbs */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.06, 0.08, 0.06] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-primary rounded-full blur-[150px] pointer-events-none"
      />
      <motion.div 
        animate={{ scale: [1, 1.15, 1], opacity: [0.04, 0.06, 0.04] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-neonPurple rounded-full blur-[120px] pointer-events-none"
      />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)] pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-[420px] w-full z-10 relative"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary via-accent to-neonPurple flex items-center justify-center shadow-[0_8px_32px_rgba(99,102,241,0.3)] mb-6 relative"
          >
            <LogoIcon className="w-8 h-8 relative z-10" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary via-accent to-neonPurple animate-pulse opacity-40 blur-xl"></div>
          </motion.div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {getTitle()}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {getSubtitle()}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Auth Card */}
        <motion.div 
          className={`glass-panel rounded-2xl p-7 border border-white/[0.06] relative overflow-hidden ${shakeError ? 'animate-shake' : ''}`}
        >
          {/* Subtle top gradient line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
          
          <form className="space-y-5 flex flex-col" onSubmit={handleAuth}>
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25 }}
                  className="bg-red-500/[0.06] border border-red-500/20 text-red-400 p-3.5 rounded-xl flex items-start gap-2.5 text-[13px] overflow-hidden"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="bg-emerald-500/[0.06] border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl flex items-start gap-2.5 text-[13px] overflow-hidden"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  </motion.div>
                  <p>{success}</p>
                </motion.div>
              )}
            </AnimatePresence>
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={mode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-3 flex flex-col"
              >
                {/* Name field — signup only */}
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="text-[11px] font-semibold tracking-wide uppercase text-gray-500 mb-1.5 block">Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:bg-white/[0.04] input-glow transition-all"
                        placeholder="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Email field — login, signup, forgot */}
                {mode !== 'reset' && (
                  <div>
                    <label className="text-[11px] font-semibold tracking-wide uppercase text-gray-500 mb-1.5 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input
                        id="email-address"
                        name="email"
                        type="email"
                        required
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:bg-white/[0.04] input-glow transition-all"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Password field — login, signup, reset */}
                {mode !== 'forgot' && (
                  <div>
                    <label className="text-[11px] font-semibold tracking-wide uppercase text-gray-500 mb-1.5 block">
                      {mode === 'reset' ? 'New Password' : 'Password'}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        minLength={6}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:bg-white/[0.04] input-glow transition-all"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Confirm password — reset only */}
                {mode === 'reset' && (
                  <div>
                    <label className="text-[11px] font-semibold tracking-wide uppercase text-gray-500 mb-1.5 block">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input
                        id="confirm-password"
                        name="confirmPassword"
                        type="password"
                        required
                        minLength={6}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:bg-white/[0.04] input-glow transition-all"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Forgot password link — login mode only */}
            {mode === 'login' && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-[12px] text-gray-500 hover:text-primary transition-colors font-medium"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <motion.button
              type="submit"
              disabled={isLoading || (mode === 'forgot' ? (!email || cooldown > 0) : mode === 'reset' ? !password || !confirmPassword : !email || !password || (mode === 'signup' && !name))}
              whileHover={!isLoading ? { scale: 1.02 } : undefined}
              whileTap={!isLoading ? { scale: 0.98 } : undefined}
              className="btn-primary w-full flex justify-center items-center gap-2 py-3 px-4 text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'forgot' && cooldown > 0 ? (
                <>
                  <Clock className="w-4 h-4" />
                  Retry in {cooldown}s
                </>
              ) : (
                <>
                  {mode === 'login' && 'Sign in'}
                  {mode === 'signup' && 'Create account'}
                  {mode === 'forgot' && 'Send reset link'}
                  {mode === 'reset' && 'Update password'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>

            {/* Google Sign In — login/signup modes only */}
            {(mode === 'login' || mode === 'signup') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}
                className="mt-2"
              >
                <div className="relative flex items-center justify-center mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.06]"></div>
                  </div>
                  <div className="relative px-4 bg-transparent text-[11px] text-gray-500 font-medium tracking-wider uppercase">
                    or continue with
                  </div>
                </div>
                <motion.button
                  type="button"
                  onClick={async () => {
                    setGoogleLoading(true);
                    setError(null);
                    try {
                      await signInWithGoogle();
                      // signInWithOAuth triggers a full-page redirect to Google.
                      // The page will unload, so we keep the loading state on.
                      // If we're still here after 5s (e.g. popup blocked), reset.
                      setTimeout(() => setGoogleLoading(false), 5000);
                    } catch (err) {
                      setError(err.message || 'Google sign-in failed. Please try again.');
                      triggerShake();
                      setGoogleLoading(false);
                    }
                  }}
                  disabled={googleLoading}
                  whileHover={!googleLoading ? { scale: 1.02 } : undefined}
                  whileTap={!googleLoading ? { scale: 0.98 } : undefined}
                  className="w-full flex justify-center items-center gap-2.5 py-3 px-4 text-sm font-semibold rounded-xl border border-white/[0.08] bg-white text-gray-900 hover:bg-gray-50 hover:border-white/[0.15] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {googleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                  ) : (
                    <>
                      <GoogleIcon />
                      Google
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}

            {/* Try as Guest button — login/signup modes only */}
            {(mode === 'login' || mode === 'signup') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mt-2"
              >
                <div className="relative flex items-center justify-center mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.06]"></div>
                  </div>
                  <div className="relative px-4 bg-transparent text-[11px] text-gray-500 font-medium tracking-wider uppercase">
                    or
                  </div>
                </div>
                <motion.button
                  type="button"
                  onClick={async () => {
                    setGuestLoading(true);
                    setError(null);
                    try {
                      const resp = await api.post('/api/auth/guest');
                      const { guest_token, expires_at, usage, limits } = resp.data;
                      startGuestSession(guest_token, expires_at, usage, limits);
                      navigate('/');
                    } catch (err) {
                      setError('Failed to start guest session. Please try again.');
                    } finally {
                      setGuestLoading(false);
                    }
                  }}
                  disabled={guestLoading}
                  whileHover={!guestLoading ? { scale: 1.02 } : undefined}
                  whileTap={!guestLoading ? { scale: 0.98 } : undefined}
                  className="w-full flex justify-center items-center gap-2.5 py-3 px-4 text-sm font-semibold rounded-xl border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {guestLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Eye className="w-4 h-4 text-gray-400" />
                      Try as Guest
                      <span className="text-[10px] text-gray-500 font-normal ml-1">— no account needed</span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </form>
        </motion.div>
        
        {/* Footer links */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center text-[13px]"
        >
          {mode === 'login' && (
            <p className="text-gray-600">
              Don't have an account?{' '}
              <button onClick={() => switchMode('signup')} className="font-semibold text-primary hover:text-primary/80 transition-colors">
                Sign up
              </button>
            </p>
          )}
          {mode === 'signup' && (
            <p className="text-gray-600">
              Already have an account?{' '}
              <button onClick={() => switchMode('login')} className="font-semibold text-primary hover:text-primary/80 transition-colors">
                Sign in
              </button>
            </p>
          )}
          {(mode === 'forgot' || mode === 'reset') && (
            <button
              onClick={() => switchMode('login')}
              className="text-gray-500 hover:text-primary transition-colors flex items-center gap-1.5 mx-auto font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </button>
          )}
        </motion.div>

        {/* Trust badges */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex items-center justify-center gap-6 text-[11px] text-gray-700"
        >
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            <span>AI-Powered</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-gray-800"></div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            <span>End-to-end encrypted</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Auth;
