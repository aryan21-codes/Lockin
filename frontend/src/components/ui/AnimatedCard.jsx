import React from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';

const AnimatedCard = ({ 
  children, 
  className = '', 
  delay = 0, 
  index = 0,
  onClick,
  hover = true,
  spotlight = true,
  ...props 
}) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    if (!spotlight) return;
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const spotlightBg = useMotionTemplate`
    radial-gradient(
      280px circle at ${mouseX}px ${mouseY}px,
      rgba(255, 255, 255, 0.04),
      transparent 80%
    )
  `;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: (delay || index * 0.08),
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={hover ? { y: -3, scale: 1.02, transition: { type: 'spring', stiffness: 260, damping: 22 } } : undefined}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      className={`group relative rounded-2xl glass-card overflow-hidden transition-shadow duration-300 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {/* Spotlight overlay */}
      {spotlight && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
          style={{ background: spotlightBg }}
        />
      )}
      {children}
    </motion.div>
  );
};

export default AnimatedCard;
