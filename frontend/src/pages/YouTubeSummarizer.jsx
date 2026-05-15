import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { MonitorPlay, Search, Loader2 } from 'lucide-react';
import TypewriterText, { AILoadingSteps } from '../components/ui/TypewriterText';
import AnimatedButton from '../components/ui/AnimatedButton';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import { useToast } from '../components/ui/Toast';

const YouTubeSummarizer = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const toast = useToast();

  const handleSummarize = async (e) => {
    e.preventDefault();
    if (!url) return;
    
    setIsLoading(true);
    setLoadingStep(0);
    setError('');
    setResult(null);
    
    const stepTimer = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, 2));
    }, 2500);
    
    try {
      const response = await api.post('/api/youtube/summarize', { url });
      if (response.data.success) {
        setResult(response.data.data);
        toast.success('Video summarized successfully!', 'AI Complete');
      } else {
        setError(response.data.message || 'Failed to summarize video');
        toast.error(response.data.message || 'Failed to summarize video');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      toast.error(err.message || 'An error occurred');
    } finally {
      clearInterval(stepTimer);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <motion.div whileHover={{ rotate: 5, scale: 1.1 }} transition={{ type: 'spring', stiffness: 300 }}>
            <MonitorPlay className="w-8 h-8 text-red-500" />
          </motion.div>
          YouTube Summarizer
        </h1>
        <p className="text-gray-400">Instantly generate summaries and key takeaways from any YouTube video.</p>
      </motion.header>

      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-6 rounded-2xl"
      >
        <form onSubmit={handleSummarize} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="url" 
              placeholder="Paste YouTube URL here (e.g. https://youtube.com/watch?v=...)" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-surfaceHover border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 input-glow transition-all"
              required
            />
          </div>
          <AnimatedButton
            type="submit"
            disabled={isLoading || !url}
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.3)]"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Summarize'}
          </AnimatedButton>
        </form>
        
        <AnimatePresence>
          {error && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-400 mt-4 text-sm"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Loading state */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-panel p-8 rounded-2xl"
          >
            <AILoadingSteps 
              steps={['Fetching transcript…', 'Analyzing content…', 'Generating summary…']} 
              currentStep={loadingStep}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col gap-4"
            >
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-6 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                AI Summary
              </h2>
              <div className="p-4 bg-surfaceHover rounded-xl border border-white/5 text-gray-300 leading-relaxed shadow-inner">
                <TypewriterText text={result.summary} speed={18} />
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-1 glass-panel p-6 rounded-2xl flex flex-col gap-4"
            >
               <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                 <span className="w-2 h-6 bg-neonBlue rounded-full shadow-[0_0_8px_cyan]"></span>
                 Key Takeaways
               </h2>
               <ul className="space-y-3">
                 {result.key_points.map((point, idx) => (
                   <motion.li 
                     key={idx} 
                     initial={{ opacity: 0, x: 10 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.3 + idx * 0.08 }}
                     className="flex gap-3 text-sm text-gray-300"
                   >
                     <span className="text-neonBlue font-bold mt-0.5">•</span>
                     <span>{point}</span>
                   </motion.li>
                 ))}
               </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default YouTubeSummarizer;
