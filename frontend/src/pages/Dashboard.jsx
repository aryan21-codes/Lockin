import { useAuth } from '../context/AuthContext';
import React, { useEffect, useState } from 'react';
import { useDashboardData } from '../hooks/useApiQuery';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import FeatureCard from '../components/FeatureCard';
import { StatSkeleton, ActivitySkeleton } from '../components/ui/SkeletonLoader';
import { 
  FileText, MonitorPlay, Presentation, Layers, Terminal, CheckSquare, StickyNote,
  Activity, Zap, Plus, CheckCircle2, Play, Sparkles, TrendingUp, ArrowRight
} from 'lucide-react';

// Skeletons imported from components/ui/SkeletonLoader

const defaultStats = {
  notes_count: 0,
  videos_count: 0,
  ppt_count: 0,
  flashcards_count: 0,
  tasks_completed: 0
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showQuickActions, setShowQuickActions] = useState(false);

  // ─── React Query: single combined fetch, cached for 2 min ───
  const { data, isLoading } = useDashboardData();
  const stats = data?.stats || defaultStats;
  const activity = data?.activity || [];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setShowQuickActions(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const firstName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Guest';
  
  const totalGenerations = stats.notes_count + stats.videos_count + stats.ppt_count + stats.flashcards_count;
  const mockStreak = Math.min(Math.max(Math.floor(totalGenerations / 3), 1), 14);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, ease: "easeOut" }
    }
  };

  return (
    <div className="relative min-h-full pb-20 overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto space-y-10">
        
        {/* HERO HEADER */}
        <motion.header 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6"
        >
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-primary/80 px-3 py-1 bg-primary/[0.08] rounded-full border border-primary/[0.12] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
              Welcome back, <br className="hidden md:block" /><span className="gradient-text font-black">{firstName}</span>
            </h1>
            <p className="text-gray-500 text-[15px] flex items-center gap-2 font-medium">
              <TrendingUp className="w-4 h-4 text-emerald" />
              <span className="text-gray-400">{mockStreak}-day streak</span>
              <span className="text-gray-600">·</span>
              <span>{totalGenerations} generations this week</span>
            </p>
          </div>
          
          <motion.button 
             whileHover={{ scale: 1.02 }}
             whileTap={{ scale: 0.98 }}
             onClick={() => setShowQuickActions(!showQuickActions)}
             className="bg-white/[0.04] hover:bg-white/[0.06] text-gray-300 border border-white/[0.08] hover:border-white/[0.12] px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2.5 text-sm group"
          >
             <Plus className="w-4 h-4 group-hover:rotate-90 group-hover:text-primary transition-all duration-300" />
             Quick Actions 
             <kbd className="hidden sm:flex items-center justify-center h-5 px-1.5 bg-white/[0.04] rounded text-[10px] text-gray-600 border border-white/[0.06] font-mono">G</kbd>
          </motion.button>
        </motion.header>

        {/* QUICK ACTIONS */}
        <AnimatePresence>
          {showQuickActions && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
               <div className="flex flex-wrap gap-3 p-4 glass-panel rounded-2xl">
                 <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/ppt')} className="px-4 py-2 bg-orange-500/[0.06] text-orange-400 border border-orange-500/[0.12] rounded-xl hover:bg-orange-500/[0.12] transition-all flex items-center gap-2 text-[13px] font-medium">
                   <Presentation className="w-3.5 h-3.5" /> Generate Deck
                 </motion.button>
                 <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/notes')} className="px-4 py-2 bg-amber-500/[0.06] text-amber-400 border border-amber-500/[0.12] rounded-xl hover:bg-amber-500/[0.12] transition-all flex items-center gap-2 text-[13px] font-medium">
                   <FileText className="w-3.5 h-3.5" /> Summarize Notes
                 </motion.button>
                 <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/todos')} className="px-4 py-2 bg-emerald-500/[0.06] text-emerald-400 border border-emerald-500/[0.12] rounded-xl hover:bg-emerald-500/[0.12] transition-all flex items-center gap-2 text-[13px] font-medium">
                   <CheckSquare className="w-3.5 h-3.5" /> Add Task
                 </motion.button>
                 <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/flashcards')} className="px-4 py-2 bg-violet-500/[0.06] text-violet-400 border border-violet-500/[0.12] rounded-xl hover:bg-violet-500/[0.12] transition-all flex items-center gap-2 text-[13px] font-medium">
                   <Layers className="w-3.5 h-3.5" /> Create Flashcards
                 </motion.button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STATS */}
        <section>
          {isLoading ? (
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => <StatSkeleton key={i} />)}
             </div>
          ) : (
            <motion.div 
               variants={containerVariants}
               initial="hidden"
               animate="show"
               className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
            >
               <StatCard icon={FileText} label="Notes" value={stats.notes_count} colorClass="text-amber-400" delay={1} />
               <StatCard icon={MonitorPlay} label="Videos" value={stats.videos_count} colorClass="text-red-400" delay={2} />
               <StatCard icon={Presentation} label="Decks" value={stats.ppt_count} colorClass="text-orange-400" delay={3} />
               <StatCard icon={Layers} label="Flashcards" value={stats.flashcards_count} colorClass="text-violet-400" delay={4} />
               <StatCard icon={CheckCircle2} label="Tasks Done" value={stats.tasks_completed} colorClass="text-emerald-400" delay={5} />
            </motion.div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FEATURES */}
          <section className="lg:col-span-2 space-y-5">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-[15px] font-semibold text-gray-300 tracking-tight">AI Tools</h2>
            </div>
            
            <motion.div 
               variants={containerVariants}
               initial="hidden"
               animate="show"
               className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <FeatureCard 
                 icon={FileText} title="Notes Summarizer" 
                 description="Condense documents & PDFs into actionable insights."
                 path="/notes" colorClass="text-amber-400" delay={1}
              />
              <FeatureCard 
                 icon={MonitorPlay} title="YouTube Summarizer" 
                 description="Extract key insights from any YouTube video."
                 path="/youtube" colorClass="text-red-400" delay={2}
              />
              <FeatureCard 
                 icon={Presentation} title="Deck Generator" 
                 description="Create polished slide decks from a prompt."
                 path="/ppt" colorClass="text-orange-400" delay={3}
              />
              <FeatureCard 
                 icon={Terminal} title="Code Explainer" 
                 description="Get line-by-line breakdowns of complex code."
                 path="/code-explainer" colorClass="text-blue-400" delay={4}
              />
              <FeatureCard 
                 icon={Layers} title="Flashcards" 
                 description="Auto-generate spaced-repetition flashcards."
                 path="/flashcards" colorClass="text-violet-400" delay={5}
              />
              <FeatureCard 
                 icon={CheckSquare} title="Task Manager" 
                 description="Track priorities and manage assignments."
                 path="/todos" colorClass="text-emerald-400" delay={6}
              />
            </motion.div>
          </section>

          {/* ACTIVITY */}
          <section className="space-y-5">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-neonPurple" />
              <h2 className="text-[15px] font-semibold text-gray-300 tracking-tight">Recent Activity</h2>
            </div>
            
            <div className="glass-panel p-4 rounded-2xl flex flex-col min-h-[360px]">
              {isLoading ? (
                 <div className="flex-1 flex flex-col gap-2">
                   {[1, 2, 3, 4, 5].map((i) => <ActivitySkeleton key={i} />)}
                 </div>
              ) : activity.length > 0 ? (
                 <div className="flex-1 flex flex-col gap-1">
                   {activity.map((item, idx) => (
                     <motion.div 
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08, duration: 0.4 }}
                        key={item.id} 
                        className="flex gap-3 items-center p-3 rounded-xl hover:bg-white/[0.03] transition-all duration-200 group cursor-default"
                     >
                       <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.04] flex items-center justify-center shrink-0 group-hover:bg-white/[0.06] transition-all">
                         <Activity className="w-4 h-4 text-neonPurple/60 group-hover:text-neonPurple transition-colors" />
                       </div>
                       <div className="flex-1 min-w-0">
                         <h4 className="text-gray-300 font-medium text-[13px] leading-tight truncate group-hover:text-white transition-colors">{item.title}</h4>
                         <p className="text-gray-600 text-[11px] mt-0.5 font-medium">
                           {new Date(item.created_at).toLocaleDateString()} · {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </p>
                       </div>
                     </motion.div>
                   ))}
                   {activity.length >= 5 && (
                     <button onClick={() => navigate('/history')} className="mt-auto pt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase text-gray-600 hover:text-primary transition-colors group">
                       View all activity
                       <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                     </button>
                   )}
                 </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
                   <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)]" />
                   <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4 relative z-10 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                      <Play className="w-6 h-6 text-gray-500 ml-1" />
                   </div>
                   <h3 className="text-gray-300 font-semibold text-[14px] relative z-10">No activity yet</h3>
                   <p className="text-gray-500 text-[12px] mt-2 max-w-[200px] leading-relaxed relative z-10">
                     Your AI-generated content and workflows will appear here.
                   </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
