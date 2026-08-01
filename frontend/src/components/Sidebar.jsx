import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useGuestStore } from '../store/useGuestStore';
import { LayoutDashboard, FileText, MonitorPlay, Presentation, CheckSquare, StickyNote, Layers, Terminal, Sparkles, ArrowUpRight, Zap, Brain, Target, Lock as LockIcon } from 'lucide-react';
import LogoIcon from './LogoIcon';

// Routes guests CAN access
const GUEST_ALLOWED_PATHS = ['/', '/notes', '/flashcards', '/code-explainer', '/ppt'];

const Sidebar = () => {
  const { isSidebarOpen } = useStore();
  const isGuest = useGuestStore((state) => state.isGuest);
  const location = useLocation();
  const navigate = useNavigate();

  const mainNav = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  ];

  const aiTools = [
    { name: 'AI Workflow', path: '/workflow', icon: Zap, color: 'text-cyan-400' },
    { name: 'Exam Intel', path: '/exam-intelligence', icon: Target, color: 'text-rose-400' },
    { name: 'AI Notes', path: '/notes', icon: FileText, color: 'text-amber-400' },
    { name: 'YT Summarizer', path: '/youtube', icon: MonitorPlay, color: 'text-red-400' },
    { name: 'PPT Generator', path: '/ppt', icon: Presentation, color: 'text-orange-400' },
    { name: 'Flashcards', path: '/flashcards', icon: Layers, color: 'text-violet-400' },
    { name: 'Code Explainer', path: '/code-explainer', icon: Terminal, color: 'text-blue-400' },
  ];

  const intelligence = [
    { name: 'My Brain', path: '/brain', icon: Brain, color: 'text-fuchsia-400' },
  ];

  const workspace = [
    { name: 'Todo List', path: '/todos', icon: CheckSquare, color: 'text-emerald-400' },
    { name: 'Sticky Notes', path: '/sticky', icon: StickyNote, color: 'text-yellow-400' },
  ];

  const NavItem = ({ item }) => {
    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
    const [isHovered, setIsHovered] = React.useState(false);
    const isLocked = isGuest && !GUEST_ALLOWED_PATHS.includes(item.path);
    
    return (
      <NavLink 
        to={isLocked ? '/auth' : item.path}
        state={isLocked ? { guestBlocked: true } : undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 group relative z-0 ${
          isLocked 
            ? 'text-gray-700 cursor-not-allowed'
            : isActive ? 'text-white' : 'text-gray-500 hover:text-white'
        }`}
      >
        {isActive && !isLocked && (
          <motion.div
            layoutId="sidebar-active-bg"
            className="absolute inset-0 bg-white/[0.08] rounded-xl -z-10"
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
        )}
        {isHovered && !isActive && !isLocked && (
          <motion.div
            layoutId="sidebar-hover-bg"
            className="absolute inset-0 bg-white/[0.04] rounded-xl -z-10"
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
        )}

        {/* Animated active indicator */}
        {isActive && !isLocked && (
          <motion.div
            layoutId="sidebar-active-indicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.8)]"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        
        <motion.div
          animate={isActive ? { scale: 1 } : { scale: isHovered ? 1.05 : 1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <item.icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${
            isLocked ? 'text-gray-700' 
            : isActive ? 'text-primary drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]' 
            : item.color || 'text-gray-500'
          }`} />
        </motion.div>
        
        <span className={`text-[13px] font-medium whitespace-nowrap transition-all duration-300 flex-1 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'} ${isLocked ? 'text-gray-700' : ''}`}>
          {item.name}
        </span>

        {/* Lock icon for guest-restricted items */}
        {isLocked && isSidebarOpen && (
          <LockIcon className="w-3 h-3 text-gray-700 shrink-0" />
        )}
      </NavLink>
    );
  };

  const SectionLabel = ({ label }) => (
    <div className={`px-3 mb-1.5 mt-6 first:mt-0 transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
      <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-600">{label}</span>
    </div>
  );

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col py-5 bg-background border-r border-white/[0.04] transition-all duration-300 shrink-0 h-full ${
      isSidebarOpen 
        ? 'translate-x-0 w-60 px-3' 
        : '-translate-x-full w-60 pointer-events-none md:pointer-events-auto md:translate-x-0 md:w-[68px] md:px-2'
    } md:relative md:inset-auto md:z-20`}>
      
      {/* Logo */}
      <motion.div 
        className="flex items-center gap-2.5 mb-8 px-2 overflow-hidden cursor-pointer" 
        onClick={() => navigate('/')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="w-10 h-10 flex items-center justify-center shrink-0 relative">
          <LogoIcon className="w-full h-full drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]" />
        </div>
        <div className={`flex flex-col transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
          <h1 className="font-bold text-[15px] tracking-tight text-white whitespace-nowrap leading-tight">
            Lock<span className="text-primary">in</span>
          </h1>
          <span className="text-[9px] font-medium tracking-[0.15em] uppercase text-gray-600 leading-tight">AI Platform</span>
        </div>
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto custom-scrollbar">
        {mainNav.map((item) => <NavItem key={item.path} item={item} />)}
        
        <SectionLabel label="AI Tools" />
        {aiTools.map((item) => <NavItem key={item.path} item={item} />)}

        <SectionLabel label="Intelligence" />
        {intelligence.map((item) => <NavItem key={item.path} item={item} />)}

        <SectionLabel label="Workspace" />
        {workspace.map((item) => <NavItem key={item.path} item={item} />)}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-white/[0.04] px-1">
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-3 mx-1 p-3 rounded-xl border ${
              isGuest 
                ? 'bg-gradient-to-br from-amber-500/[0.06] to-orange-500/[0.04] border-amber-500/[0.12]'
                : 'bg-gradient-to-br from-primary/[0.08] to-neonPurple/[0.04] border-primary/[0.12]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {isGuest ? (
                <>
                  <LockIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-semibold text-gray-300">Guest Mode</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-semibold text-gray-300">Pro Plan Active</span>
                </>
              )}
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              {isGuest
                ? '3 free tries per AI tool. Sign up for unlimited.'
                : 'Unlimited AI generations and priority processing.'}
            </p>
            {isGuest && (
              <motion.button
                onClick={() => navigate('/auth')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-2 w-full text-center text-[10px] font-semibold text-amber-400 bg-amber-500/[0.1] border border-amber-500/[0.15] rounded-lg py-1.5 hover:bg-amber-500/[0.2] transition-colors"
              >
                Sign Up Free →
              </motion.button>
            )}
          </motion.div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
