import React, { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Sparkles, Brain, HelpCircle, CheckCircle2,
  Loader2, ArrowRight, ChevronDown, ChevronUp, RotateCcw,
  Download, Layers, Presentation, Play, X, Check, AlertCircle,
  RefreshCw, BookOpen, Target, Zap, History, Clock
} from 'lucide-react';

// ─── PIPELINE STEPS DEFINITION ───
const STEPS = [
  { id: 'extract', label: 'Extracting text', icon: FileText, color: 'text-blue-400' },
  { id: 'summarize', label: 'Generating summary', icon: Brain, color: 'text-violet-400' },
  { id: 'flashcards', label: 'Creating flashcards', icon: Layers, color: 'text-amber-400' },
  { id: 'quiz', label: 'Building quiz', icon: HelpCircle, color: 'text-emerald-400' },
];

// ─── STEP PROGRESS INDICATOR ───
const StepIndicator = ({ steps, currentStep, status }) => (
  <div className="flex flex-col gap-3">
    {steps.map((step, idx) => {
      const StepIcon = step.icon;
      let state = 'pending';
      if (status === 'error') {
        state = idx < currentStep ? 'done' : idx === currentStep ? 'error' : 'pending';
      } else if (status === 'done') {
        state = 'done';
      } else {
        state = idx < currentStep ? 'done' : idx === currentStep ? 'active' : 'pending';
      }

      return (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
            state === 'active' ? 'bg-primary/[0.08] border border-primary/20' :
            state === 'done' ? 'bg-emerald/[0.06] border border-emerald/15' :
            state === 'error' ? 'bg-red-500/[0.06] border border-red-500/15' :
            'bg-white/[0.02] border border-white/[0.04]'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            state === 'done' ? 'bg-emerald/[0.15]' :
            state === 'active' ? 'bg-primary/[0.15]' :
            state === 'error' ? 'bg-red-500/[0.15]' :
            'bg-white/[0.04]'
          }`}>
            {state === 'done' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald" />
            ) : state === 'active' ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : state === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400" />
            ) : (
              <StepIcon className={`w-4 h-4 text-gray-600`} />
            )}
          </div>
          <span className={`text-[13px] font-medium ${
            state === 'done' ? 'text-emerald' :
            state === 'active' ? 'text-primary' :
            state === 'error' ? 'text-red-400' :
            'text-gray-600'
          }`}>
            {step.label}
            {state === 'active' && '...'}
            {state === 'done' && ' ✓'}
          </span>
        </motion.div>
      );
    })}
  </div>
);

// ─── FLASHCARD MINI COMPONENT (for workflow results) ───
const FlipCard = ({ card, index }) => {
  const [flipped, setFlipped] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="h-56 cursor-pointer group"
      style={{ perspective: '1000px' }}
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className="w-full h-full relative transition-transform duration-500"
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)' }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 glass-card p-5 flex flex-col rounded-2xl border border-white/[0.06] group-hover:border-violet-500/20 transition-colors"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-400 mb-3">Question</span>
          <div className="flex-1 flex items-center justify-center text-center">
            <p className="text-[14px] font-medium text-gray-200 leading-relaxed">{card.question}</p>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-600">
            <RefreshCw className="w-3 h-3" /> Click to flip
          </div>
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 glass-card p-5 flex flex-col rounded-2xl border border-violet-500/20 bg-violet-500/[0.03]"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald mb-3">Answer</span>
          <div className="flex-1 flex items-center justify-center text-center overflow-y-auto custom-scrollbar">
            <p className="text-[13px] text-gray-300 leading-relaxed">{card.answer}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── QUIZ MODE COMPONENT ───
const QuizMode = ({ quiz, onExit }) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState({});
  const [shortAnswers, setShortAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const allMcq = quiz?.mcq || [];
  const allShort = quiz?.short || [];
  const totalQuestions = allMcq.length + allShort.length;
  const isMcqPhase = currentQ < allMcq.length;
  const currentQuestion = isMcqPhase ? allMcq[currentQ] : allShort[currentQ - allMcq.length];

  const handleMcqSelect = (option) => {
    if (showResults) return;
    setSelected({ ...selected, [currentQ]: option });
  };

  const handleNext = () => {
    if (currentQ < totalQuestions - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setShowResults(true);
    }
  };

  const score = allMcq.reduce((acc, q, i) => acc + (selected[i] === q.correct ? 1 : 0), 0);

  if (showResults) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        {/* Score card */}
        <div className="glass-card p-8 rounded-2xl text-center">
          <div className="w-20 h-20 rounded-full bg-primary/[0.1] border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">Quiz Complete!</h3>
          <p className="text-gray-400 text-sm mb-4">
            You scored <span className="text-primary font-bold">{score}</span> out of <span className="font-bold text-white">{allMcq.length}</span> on MCQs
          </p>
          <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden max-w-xs mx-auto">
            <div className="h-full bg-gradient-to-r from-primary to-violet-400 rounded-full" style={{ width: `${(score / allMcq.length) * 100}%` }} />
          </div>
        </div>

        {/* MCQ review */}
        <div className="space-y-3">
          <h4 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider">MCQ Review</h4>
          {allMcq.map((q, i) => {
            const isCorrect = selected[i] === q.correct;
            return (
              <div key={i} className={`glass-card p-4 rounded-xl border ${isCorrect ? 'border-emerald/20' : 'border-red-500/20'}`}>
                <p className="text-[13px] font-medium text-gray-200 mb-2">{i + 1}. {q.question}</p>
                <p className={`text-[12px] ${isCorrect ? 'text-emerald' : 'text-red-400'}`}>
                  {isCorrect ? '✓ Correct' : `✗ Your answer: ${selected[i] || 'None'}`}
                  {!isCorrect && ` → Correct: ${q.correct}`}
                </p>
                {q.explanation && <p className="text-[11px] text-gray-500 mt-1">{q.explanation}</p>}
              </div>
            );
          })}
        </div>

        {/* Short answer review */}
        {allShort.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider">Short Answer Review</h4>
            {allShort.map((q, i) => (
              <div key={i} className="glass-card p-4 rounded-xl">
                <p className="text-[13px] font-medium text-gray-200 mb-1">{q.question}</p>
                <p className="text-[12px] text-gray-500">Your answer: <span className="text-gray-300">{shortAnswers[allMcq.length + i] || 'Skipped'}</span></p>
                <p className="text-[12px] text-emerald mt-1">Model answer: {q.answer}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => { setCurrentQ(0); setSelected({}); setShortAnswers({}); setShowResults(false); }}
            className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[13px] font-medium text-gray-300 hover:bg-white/[0.06] transition-all flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
          <button onClick={onExit}
            className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[13px] font-medium text-gray-300 hover:bg-white/[0.06] transition-all flex items-center justify-center gap-2">
            <X className="w-4 h-4" /> Exit Quiz
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-gray-500">Question {currentQ + 1} of {totalQuestions}</span>
        <button onClick={onExit} className="text-gray-600 hover:text-gray-300 transition-colors p-1"><X className="w-4 h-4" /></button>
      </div>
      <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-primary to-violet-400 rounded-full" animate={{ width: `${((currentQ + 1) / totalQuestions) * 100}%` }} />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-6 rounded-2xl">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${isMcqPhase ? 'text-primary' : 'text-amber-400'} mb-3 block`}>
            {isMcqPhase ? 'Multiple Choice' : 'Short Answer'}
          </span>
          <h3 className="text-[16px] font-semibold text-white leading-relaxed mb-5">{currentQuestion.question}</h3>

          {isMcqPhase ? (
            <div className="space-y-2.5">
              {currentQuestion.options?.map((opt, i) => (
                <button key={i} onClick={() => handleMcqSelect(opt)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-[13px] font-medium transition-all ${
                    selected[currentQ] === opt
                      ? 'bg-primary/[0.1] border-primary/30 text-primary'
                      : 'bg-white/[0.02] border-white/[0.06] text-gray-300 hover:bg-white/[0.04] hover:border-white/[0.1]'
                  }`}>
                  <span className="text-gray-500 mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              rows={3}
              placeholder="Type your answer..."
              value={shortAnswers[currentQ] || ''}
              onChange={(e) => setShortAnswers({ ...shortAnswers, [currentQ]: e.target.value })}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/40 resize-none"
            />
          )}
        </motion.div>
      </AnimatePresence>

      <button onClick={handleNext} disabled={isMcqPhase && !selected[currentQ]}
        className="btn-primary w-full py-3 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
        {currentQ < totalQuestions - 1 ? (<>Next <ArrowRight className="w-4 h-4" /></>) : (<>Finish Quiz <Check className="w-4 h-4" /></>)}
      </button>
    </motion.div>
  );
};


// ═══════════════════════════════════════
//  MAIN WORKFLOW PAGE
// ═══════════════════════════════════════
const AIWorkflow = () => {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | processing | done | error
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [quizMode, setQuizMode] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [workflowHistory, setWorkflowHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch past workflow runs
  useEffect(() => {
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const resp = await api.get('/api/history/workflow');
        if (resp.data.success) {
          setWorkflowHistory(resp.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch workflow history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const loadHistoryResult = (log) => {
    const content = log.content || {};
    setResult({
      source_file: content.source_file || 'Past Workflow',
      summary: content.summary || '',
      key_points: content.key_points || [],
      flashcards: content.flashcards || [],
      quiz: content.quiz || {},
      text_length: content.text_length || 0,
    });
    setStatus('done');
    setCurrentStep(4);
    setActiveTab('summary');
  };

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) validateAndSetFile(f);
  }, []);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const validateAndSetFile = (f) => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['pdf', 'txt', 'md', 'text'].includes(ext)) {
      setError('Please upload a PDF or text file.');
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError('File must be under 20MB.');
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
    setStatus('idle');
  };

  const runPipeline = async () => {
    if (!file) return;
    setStatus('processing');
    setCurrentStep(0);
    setError(null);
    setResult(null);

    // Simulate step progression while waiting for backend
    const stepTimer = setInterval(() => {
      setCurrentStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 4000);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/ai/workflow/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 min timeout for full pipeline
      });

      clearInterval(stepTimer);

      if (response.data.success) {
        setCurrentStep(4);
        setStatus('done');
        setResult(response.data.data);
        setActiveTab('summary');
      } else {
        setStatus('error');
        setError(response.data.message || 'Pipeline failed.');
      }
    } catch (err) {
      clearInterval(stepTimer);
      setStatus('error');
      setError(err.response?.data?.message || err.message || 'Pipeline failed. Please try again.');
    }
  };

  const resetPipeline = () => {
    setFile(null);
    setStatus('idle');
    setCurrentStep(0);
    setResult(null);
    setError(null);
    setQuizMode(false);
    setActiveTab('summary');
  };

  const [pptLoading, setPptLoading] = useState(false);

  const handleConvertToPPT = async () => {
    if (!result?.summary) return;
    setPptLoading(true);
    try {
      // Build a concise prompt from the summary
      const prompt = result.summary.substring(0, 1500);
      const response = await api.post('/api/ppt/generate', { prompt, num_slides: 6 });
      
      if (response.data.success && response.data.data?.url) {
        // Download the actual .pptx binary via authenticated request
        const downloadRes = await api.get(response.data.data.url, {
          responseType: 'blob',
        });

        // Create a blob URL and trigger download
        const blob = new Blob([downloadRes.data], {
          type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        });
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        const safeName = (result.source_file || 'study').replace(/[^a-zA-Z0-9]/g, '_');
        link.download = `presentation_${safeName}.pptx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } else {
        console.error('PPT generation failed:', response.data.message);
      }
    } catch (err) {
      console.error('PPT generation failed:', err);
    } finally {
      setPptLoading(false);
    }
  };

  // ─── RENDER: QUIZ MODE ───
  if (quizMode && result?.quiz) {
    return (
      <div className="max-w-2xl mx-auto pb-10">
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald/[0.1] border border-emerald/[0.15] flex items-center justify-center">
              <Target className="w-[18px] h-[18px] text-emerald" />
            </div>
            <h1 className="text-xl font-bold text-white">Quiz Mode</h1>
          </div>
          <p className="text-gray-500 text-[13px] ml-[46px]">From: {result.source_file}</p>
        </motion.header>
        <QuizMode quiz={result.quiz} onExit={() => setQuizMode(false)} />
      </div>
    );
  }

  // ─── RENDER: MAIN PAGE ───
  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-neonPurple flex items-center justify-center shadow-[0_4px_16px_rgba(99,102,241,0.3)]">
            <Zap className="w-[18px] h-[18px] text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">AI Workflow</h1>
            <p className="text-gray-500 text-[12px]">Upload → Summary → Flashcards → Quiz — fully automated</p>
          </div>
        </div>
      </motion.header>

      {status === 'idle' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Upload Zone */}
          <div
            onDrop={handleFileDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`glass-card p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 text-center ${
              dragOver ? 'border-primary/50 bg-primary/[0.04]' : file ? 'border-emerald/30 bg-emerald/[0.02]' : 'border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02]'
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.text" onChange={handleFileSelect} className="hidden" />
            
            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald/[0.1] border border-emerald/[0.15] flex items-center justify-center">
                  <FileText className="w-6 h-6 text-emerald" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-white">{file.name}</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                  <Upload className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-gray-300">Drop your file here or click to browse</p>
                  <p className="text-[12px] text-gray-600 mt-1">PDF, TXT, or MD files up to 20MB</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/[0.06] border border-red-500/[0.15] text-red-400 text-[13px]">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Pipeline preview */}
          <div className="glass-card p-5 rounded-2xl">
            <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Pipeline Steps</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <React.Fragment key={step.id}>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                      <Icon className={`w-3.5 h-3.5 ${step.color}`} />
                      <span className="text-[12px] font-medium text-gray-400">{step.label}</span>
                    </div>
                    {i < STEPS.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-gray-700 shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={runPipeline}
            disabled={!file}
            className="btn-primary w-full py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2.5 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            <Sparkles className="w-5 h-5" /> Run AI Pipeline
          </button>

          {/* Recent Workflows */}
          {workflowHistory.length > 0 && (
            <div className="space-y-3 mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-gray-500" />
                  <h3 className="text-[13px] font-semibold text-gray-400">Recent Workflows</h3>
                </div>
                <button 
                  onClick={() => navigate('/history')}
                  className="text-[11px] text-gray-600 hover:text-primary transition-colors font-medium flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2">
                {workflowHistory.slice(0, 5).map((log, idx) => {
                  const content = log.content || {};
                  const fcCount = content.flashcards?.length || 0;
                  const qCount = (content.quiz?.mcq?.length || 0) + (content.quiz?.short?.length || 0);
                  return (
                    <motion.button
                      key={log.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => loadHistoryResult(log)}
                      className="w-full flex items-center gap-3.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all group text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-cyan-500/[0.08] border border-cyan-500/[0.1] flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-gray-300 truncate group-hover:text-white transition-colors">
                          {content.source_file || 'Workflow'}
                        </p>
                        <p className="text-[11px] text-gray-600 mt-0.5 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span>·</span>
                          <span>{fcCount} cards</span>
                          <span>·</span>
                          <span>{qCount} Qs</span>
                        </p>
                      </div>
                      <span className="text-[11px] text-gray-700 group-hover:text-primary font-medium transition-colors shrink-0">Load →</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}
          {historyLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
            </div>
          )}
        </motion.div>
      )}

      {/* ─── PROCESSING STATE ─── */}
      {status === 'processing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="glass-card p-8 rounded-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/[0.1] border border-primary/[0.15] flex items-center justify-center mb-5 relative">
              <Sparkles className="w-7 h-7 text-primary" />
              <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-ping opacity-50" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Processing {file?.name}</h2>
            <p className="text-[13px] text-gray-500 mb-6">Running all 4 AI steps. This usually takes 30-60 seconds.</p>
            <div className="w-full max-w-sm">
              <StepIndicator steps={STEPS} currentStep={currentStep} status="processing" />
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── ERROR STATE ─── */}
      {status === 'error' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="glass-card p-8 rounded-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/[0.08] border border-red-500/[0.15] flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Pipeline Failed</h3>
            <p className="text-[13px] text-gray-400 max-w-md mx-auto">{error}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={runPipeline} className="flex-1 btn-primary py-3 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
            <button onClick={resetPipeline} className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[13px] font-medium text-gray-300 hover:bg-white/[0.06] transition-all">
              Upload Different File
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── RESULTS STATE ─── */}
      {status === 'done' && result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Success banner */}
          <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald/[0.1] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-white">Pipeline Complete</h3>
                <p className="text-[12px] text-gray-500">{result.source_file} · {result.flashcards?.length || 0} flashcards · {(result.quiz?.mcq?.length || 0) + (result.quiz?.short?.length || 0)} quiz questions</p>
              </div>
            </div>
            <button onClick={resetPipeline} className="text-[12px] text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> New Upload
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setQuizMode(true)} className="btn-primary px-5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2">
              <Play className="w-4 h-4" /> Start Quiz Mode
            </button>
            <button onClick={handleConvertToPPT} disabled={pptLoading} className="px-5 py-2.5 rounded-xl bg-orange-500/[0.08] text-orange-400 border border-orange-500/[0.15] hover:bg-orange-500/[0.12] transition-all text-[13px] font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {pptLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating PPT...</>
              ) : (
                <><Presentation className="w-4 h-4" /> Convert to PPT</>
              )}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.04]">
            {[
              { key: 'summary', label: 'Summary', icon: BookOpen },
              { key: 'flashcards', label: `Flashcards (${result.flashcards?.length || 0})`, icon: Layers },
              { key: 'quiz', label: 'Quiz', icon: HelpCircle },
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-[13px] font-medium transition-all flex items-center justify-center gap-2 ${
                    activeTab === tab.key ? 'bg-white/[0.08] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                  }`}>
                  <TabIcon className="w-3.5 h-3.5" /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            {activeTab === 'summary' && (
              <motion.div key="summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="glass-card p-6 rounded-2xl">
                  <h3 className="text-[12px] font-semibold text-primary uppercase tracking-wider mb-3">Summary</h3>
                  <p className="text-[14px] text-gray-300 leading-relaxed">{result.summary}</p>
                </div>
                {result.key_points?.length > 0 && (
                  <div className="glass-card p-6 rounded-2xl">
                    <h3 className="text-[12px] font-semibold text-amber-400 uppercase tracking-wider mb-3">Key Points</h3>
                    <ul className="space-y-2.5">
                      {result.key_points.map((point, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-[13px] text-gray-300 leading-relaxed">
                          <span className="w-5 h-5 rounded-md bg-amber-500/[0.1] border border-amber-500/[0.15] flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-amber-400">{i + 1}</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'flashcards' && (
              <motion.div key="flashcards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {result.flashcards?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {result.flashcards.map((card, i) => <FlipCard key={i} card={card} index={i} />)}
                  </div>
                ) : (
                  <div className="glass-card p-10 rounded-2xl text-center text-gray-500">No flashcards generated.</div>
                )}
              </motion.div>
            )}

            {activeTab === 'quiz' && (
              <motion.div key="quiz" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* MCQ preview */}
                {result.quiz?.mcq?.length > 0 && (
                  <div className="glass-card p-6 rounded-2xl">
                    <h3 className="text-[12px] font-semibold text-primary uppercase tracking-wider mb-4">Multiple Choice Questions ({result.quiz.mcq.length})</h3>
                    <div className="space-y-4">
                      {result.quiz.mcq.map((q, i) => (
                        <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                          <p className="text-[13px] font-medium text-gray-200 mb-2.5">{i + 1}. {q.question}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {q.options?.map((opt, j) => (
                              <div key={j} className={`px-3 py-2 rounded-lg text-[12px] border ${opt === q.correct ? 'bg-emerald/[0.06] border-emerald/[0.15] text-emerald' : 'bg-white/[0.02] border-white/[0.04] text-gray-400'}`}>
                                <span className="text-gray-600 mr-1">{String.fromCharCode(65 + j)}.</span> {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Short Qs preview */}
                {result.quiz?.short?.length > 0 && (
                  <div className="glass-card p-6 rounded-2xl">
                    <h3 className="text-[12px] font-semibold text-amber-400 uppercase tracking-wider mb-4">Short Answer Questions ({result.quiz.short.length})</h3>
                    <div className="space-y-3">
                      {result.quiz.short.map((q, i) => (
                        <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                          <p className="text-[13px] font-medium text-gray-200 mb-1">{i + 1}. {q.question}</p>
                          <p className="text-[12px] text-emerald/80">Answer: {q.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => setQuizMode(true)} className="btn-primary w-full py-3.5 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" /> Start Interactive Quiz
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default AIWorkflow;
