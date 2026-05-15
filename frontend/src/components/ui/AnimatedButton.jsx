import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const variantStyles = {
  primary: 'btn-primary',
  secondary: 'bg-white/[0.04] hover:bg-white/[0.07] text-gray-300 border border-white/[0.08] hover:border-white/[0.14]',
  danger: 'bg-red-500/[0.08] hover:bg-red-500/[0.14] text-red-400 border border-red-500/[0.15]',
  ghost: 'bg-transparent hover:bg-white/[0.04] text-gray-400 hover:text-gray-200',
  success: 'bg-emerald-500/[0.08] hover:bg-emerald-500/[0.14] text-emerald-400 border border-emerald-500/[0.15]',
};

const AnimatedButton = ({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  ripple = true,
  onClick,
  type = 'button',
  ...props
}) => {
  const [ripples, setRipples] = useState([]);
  const btnRef = useRef(null);

  const handleClick = (e) => {
    if (disabled || loading) return;

    // Ripple effect
    if (ripple && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();
      setRipples(prev => [...prev, { id, x, y }]);
      setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
    }

    onClick?.(e);
  };

  return (
    <motion.button
      ref={btnRef}
      type={type}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.03, transition: { type: 'spring', stiffness: 280, damping: 20 } } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
      onClick={handleClick}
      className={`relative overflow-hidden font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none ${variantStyles[variant] || ''} ${className}`}
      {...props}
    >
      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map(r => (
          <motion.span
            key={r.id}
            initial={{ scale: 0, opacity: 0.35 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute rounded-full bg-white/20 pointer-events-none"
            style={{
              left: r.x - 10,
              top: r.y - 10,
              width: 20,
              height: 20,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
          </motion.span>
        ) : (
          <motion.span
            key="content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-2 relative z-10"
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default AnimatedButton;
