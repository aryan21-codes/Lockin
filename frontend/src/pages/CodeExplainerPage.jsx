import { useAuth } from '../context/AuthContext';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Code2, Loader2, Play, Terminal, Lightbulb, CheckCircle2, History } from 'lucide-react';
import AnimatedButton from '../components/ui/AnimatedButton';
import TypewriterText, { AILoadingSteps } from '../components/ui/TypewriterText';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import { useToast } from '../components/ui/Toast';

const CodeExplainerPage = () => {
  const { user } = useAuth();
  
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const toast = useToast();

  const commonLanguages = [
    "javascript", "python", "typescript", "java", "cpp", "csharp", "go", "rust", "sql", "html", "css", "bash"
  ];

  useEffect(() => {
    if (user?.id) fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    try {
      const resp = await api.get(`/api/history/code_explainer`);
      if (resp.data.success) {
        setHistory(resp.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch code history", err);
    }
  };

  const handleExplain = async () => {
    if (!code.trim()) return;
    setIsLoading(true);
    setLoadingStep(0);
    setError('');
    setResult(null);
    
    const stepTimer = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, 2));
    }, 2000);
    
    try {
      const response = await api.post('/api/code-explainer/explain', { code, language });
      if (response.data.success) {
        setResult(response.data.data.explanation);
        fetchHistory();
        toast.success('Code analyzed successfully!', 'AI Complete');
      } else {
        setError(response.data.message || 'Failed to analyze code');
        toast.error(response.data.message || 'Analysis failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      toast.error(err.message || 'An error occurred');
    } finally {
      clearInterval(stepTimer);
      setIsLoading(false);
    }
  };

  const loadPastCode = (item) => {
      setCode(item.code);
      setResult(item.explanation);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <motion.div whileHover={{ rotate: 5, scale: 1.1 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Terminal className="w-8 h-8 text-amber-500" />
          </motion.div>
          AI Code Explainer
        </h1>
        <p className="text-gray-400">Paste your code snippet below and get a simple, student-friendly breakdown line by line.</p>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel: Input */}
        <motion.div 
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1 space-y-6"
        >
           <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
               <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-white flex items-center gap-2">
                     <Code2 className="w-5 h-5 text-amber-500" /> Source Code
                  </h2>
                  <select 
                      value={language} 
                      onChange={(e) => setLanguage(e.target.value)}
                      className="bg-surfaceHover border border-white/10 text-white text-xs font-mono rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-1.5 outline-none"
                  >
                     {commonLanguages.map(lang => (
                         <option key={lang} value={lang}>{lang}</option>
                     ))}
                  </select>
               </div>
               
               <textarea 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste code here..."
                  className="w-full h-96 bg-surfaceHover border border-white/10 rounded-xl py-4 px-4 text-amber-100 font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 input-glow transition-all custom-scrollbar resize-none"
                  spellCheck="false"
               />
               
               <div className="flex justify-between items-center mt-2">
                   <p className="text-xs text-red-400 font-medium">{error}</p>
                   
                   {isLoading ? (
                     <AILoadingSteps 
                       steps={['Parsing code…', 'Analyzing logic…', 'Generating explanation…']}
                       currentStep={loadingStep}
                     />
                   ) : (
                     <AnimatedButton 
                       onClick={handleExplain}
                       disabled={isLoading || !code.trim()}
                       className="w-full justify-center bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                     >
                       <Play className="w-4 h-4" /> Explain Logic
                     </AnimatedButton>
                   )}
               </div>
           </div>

           {/* History Mini-Panel */}
           <AnimatePresence>
             {history.length > 0 && (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="glass-panel p-6 rounded-2xl flex flex-col gap-4"
               >
                  <h2 className="text-md font-medium text-white flex items-center gap-2">
                     <History className="w-4 h-4 text-emerald-500" /> Recent Queries
                  </h2>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                      {history.slice(0, 5).map((item, idx) => (
                          <motion.div 
                             key={item.id}
                             initial={{ opacity: 0, x: -5 }}
                             animate={{ opacity: 1, x: 0 }}
                             transition={{ delay: idx * 0.05 }}
                             onClick={() => loadPastCode(item)}
                             whileHover={{ scale: 1.02 }}
                             whileTap={{ scale: 0.98 }}
                             className="text-xs bg-surface border border-white/5 hover:border-amber-500/30 p-3 rounded-lg cursor-pointer transition-colors truncate font-mono text-gray-400 hover:text-white"
                          >
                              {item.code.substring(0, 50)}...
                          </motion.div>
                      ))}
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
        </motion.div>

        {/* Right Panel: Output */}
        <motion.div 
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 space-y-6"
        >
           <AnimatePresence mode="wait">
             {result ? (
               <motion.div 
                 key="result"
                 initial={{ opacity: 0, y: 15 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="space-y-6"
               >
                   {/* Summary */}
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="glass-panel p-6 rounded-2xl flex flex-col gap-3 bg-gradient-to-br from-surface to-amber-900/10 border-amber-500/20"
                   >
                      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-amber-500" /> Context Summary
                      </h2>
                      <div className="text-gray-300 leading-relaxed text-sm">
                        <TypewriterText text={result.summary} speed={15} />
                      </div>
                   </motion.div>

                   {/* Line by Line Breakdown */}
                   <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Code2 className="w-5 h-5 text-blue-400" /> Line by Line Breakdown
                      </h2>
                      <div className="space-y-4 mt-2">
                          {result.line_by_line?.map((block, idx) => (
                              <motion.div 
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.06 }}
                                className="bg-surface/50 border border-white/5 rounded-xl overflow-hidden shadow-sm hover:border-blue-500/30 transition-colors"
                              >
                                  <div className="bg-[#1e1e1e] border-b border-white/10 text-xs">
                                     <SyntaxHighlighter 
                                        language={language} 
                                        style={vscDarkPlus} 
                                        customStyle={{ margin: 0, padding: '12px 16px', background: 'transparent' }}
                                     >
                                         {block.line}
                                     </SyntaxHighlighter>
                                  </div>
                                  <div className="p-4 bg-surface text-sm text-gray-300 leading-relaxed">
                                      {block.explanation}
                                  </div>
                              </motion.div>
                          ))}
                      </div>
                   </div>

                   {/* Improvements */}
                   {result.improvements?.length > 0 && (
                       <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.2 }}
                         className="glass-panel p-6 rounded-2xl flex flex-col gap-4 border-emerald-500/20 bg-gradient-to-br from-surface to-emerald-900/10"
                       >
                          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                              <Lightbulb className="w-5 h-5 text-emerald-400" /> Suggested Improvements
                          </h2>
                          <ul className="space-y-3 pl-1">
                              {result.improvements.map((tip, idx) => (
                                  <motion.li 
                                    key={idx}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + idx * 0.06 }}
                                    className="flex gap-3 text-sm text-gray-300"
                                  >
                                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                     <span className="leading-relaxed">{tip}</span>
                                  </motion.li>
                              ))}
                          </ul>
                       </motion.div>
                   )}
               </motion.div>
             ) : (
               <motion.div 
                 key="placeholder"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="glass-panel h-full min-h-[500px] border-dashed border-2 border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-10 opacity-50"
               >
                   <Terminal className="w-16 h-16 text-gray-600 mb-4" />
                   <h3 className="text-xl font-medium text-gray-400 mb-2">Awaiting Code Submission</h3>
                   <p className="text-gray-500 text-sm max-w-sm">Paste your Javascript, Python, or logic syntax onto the left panel to generate a rich layout explanation.</p>
               </motion.div>
             )}
           </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default CodeExplainerPage;
