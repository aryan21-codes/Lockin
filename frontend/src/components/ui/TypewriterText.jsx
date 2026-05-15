import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * Progressively reveals text word-by-word or character-by-character.
 * @param {string} text - The text to reveal
 * @param {string} mode - 'word' or 'char'
 * @param {number} speed - ms per unit (lower = faster)
 * @param {boolean} animate - if false, shows text immediately
 * @param {function} onComplete - callback when animation finishes
 */
const TypewriterText = ({ 
  text = '', 
  mode = 'word', 
  speed = 30, 
  animate = true,
  onComplete,
  className = '',
}) => {
  const [displayedCount, setDisplayedCount] = useState(animate ? 0 : Infinity);
  const timerRef = useRef(null);
  const prevTextRef = useRef('');

  const units = mode === 'word' ? text.split(' ') : text.split('');
  const totalUnits = units.length;

  useEffect(() => {
    // Reset if text changes
    if (text !== prevTextRef.current) {
      prevTextRef.current = text;
      if (animate) {
        setDisplayedCount(0);
      }
    }
  }, [text, animate]);

  useEffect(() => {
    if (!animate || displayedCount >= totalUnits) {
      if (displayedCount >= totalUnits && onComplete) {
        onComplete();
      }
      return;
    }

    timerRef.current = setTimeout(() => {
      setDisplayedCount(prev => prev + 1);
    }, speed);

    return () => clearTimeout(timerRef.current);
  }, [displayedCount, totalUnits, speed, animate, onComplete]);

  if (!animate || displayedCount >= totalUnits) {
    return <span className={className}>{text}</span>;
  }

  const visibleText = mode === 'word' 
    ? units.slice(0, displayedCount).join(' ') 
    : units.slice(0, displayedCount).join('');

  return (
    <span className={className}>
      {visibleText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        className="inline-block w-[2px] h-[1em] bg-primary/60 ml-0.5 align-middle"
      />
    </span>
  );
};

/**
 * Animated loading dots (for AI processing states)
 */
export const PulsingDots = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-1 ${className}`}>
    {[0, 1, 2].map(i => (
      <motion.span
        key={i}
        animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1, 0.85] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        className="w-1.5 h-1.5 rounded-full bg-primary"
      />
    ))}
  </span>
);

/**
 * Step-based AI loading status
 */
export const AILoadingSteps = ({ steps = ['Analyzing…', 'Generating…'], currentStep = 0, className = '' }) => (
  <div className={`flex flex-col items-center gap-4 ${className}`}>
    <div className="flex items-center gap-3">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary"
      />
      <motion.span
        key={currentStep}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm font-medium text-gray-300"
      >
        {steps[Math.min(currentStep, steps.length - 1)]}
      </motion.span>
    </div>
    
    {/* Step indicators */}
    <div className="flex items-center gap-2">
      {steps.map((_, i) => (
        <motion.div
          key={i}
          animate={{
            scale: i === currentStep ? [1, 1.2, 1] : 1,
            backgroundColor: i <= currentStep 
              ? 'rgba(99, 102, 241, 0.8)' 
              : 'rgba(255, 255, 255, 0.08)',
          }}
          transition={{ duration: 0.3 }}
          className="w-2 h-2 rounded-full"
        />
      ))}
    </div>
  </div>
);

export default TypewriterText;
