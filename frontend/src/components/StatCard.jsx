import React, { useEffect, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';

const StatCard = ({ icon: Icon, label, value, colorClass, delay = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  let mouseX = useMotionValue(0);
  let mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    let { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10);
    if (isNaN(end)) return;
    
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    
    let totalDuration = 800;
    let incrementTime = (totalDuration / end);
    let timer = setInterval(() => {
      start += 1;
      setDisplayValue(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);
    
    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div 
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ delay: delay * 0.06, duration: 0.4, ease: "easeOut" }}
       onMouseMove={handleMouseMove}
       whileHover={{ y: -2 }}
       className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group cursor-default"
    >
       <motion.div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                180px circle at ${mouseX}px ${mouseY}px,
                rgba(255, 255, 255, 0.04),
                transparent 80%
              )
            `,
          }}
        />

       <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 z-10 group-hover:scale-105 transition-transform duration-300 bg-white/[0.04] border border-white/[0.04]`}>
           <Icon className={`w-5 h-5 ${colorClass}`} />
       </div>
       <div className="z-10 flex flex-col justify-center">
           <h4 className="text-gray-500 text-[11px] font-semibold tracking-wider uppercase">{label}</h4>
           <div className="text-2xl font-bold text-white tracking-tight mt-0.5" style={{ fontFeatureSettings: '"tnum" 1' }}>
             {displayValue}
           </div>
       </div>
    </motion.div>
  );
};

export default StatCard;
