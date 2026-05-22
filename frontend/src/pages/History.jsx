import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHistoryData } from '../hooks/useApiQuery';
import { useNavigate } from 'react-router-dom';
import { 
  History as HistoryIcon, FileText, MonitorPlay, Presentation, Layers, Terminal, 
  Loader2, Zap, ChevronDown, ChevronUp, BookOpen, HelpCircle, Play
} from 'lucide-react';
import SkeletonLoader from '../components/ui/SkeletonLoader';

const HistoryPage = () => {
  const [activeTab, setActiveTab] = useState('workflow');
  const [expandedId, setExpandedId] = useState(null);
  const navigate = useNavigate();
  const loadMoreRef = useRef(null);

  const tabs = [
    { id: 'workflow', label: 'AI Workflows', icon: Zap, color: 'text-cyan-400' },
    { id: 'notes', label: 'AI Notes', icon: FileText, color: 'text-amber-400' },
    { id: 'youtube', label: 'YT Summaries', icon: MonitorPlay, color: 'text-red-500' },
    { id: 'ppt', label: 'Presentations', icon: Presentation, color: 'text-orange-500' },
    { id: 'flashcards', label: 'Flashcards', icon: Layers, color: 'text-purple-400' },
    { id: 'code_explainer', label: 'Code Explanations', icon: Terminal, color: 'text-neonBlue' }
  ];

  // ─── React Query infinite scroll ──────────────────────────────
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useHistoryData(activeTab);

  // Flatten paginated data into a single array
  const logs = data?.pages?.flat() || [];

  // Reset expanded state when switching tabs
  useEffect(() => {
    setExpandedId(null);
  }, [activeTab]);

  // ─── Intersection Observer for infinite scroll ────────────────
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  // Render workflow-specific card
  const WorkflowCard = ({ log, idx }) => {
    const content = log.content || {};
    const isExpanded = expandedId === log.id;
    const flashcardCount = content.flashcards?.length || 0;
    const mcqCount = content.quiz?.mcq?.length || 0;
    const shortCount = content.quiz?.short?.length || 0;

    return (
      <motion.div
        key={log.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(idx * 0.04, 0.4) }}
        layout
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
      >
        {/* Header row */}
        <motion.button
          onClick={() => toggleExpand(log.id)}
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
          className="w-full flex items-center gap-4 p-5 text-left transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/[0.1] border border-cyan-500/[0.15] flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-white truncate">
              {content.source_file || content.title || 'AI Workflow'}
            </h3>
            <p className="text-[12px] text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
              <span>{new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-gray-700">·</span>
              <span>{flashcardCount} flashcards</span>
              <span className="text-gray-700">·</span>
              <span>{mcqCount + shortCount} quiz Qs</span>
            </p>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
          </motion.div>
        </motion.button>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-4 border-t border-white/[0.04] pt-4">
                {/* Summary */}
                {content.summary && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Summary</span>
                    </div>
                    <p className="text-[13px] text-gray-400 leading-relaxed">{content.summary}</p>
                  </motion.div>
                )}

                {/* Key Points */}
                {content.key_points?.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Key Points</span>
                    </div>
                    <ul className="space-y-1.5">
                      {content.key_points.map((pt, i) => (
                        <li key={i} className="text-[12px] text-gray-400 flex items-start gap-2">
                          <span className="text-amber-400/60 mt-0.5 shrink-0">▸</span>
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {/* Flashcards preview */}
                {flashcardCount > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-400">Flashcards ({flashcardCount})</span>
                    </div>
                    <div className="space-y-2">
                      {content.flashcards.slice(0, 3).map((fc, i) => (
                        <div key={i} className="flex items-start gap-2 text-[12px]">
                          <span className="text-gray-600 shrink-0 w-5 text-right">{i + 1}.</span>
                          <div>
                            <span className="text-gray-300 font-medium">{fc.question}</span>
                            <span className="text-gray-600 mx-1.5">→</span>
                            <span className="text-gray-500">{fc.answer}</span>
                          </div>
                        </div>
                      ))}
                      {flashcardCount > 3 && (
                        <p className="text-[11px] text-gray-600 pl-7">+{flashcardCount - 3} more flashcards</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Quiz preview */}
                {(mcqCount > 0 || shortCount > 0) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <HelpCircle className="w-3.5 h-3.5 text-emerald" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald">Quiz ({mcqCount} MCQ, {shortCount} Short)</span>
                    </div>
                    <div className="space-y-2">
                      {content.quiz?.mcq?.slice(0, 2).map((q, i) => (
                        <div key={i} className="text-[12px]">
                          <span className="text-gray-300">{i + 1}. {q.question}</span>
                          <span className="text-emerald/60 ml-2 text-[11px]">(Answer: {q.correct})</span>
                        </div>
                      ))}
                      {mcqCount > 2 && (
                        <p className="text-[11px] text-gray-600">+{mcqCount - 2} more MCQs</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // Render generic (non-workflow) history card
  const GenericCard = ({ log, idx }) => (
    <motion.div 
      key={log.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.05, 0.4) }}
      whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
      className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl flex flex-col md:flex-row gap-4 justify-between"
    >
      <div className="min-w-0">
        <h3 className="text-white font-medium text-[15px] leading-tight truncate">
          {activeTab === 'flashcards' 
            ? (log.question || 'Flashcard') 
            : activeTab === 'code_explainer' 
              ? 'Code Explanation' 
              : (log.content?.title || log.title || 'Untitled Generation')}
        </h3>
        <p className="text-gray-500 mt-1 text-[13px] line-clamp-2">
          {activeTab === 'flashcards' 
            ? (log.answer || `Generated Flashcard`) 
            : activeTab === 'code_explainer' 
              ? (log.code?.substring(0, 120) + '...' || 'Analyzed code') 
              : (log.content?.youtube_url || log.content?.prompt?.substring(0, 120) || log.content?.filename || 'Analyzed Material...')}
        </p>
      </div>
      <div className="text-[12px] font-mono text-gray-600 shrink-0 md:text-right pt-1">
        {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        <br />
        <span className="text-gray-700">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <motion.header 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center gap-2.5">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-neonPurple flex items-center justify-center shadow-[0_4px_16px_rgba(99,102,241,0.3)]"
          >
            <HistoryIcon className="w-[18px] h-[18px] text-white" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Activity History</h1>
            <p className="text-gray-500 text-[12px]">Review your past AI generations and workflow results</p>
          </div>
        </div>
      </motion.header>

      {/* Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.04] overflow-x-auto"
      >
        {tabs.map(tab => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-[13px] font-medium whitespace-nowrap relative ${
               activeTab === tab.id 
               ? 'text-white shadow-sm' 
               : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="history-tab-bg"
                className="absolute inset-0 bg-white/[0.08] rounded-lg"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? tab.color : 'text-gray-600'}`} />
              {tab.label}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* Content */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SkeletonLoader variant="list" lines={5} />
            </motion.div>
          ) : logs.length > 0 ? (
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-3"
            >
              {logs.map((log, idx) => (
                activeTab === 'workflow' 
                  ? <WorkflowCard key={log.id} log={log} idx={idx} />
                  : <GenericCard key={log.id} log={log} idx={idx} />
              ))}
              
              {/* Infinite scroll trigger + Load More button */}
              <div ref={loadMoreRef} className="py-4 flex justify-center">
                {isFetchingNextPage ? (
                  <div className="flex items-center gap-2 text-gray-500 text-[13px]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading more…
                  </div>
                ) : hasNextPage ? (
                  <button
                    onClick={() => fetchNextPage()}
                    className="px-6 py-2 text-[13px] font-medium text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl transition-all"
                  >
                    Load more
                  </button>
                ) : logs.length > 10 ? (
                  <p className="text-[12px] text-gray-600">You've reached the end</p>
                ) : null}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-64 items-center justify-center space-y-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                <HistoryIcon className="w-6 h-6 text-gray-600" />
              </div>
              <div className="text-center">
                <h3 className="text-gray-400 font-medium text-[14px]">No history yet</h3>
                <p className="text-gray-600 text-[12px] mt-1 max-w-[220px]">
                  Your {activeTab === 'workflow' ? 'AI workflow' : activeTab} generations will appear here.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HistoryPage;
