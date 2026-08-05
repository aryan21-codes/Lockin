import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { Presentation, Loader2, Download, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import AnimatedButton from '../components/ui/AnimatedButton';
import { AILoadingSteps } from '../components/ui/TypewriterText';
import { useToast } from '../components/ui/Toast';

const PPTGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [numSlides, setNumSlides] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const toast = useToast();

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt) return;
    
    setIsLoading(true);
    setLoadingStep(0);
    setError('');
    setResult(null);
    setShowPreview(false);
    
    const stepTimer = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, 3));
    }, 3000);
    
    try {
      const response = await api.post('/api/ppt/generate', { prompt, num_slides: parseInt(numSlides) });
      if (response.data.success) {
        setResult(response.data.data);
        toast.success('Presentation generated!', 'Ready to Download');
      } else {
        setError(response.data.message || 'Failed to generate presentation');
        toast.error(response.data.message || 'Generation failed');
      }
    } catch (err) {
      const msg = err.response?.data?.detail?.message || err.response?.data?.message || err.message || 'An error occurred';
      setError(msg);
      toast.error(msg);
    } finally {
      clearInterval(stepTimer);
      setIsLoading(false);
    }
  };

  const getFullUrl = () => {
    if (!result) return '';
    const baseUrl = api.defaults.baseURL || 'http://localhost:8000';
    return `${baseUrl}${result.url}`;
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
            <Presentation className="w-8 h-8 text-orange-400" />
          </motion.div>
          Prompt → PPT Generator
        </h1>
        <p className="text-gray-400">Transform any idea or prompt into a structured PowerPoint presentation.</p>
      </motion.header>

      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-8 rounded-2xl"
      >
        <form onSubmit={handleGenerate} className="flex flex-col gap-6">
          <div className="space-y-2">
             <label className="text-sm font-medium text-gray-300 ml-1">Topic or Prompt</label>
             <textarea 
               placeholder="E.g., A comprehensive overview of Artificial Intelligence in Healthcare for 2024..." 
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               className="w-full h-32 bg-surfaceHover border border-white/10 rounded-xl py-4 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 input-glow transition-all custom-scrollbar resize-none"
               required
             />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 items-end">
            <div className="space-y-2 w-full sm:w-1/3">
              <label className="text-sm font-medium text-gray-300 ml-1">Number of Slides</label>
              <input 
                type="number" 
                min="3" max="20"
                value={numSlides}
                onChange={(e) => setNumSlides(e.target.value)}
                className="w-full bg-surfaceHover border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500/50 input-glow transition-all"
              />
            </div>
            
            {isLoading ? (
              <div className="w-full sm:w-2/3">
                <AILoadingSteps 
                  steps={['Analyzing prompt…', 'Structuring slides…', 'Building content…', 'Finalizing deck…']} 
                  currentStep={loadingStep} 
                />
              </div>
            ) : (
              <AnimatedButton
                type="submit"
                disabled={isLoading || !prompt}
                className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-2/3 py-3 rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.3)]"
              >
                Generate Presentation
              </AnimatedButton>
            )}
          </div>
        </form>
        
        <AnimatePresence>
          {error && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-400 mt-4 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center gap-6 text-center border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.1)] overflow-hidden"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.15 }}
              className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.4)] relative"
            >
               <motion.div
                 initial={{ scale: 0 }}
                 animate={{ scale: [0, 1.5, 0] }}
                 transition={{ duration: 0.8, delay: 0.3 }}
                 className="absolute inset-0 rounded-full bg-orange-500/20"
               />
               <CheckCircle2 className="w-8 h-8 text-orange-400 animate-checkmark-pop" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Presentation Ready!</h2>
              <p className="text-gray-400 max-w-md mx-auto">Your presentation has been successfully generated and is ready for download.</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 mt-2 w-full">
              <AnimatedButton
                onClick={() => setShowPreview(!showPreview)}
                variant="secondary"
                className="px-6 py-3 rounded-xl min-w-[160px]"
              >
                {showPreview ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                {showPreview ? 'Hide Preview' : 'Preview Slides'}
              </AnimatedButton>
              
              <AnimatedButton
                onClick={() => {
                  try {
                    window.open(getFullUrl(), '_blank');
                    toast.success('Download started!');
                  } catch (err) {
                    console.error('Download failed:', err);
                    toast.error('Download failed');
                  }
                }}
                variant="primary"
                className="bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded-xl min-w-[160px]"
              >
                <Download className="w-5 h-5" />
                Download .pptx
              </AnimatedButton>
            </div>

            <AnimatePresence>
              {showPreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: '600px', marginTop: 24 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full rounded-xl overflow-hidden border border-white/10 bg-black/50 relative"
                >
                  {getFullUrl().includes('localhost') || getFullUrl().includes('127.0.0.1') ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 absolute inset-0">
                      <EyeOff className="w-12 h-12 mb-4 text-gray-500 opacity-50" />
                      <p className="text-lg font-medium text-white/80">Live preview unavailable</p>
                      <p className="text-sm mt-2 text-center max-w-sm">
                        The Office Viewer requires a publicly accessible URL. Please test this feature on the production deployment.
                      </p>
                    </div>
                  ) : (
                    <iframe
                      src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(getFullUrl())}`}
                      className="w-full h-full absolute inset-0 border-none bg-white"
                      title="PPT Preview"
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PPTGenerator;
