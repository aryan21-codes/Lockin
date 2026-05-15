import { useAuth } from '../context/AuthContext';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Search, Sparkles, Command, LogOut, History } from 'lucide-react';
import { useStore } from '../store/useStore';
import SearchPalette from './SearchPalette';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { toggleSidebar } = useStore();
  const { user, logout } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const searchInputRef = useRef(null);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Guest';
  const initial = user?.user_metadata?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'G';

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcut: "/" to open search
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger from inputs/textareas
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.key === '/') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="h-14 border-b border-white/[0.02] flex items-center px-5 bg-background/50 backdrop-blur-2xl sticky top-0 z-10 w-full shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <motion.button 
          onClick={toggleSidebar}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="p-2 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-white transition-all duration-200 focus:outline-none"
        >
          <Menu className="w-[18px] h-[18px]" />
        </motion.button>
        
        {/* Search Bar — now clickable to open palette */}
        <motion.div 
          className="ml-4 flex-1 max-w-lg relative hidden md:block group cursor-pointer"
          onClick={() => setIsSearchOpen(true)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-primary transition-colors duration-300" />
          <div className="w-full bg-white/[0.02] border border-white/[0.04] rounded-full py-2 pl-10 pr-12 text-[13px] text-gray-500 group-hover:border-primary/40 group-hover:bg-primary/[0.02] group-hover:shadow-[0_0_12px_rgba(99,102,241,0.15)] transition-all duration-300 select-none">
            Search anything...
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="h-5 px-1.5 bg-white/[0.04] rounded text-[10px] text-gray-500 border border-white/[0.08] font-mono flex items-center shadow-sm">/</kbd>
          </div>
        </motion.div>

        {/* Mobile search button */}
        <motion.button 
          className="ml-3 p-2 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 transition-all duration-200 md:hidden"
          onClick={() => setIsSearchOpen(true)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          <Search className="w-[18px] h-[18px]" />
        </motion.button>

        <div className="ml-auto flex items-center gap-3">
          {/* AI Status Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald/[0.08] border border-emerald/[0.15]">
            <motion.div 
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 rounded-full bg-emerald shadow-[0_0_6px_rgba(16,185,129,0.6)]"
            />
            <span className="text-[11px] font-medium text-emerald tracking-wide">AI Online</span>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-white/[0.06]"></div>
            
          {/* Profile */}
          <div className="flex items-center gap-2.5 pl-1 relative" ref={profileRef}>
             <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-[13px] font-semibold text-gray-200 leading-tight">{displayName}</span>
                <span className="text-[10px] text-gray-500 font-medium tracking-wide uppercase">Pro</span>
             </div>
             <motion.div 
               onClick={() => setIsProfileOpen(!isProfileOpen)}
               whileHover={{ scale: 1.08, boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
               whileTap={{ scale: 0.95 }}
               className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-neonPurple flex items-center justify-center cursor-pointer transition-opacity shadow-[0_4px_12px_rgba(99,102,241,0.3)]"
             >
              <span className="text-white text-xs font-bold">{initial}</span>
             </motion.div>

             {/* Profile Dropdown */}
             <AnimatePresence>
               {isProfileOpen && (
                 <motion.div
                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   exit={{ opacity: 0, y: 10, scale: 0.95 }}
                   transition={{ duration: 0.15 }}
                   className="absolute right-0 top-[calc(100%+0.5rem)] w-48 rounded-xl bg-background border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.4)] overflow-hidden z-50 backdrop-blur-xl"
                 >
                   <div className="p-1">
                     <button
                       onClick={() => {
                         setIsProfileOpen(false);
                         navigate('/history');
                       }}
                       className="flex items-center gap-3 w-full px-3 py-2 text-gray-300 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                     >
                       <History className="w-4 h-4 text-gray-400" />
                       <span className="text-[13px] font-medium">History</span>
                     </button>
                     
                     <div className="h-px w-full bg-white/[0.04] my-1" />
                     
                     <button
                       onClick={() => {
                         setIsProfileOpen(false);
                         handleLogout();
                       }}
                       className="flex items-center gap-3 w-full px-3 py-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/[0.06] transition-colors"
                     >
                       <LogOut className="w-4 h-4" />
                       <span className="text-[13px] font-medium">Log out</span>
                     </button>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Search Palette */}
      <SearchPalette 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
};

export default Navbar;
