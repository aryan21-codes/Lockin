import React from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description, path, colorClass, delay = 0 }) => {
  const navigate = useNavigate();
  let mouseX = useMotionValue(0);
  let mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    let { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -4, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate(path)}
        onMouseMove={handleMouseMove}
        className="group relative flex flex-col gap-3.5 rounded-2xl glass-panel p-5 cursor-pointer overflow-hidden transition-all duration-300"
    >
        {/* Spotlight */}
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                400px circle at ${mouseX}px ${mouseY}px,
                rgba(255, 255, 255, 0.08),
                transparent 80%
              )
            `,
          }}
        />
        
        {/* Top row */}
        <div className="flex items-start justify-between z-10">
          <div className={`w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.04] flex items-center justify-center ${colorClass} group-hover:bg-white/[0.06] transition-all duration-300`}>
             <Icon className="w-5 h-5 transform group-hover:scale-110 transition-transform duration-300" />
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-700 group-hover:text-gray-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
        </div>
        
        <div className="z-10 flex-col flex">
            <h3 className="text-[15px] font-semibold text-gray-200 group-hover:text-white transition-colors">{title}</h3>
            <p className="text-gray-500 mt-1 text-[13px] leading-relaxed group-hover:text-gray-400 transition-colors">{description}</p>
        </div>
        
        {/* Color glow on hover */}
        <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full ${colorClass.split(' ')[0]} bg-current opacity-0 blur-3xl group-hover:opacity-[0.06] transition-opacity duration-500`}></div>
    </motion.div>
  );
};

export default FeatureCard;
