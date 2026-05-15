import { useAuth } from '../context/AuthContext';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { Layers, Loader2, Play, FileUp, Type, UploadCloud, X, Filter, Brain } from 'lucide-react';
import Flashcard from '../components/Flashcard';
import AnimatedButton from '../components/ui/AnimatedButton';
import { FlashcardSkeleton } from '../components/ui/SkeletonLoader';
import { AILoadingSteps } from '../components/ui/TypewriterText';
import { useToast } from '../components/ui/Toast';

const FlashcardsPage = () => {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('text'); // 'text' or 'pdf'
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [flashcards, setFlashcards] = useState([]);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  
  const fileInputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (user?.id) {
      setInitialLoading(false);
    } else {
      setFlashcards([]);
      setInitialLoading(true);
    }
  }, [user]);

  const handleGenerateText = async () => {
    try {
      const response = await api.post('/api/flashcards/generate', { 
         text, 
         difficulty 
      });
      if (response.data.success) {
        setFlashcards(prev => [...response.data.data, ...prev]);
        setText('');
        toast.success(`${response.data.data.length} flashcards generated!`, 'AI Complete');
      } else {
        setError(response.data.message || 'Failed to generate flashcards');
        toast.error(response.data.message || 'Generation failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      toast.error(err.message || 'An error occurred');
    }
  };

  const handleGeneratePDF = async () => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('difficulty', difficulty);
    
    
    try {
      const response = await api.post('/api/flashcards/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response.data.success) {
        setFlashcards(prev => [...response.data.data, ...prev]);
        setFile(null);
        toast.success(`${response.data.data.length} flashcards generated!`, 'AI Complete');
      } else {
        setError(response.data.message || 'Failed to parse PDF');
        toast.error(response.data.message || 'Generation failed');
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
    
    const stepTimer = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, 2));
    }, 2500);
    
    if (activeTab === 'text') {
      await handleGenerateText();
    } else {
      await handleGeneratePDF();
    }
    
    clearInterval(stepTimer);
    setIsLoading(false);
  };

  const handleDeleteFlashcard = (id) => {
      setFlashcards(prev => prev.filter(fc => fc.id !== id));
      toast.info('Flashcard deleted');
  };

  // Filter state for UI viewing
  const [viewFilter, setViewFilter] = useState('all');
  const filteredCards = flashcards.filter(c => viewFilter === 'all' || c.difficulty === viewFilter);

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
            <Layers className="w-8 h-8 text-amber-500" />
          </motion.div>
          AI Flashcard Generator
        </h1>
        <p className="text-gray-400">Transform your notes, lectures, and PDFs into highly effective spaced-repetition flashcards instantly.</p>
      </motion.header>
      
      {/* Creation UI */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-6 rounded-2xl flex flex-col gap-6"
      >
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
           {/* Tabs */}
           <div className="flex bg-surface/50 p-1 rounded-xl w-fit border border-white/5">
             {[
               { key: 'text', label: 'Text', icon: Type },
               { key: 'pdf', label: 'PDF', icon: FileUp },
             ].map(tab => (
               <motion.button 
                 key={tab.key}
                 onClick={() => setActiveTab(tab.key)}
                 whileHover={{ scale: 1.02 }}
                 whileTap={{ scale: 0.98 }}
                 className={`px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all relative ${activeTab === tab.key ? 'text-amber-400' : 'text-gray-400 hover:text-white'}`}
               >
                 {activeTab === tab.key && (
                   <motion.div
                     layoutId="flashcard-tab-bg"
                     className="absolute inset-0 bg-amber-500/20 rounded-lg shadow-[inset_0_1px_rgba(255,255,255,0.1)]"
                     transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                   />
                 )}
                 <span className="relative z-10 flex items-center gap-2">
                   <tab.icon className="w-4 h-4" /> {tab.label}
                 </span>
               </motion.button>
             ))}
           </div>
           
           <div className="flex items-center gap-3">
               <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                   <Brain className="w-4 h-4" /> Target Difficulty:
               </label>
               <select 
                  value={difficulty} 
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="bg-surfaceHover border border-white/10 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2 outline-none"
               >
                  <option value="easy">Easy (Definitions)</option>
                  <option value="medium">Medium (Concepts)</option>
                  <option value="hard">Hard (Synthesis)</option>
               </select>
           </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'text' ? (
            <motion.textarea 
              key="text-input"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              placeholder="Paste your raw learning material here..." 
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-40 bg-surfaceHover border border-white/10 rounded-xl py-4 px-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 input-glow transition-all custom-scrollbar resize-none"
            />
          ) : (
            <motion.div 
              key="pdf-input"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="h-40"
            >
               {!file ? (
                 <motion.div 
                   onClick={() => fileInputRef.current?.click()}
                   whileHover={{ scale: 1.01 }}
                   whileTap={{ scale: 0.99 }}
                   className="w-full h-full bg-surfaceHover border-2 border-dashed border-white/10 hover:border-amber-400/50 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group"
                 >
                   <UploadCloud className="w-6 h-6 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                   <p className="text-gray-300 font-medium">Click or drag PDF to map into flashcards</p>
                 </motion.div>
               ) : (
                 <motion.div 
                   initial={{ scale: 0.95, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   className="w-full h-full bg-surfaceHover border border-white/10 rounded-xl flex items-center justify-center relative p-6"
                 >
                   <motion.button 
                     onClick={() => setFile(null)}
                     whileHover={{ scale: 1.1 }}
                     whileTap={{ scale: 0.9 }}
                     className="absolute top-2 right-2 p-1 bg-surface rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                   >
                     <X className="w-4 h-4" />
                   </motion.button>
                   <div className="flex flex-col items-center gap-2 text-center">
                     <Layers className="w-10 h-10 text-amber-400" />
                     <p className="text-white font-medium truncate max-w-[250px]">{file.name}</p>
                   </div>
                 </motion.div>
               )}
               <input type="file" accept="application/pdf" ref={fileInputRef} className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex justify-between items-center">
          <p className="text-xs text-red-400">{error}</p>
          
          {isLoading ? (
            <AILoadingSteps 
              steps={['Reading content…', 'Generating questions…', 'Building flashcards…']}
              currentStep={loadingStep}
            />
          ) : (
            <AnimatedButton 
              onClick={handleSubmit}
              disabled={isLoading || (activeTab === 'text' && !text.trim()) || (activeTab === 'pdf' && !file)}
              className="ml-auto bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]"
            >
              <Play className="w-4 h-4" /> Generate Deck
            </AnimatedButton>
          )}
        </div>
      </motion.div>

      {/* Grid Viewing UI */}
      {initialLoading ? (
        <FlashcardSkeleton />
      ) : flashcards.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
               <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                   <Filter className="w-5 h-5 text-amber-400" /> Your Deck 
                   <span className="text-sm font-normal text-gray-500 ml-2">({filteredCards.length} cards)</span>
               </h2>
               <select 
                   value={viewFilter} 
                   onChange={(e) => setViewFilter(e.target.value)}
                   className="bg-transparent text-gray-300 text-sm font-medium border border-white/10 rounded-md p-1 outline-none"
               >
                   <option value="all">All Difficulties</option>
                   <option value="easy">Easy Only</option>
                   <option value="medium">Medium Only</option>
                   <option value="hard">Hard Only</option>
               </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCards.map((card, idx) => (
                <motion.div
                  key={card.id || `temp-${idx}`}
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: idx * 0.05, duration: 0.35 }}
                >
                  <Flashcard card={card} onDelete={handleDeleteFlashcard} />
                </motion.div>
              ))}
            </div>
            
            {filteredCards.length === 0 && (
                <div className="text-center p-10 text-gray-500">
                    No cards match this difficulty filter.
                </div>
            )}
        </motion.div>
      )}
    </div>
  );
};

export default FlashcardsPage;
