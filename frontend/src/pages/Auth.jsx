import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Mail, Lock, AlertCircle, Sparkles, ArrowRight, Zap, User, ArrowLeft, CheckCircle2, KeyRound, Clock } from 'lucide-react';

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
  const { login, signup, resetPassword, updatePassword, session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (session) navigate('/');
  }, [session, navigate]);

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
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {mode === 'forgot' || mode === 'reset' 
                  ? <KeyRound className="w-6 h-6 text-white" />
                  : <Sparkles className="w-6 h-6 text-white" />
                }
              </motion.div>
            </AnimatePresence>
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
