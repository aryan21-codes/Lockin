import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { FileText, Loader2, Play, FileUp, Type, UploadCloud, X, Zap, Target, Brain } from 'lucide-react';
import TypewriterText, { AILoadingSteps } from '../components/ui/TypewriterText';
import AnimatedButton from '../components/ui/AnimatedButton';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import { useToast } from '../components/ui/Toast';

const NotesSummarizer = () => {
  const [activeTab, setActiveTab] = useState('text'); // 'text' or 'pdf'
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);
  const toast = useToast();

  const handleSummarizeText = async () => {
    try {
      const response = await api.post('/api/summarize/', { text });
      if (response.data.success) {
        setResult(response.data.data);
        toast.success('Summary generated successfully!', 'AI Complete');
      } else {
        setError(response.data.message || 'Failed to summarize text');
        toast.error(response.data.message || 'Failed to summarize text');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      toast.error(err.message || 'An error occurred');
    }
  };

  const handleSummarizePDF = async () => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post('/api/summarize/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response.data.success) {
        setResult(response.data.data);
        toast.success('PDF summarized successfully!', 'AI Complete');
      } else {
        setError(response.data.message || 'Failed to summarize PDF');
        toast.error(response.data.message || 'Failed to summarize');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      toast.error(err.message || 'An error occurred');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (activeTab === 'text' && !text.trim()) return;
    if (activeTab === 'pdf' && !file) return;
    
    setIsLoading(true);
    setLoadingStep(0);
    setError('');
    setResult(null);
    
    // Simulate step progression
    const stepTimer = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, 2));
    }, 2000);
    
    if (activeTab === 'text') {
      await handleSummarizeText();
    } else {
      await handleSummarizePDF();
    }
    
    clearInterval(stepTimer);
    setIsLoading(false);
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
            <FileText className="w-8 h-8 text-amber-400" />
          </motion.div>
          AI Notes Summarizer
        </h1>
        <p className="text-gray-400">Paste your long texts or upload a PDF document and let AI extract the core meaning.</p>
      </motion.header>
      
      {/* Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex bg-surface/50 p-1 rounded-xl w-fit border border-white/5"
      >
        {[
          { key: 'text', label: 'Text Input', icon: Type },
          { key: 'pdf', label: 'PDF Upload', icon: FileUp },
        ].map(tab => (
          <motion.button 
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`px-6 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all relative ${activeTab === tab.key ? 'text-amber-400 shadow-[inset_0_1px_rgba(255,255,255,0.1)]' : 'text-gray-400 hover:text-white'}`}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="notes-tab-bg"
                className="absolute inset-0 bg-amber-500/20 rounded-lg"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <tab.icon className="w-4 h-4" /> {tab.label}
            </span>
          </motion.button>
        ))}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-panel p-6 rounded-2xl flex flex-col gap-4"
      >
        <AnimatePresence mode="wait">
          {activeTab === 'text' ? (
            <motion.div key="text" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
              <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-medium text-white">Input Text</h2>
                  {text.length > 0 && <span className="text-xs text-gray-500">{text.length} characters</span>}
              </div>
              <textarea 
                placeholder="Paste your notes, article, or document content here..." 
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-64 bg-surfaceHover border border-white/10 rounded-xl py-4 px-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 input-glow transition-all custom-scrollbar resize-none"
              />
            </motion.div>
          ) : (
            <motion.div key="pdf" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
               <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-medium text-white">Upload Document</h2>
               </div>
               
               {!file ? (
                 <motion.div 
                   onClick={() => fileInputRef.current?.click()}
                   whileHover={{ scale: 1.01, borderColor: 'rgba(245, 158, 11, 0.4)' }}
                   whileTap={{ scale: 0.99 }}
                   className="w-full h-64 bg-surfaceHover border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group"
                 >
                   <motion.div 
                     whileHover={{ scale: 1.15, rotate: 5 }}
                     className="w-16 h-16 rounded-full bg-surface mb-4 flex items-center justify-center"
                   >
                      <UploadCloud className="w-8 h-8 text-amber-400" />
                   </motion.div>
                   <p className="text-gray-300 font-medium text-lg">Click or drag PDF to upload</p>
                   <p className="text-gray-500 text-sm mt-2">Maximum file size 10MB</p>
                 </motion.div>
               ) : (
                 <motion.div 
                   initial={{ scale: 0.95, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   className="w-full h-64 bg-surfaceHover border border-white/10 rounded-xl flex items-center justify-center relative p-6"
                 >
                   <motion.button 
                     onClick={() => setFile(null)}
                     whileHover={{ scale: 1.1 }}
                     whileTap={{ scale: 0.9 }}
                     className="absolute top-4 right-4 p-2 bg-surface rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                   >
                     <X className="w-5 h-5" />
                   </motion.button>
                   <div className="flex flex-col items-center gap-4 text-center">
                     <FileText className="w-16 h-16 text-amber-400" />
                     <div>
                       <p className="text-white font-medium text-lg truncate max-w-[250px]">{file.name}</p>
                       <p className="text-gray-500 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                     </div>
                   </div>
                 </motion.div>
               )}
               <input 
                 type="file" 
                 accept="application/pdf" 
                 ref={fileInputRef}
                 className="hidden"
                 onChange={(e) => {
                   if (e.target.files && e.target.files[0]) {
                     setFile(e.target.files[0]);
                   }
                 }}
               />
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-red-400 font-medium">{error}</p>
          
          {isLoading ? (
            <AILoadingSteps 
              steps={['Analyzing content…', 'Extracting key points…', 'Generating summary…']} 
              currentStep={loadingStep} 
            />
          ) : (
            <AnimatedButton
              variant="primary"
              onClick={handleSubmit}
              disabled={isLoading || (activeTab === 'text' && !text.trim()) || (activeTab === 'pdf' && !file)}
              className="ml-auto bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            >
              <Play className="w-4 h-4" /> Summarize {activeTab === 'pdf' ? 'PDF' : 'Text'}
            </AnimatedButton>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-6"
          >
            {/* Header / Title */}
            <motion.div className="glass-panel p-6 rounded-2xl flex flex-col gap-2">
               <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                 <span className="w-2 h-8 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
                 {result.title || "Smart Notes"}
               </h2>
               {result.why_important && (
                 <p className="text-amber-400/80 text-sm italic border-l-2 border-amber-500/30 pl-3 ml-3">
                   {result.why_important}
                 </p>
               )}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="flex flex-col gap-6">
                <motion.div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-400" /> Definition & Explanation
                  </h3>
                  {result.definition && (
                    <div className="bg-surfaceHover p-4 rounded-xl border border-white/5">
                      <p className="text-gray-200 font-medium">{result.definition}</p>
                    </div>
                  )}
                  <div className="text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">
                    <TypewriterText text={result.detailed_explanation || result.summary} speed={10} />
                  </div>
                </motion.div>

                {result.examples && result.examples.length > 0 && (
                  <motion.div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-400" /> Examples
                    </h3>
                    <div className="space-y-4">
                      {result.examples.map((ex, idx) => (
                        <div key={idx} className="bg-surfaceHover p-4 rounded-xl border border-white/5 space-y-2">
                          <p className="text-white font-medium">{ex.title}</p>
                          {ex.code && <pre className="text-xs bg-black/40 p-3 rounded-lg overflow-x-auto text-amber-200">{ex.code}</pre>}
                          {ex.output && <div className="text-xs bg-white/5 p-2 rounded-lg border border-white/10 text-gray-300"><strong>Output:</strong> {ex.output}</div>}
                          {ex.explanation && <p className="text-sm text-gray-400">{ex.explanation}</p>}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-6">
                <motion.div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                   <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                     <Target className="w-5 h-5 text-amber-400" /> Key Concepts & Revision
                   </h3>
                   <ul className="space-y-3">
                     {(result.key_concepts || result.key_points || result.bullet_points || []).map((point, idx) => (
                       <li key={idx} className="flex gap-3 text-sm text-gray-300">
                         <span className="text-amber-500 font-bold mt-0.5">•</span>
                         <span>{point}</span>
                       </li>
                     ))}
                   </ul>

                   {result.revision_notes && result.revision_notes.length > 0 && (
                     <div className="mt-4 pt-4 border-t border-white/5">
                       <h4 className="text-sm font-semibold text-amber-400 mb-3 uppercase tracking-wider">Quick Revision</h4>
                       <ul className="space-y-2">
                         {result.revision_notes.map((note, idx) => (
                           <li key={idx} className="text-xs text-gray-400 bg-surfaceHover p-2 rounded-lg">⚡ {note}</li>
                         ))}
                       </ul>
                     </div>
                   )}
                </motion.div>

                {result.exam_questions && result.exam_questions.length > 0 && (
                  <motion.div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                     <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                       <Brain className="w-5 h-5 text-amber-400" /> Exam Questions
                     </h3>
                     <div className="space-y-2">
                       {result.exam_questions.map((q, idx) => (
                         <div key={idx} className="bg-surfaceHover p-3 rounded-xl border border-white/5 flex gap-3 items-start">
                           <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-1 rounded uppercase tracking-wider font-bold mt-0.5">{q.type.replace('_', ' ')}</span>
                           <p className="text-sm text-gray-200">{q.question}</p>
                         </div>
                       ))}
                     </div>
                  </motion.div>
                )}
                
                {result.common_mistakes && result.common_mistakes.length > 0 && (
                  <motion.div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                     <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                       <X className="w-5 h-5 text-rose-400" /> Common Mistakes
                     </h3>
                     <ul className="space-y-2">
                       {result.common_mistakes.map((mistake, idx) => (
                         <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                           <span className="text-rose-400 font-bold mt-0.5">✕</span>
                           {mistake}
                         </li>
                       ))}
                     </ul>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotesSummarizer;
