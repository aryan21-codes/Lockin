import React, { useEffect, useRef } from 'react';
import { useSpring, useTransform, motion, useInView } from 'framer-motion';

/**
 * Smooth animated counter using Framer Motion spring.
 * Counts from 0 → value with spring physics.
 */
const AnimatedCounter = ({ 
  value = 0, 
  className = '',
  duration = 1.2,
  delay = 0,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  
  const springValue = useSpring(0, {
    stiffness: 80,
    damping: 20,
    duration: duration * 1000,
  });

  const displayValue = useTransform(springValue, (v) => Math.round(v));

  useEffect(() => {
    const numericValue = parseInt(value, 10);
    if (isNaN(numericValue)) return;
    
    if (isInView) {
      const timer = setTimeout(() => {
        springValue.set(numericValue);
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [value, isInView, springValue, delay]);

  return (
    <motion.span ref={ref} className={className}>
      {displayValue}
    </motion.span>
  );
};

export default AnimatedCounter;
