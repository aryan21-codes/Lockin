import React, { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Sparkles, Target, AlertCircle, FileText, CheckCircle2,
  Loader2, ArrowRight, RotateCcw, Flame, CheckCircle, Clock, BookOpen, User, Book, Layers, Lightbulb, Zap, TrendingUp, History, HelpCircle, Volume2, VolumeX, Copy, Square
} from 'lucide-react';

const STEPS = [
  { id: 'extract', label: 'Extracting content', icon: FileText, color: 'text-blue-400' },
  { id: 'analyze', label: 'Analyzing question patterns', icon: Sparkles, color: 'text-violet-400' },
  { id: 'topics', label: 'Detecting important topics', icon: Target, color: 'text-rose-400' },
  { id: 'notes', label: 'Generating smart notes', icon: BookOpen, color: 'text-emerald-400' },
  { id: 'answers', label: 'Generating model answers', icon: Book, color: 'text-amber-400' },
];

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
          className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-300 ${
            state === 'active' ? 'bg-primary/[0.08] border-primary/20' :
            state === 'done' ? 'bg-emerald/[0.06] border-emerald/15' :
            state === 'error' ? 'bg-red-500/[0.06] border-red-500/15' :
            'bg-white/[0.02] border-white/[0.04]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              state === 'done' ? 'bg-emerald/[0.15]' :
              state === 'active' ? 'bg-primary/[0.15]' :
              state === 'error' ? 'bg-red-500/[0.15]' :
              'bg-white/[0.04]'
            }`}>
              {state === 'done' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald" />
              ) : state === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400" />
              ) : (
                <StepIcon className={`w-4 h-4 ${state === 'active' ? 'text-primary' : 'text-gray-600'}`} />
              )}
            </div>
            <span className={`text-[13px] font-medium ${
              state === 'done' ? 'text-emerald' :
              state === 'active' ? 'text-primary' :
              state === 'error' ? 'text-red-400' :
              'text-gray-600'
            }`}>
              {step.label}
            </span>
          </div>
          {state === 'active' && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
        </motion.div>
      );
    })}
  </div>
);

const FileUploadZone = ({ label, icon: Icon, files, setFiles, accept, colorClass }) => {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) {
      setFiles([...files, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleRemove = (idx, e) => {
    e.stopPropagation();
    setFiles(files.filter((_, i) => i !== idx));
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onClick={() => fileInputRef.current?.click()}
      className={`glass-card p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[140px] relative ${
        dragOver ? `border-${colorClass.split('-')[1]}/50 bg-${colorClass.split('-')[1]}/[0.05]` : 'border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02]'
      }`}
    >
      <input ref={fileInputRef} type="file" multiple accept={accept} onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])} className="hidden" />
      
      {files.length > 0 ? (
        <div className="w-full flex gap-2 flex-wrap justify-center font-medium">
            {files.map((f, i) => (
                <div key={i} className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[12px] flex items-center gap-2 text-gray-200">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    <span className="max-w-[100px] truncate">{f.name}</span>
                    <button onClick={(e) => handleRemove(i, e)} className="text-gray-500 hover:text-red-400 ml-1">×</button>
                </div>
            ))}
        </div>
      ) : (
        <>
            <div className={`w-12 h-12 rounded-xl bg-${colorClass.split('-')[1]}/[0.1] border border-${colorClass.split('-')[1]}/[0.15] flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${colorClass}`} />
            </div>
            <p className="text-[13px] font-medium text-gray-400">{label}</p>
        </>
      )}
    </div>
  );
};


const ExamIntelligence = () => {
  const [notesFiles, setNotesFiles] = useState([]);
  const [pyqFiles, setPyqFiles] = useState([]);
  const [qbFiles, setQbFiles] = useState([]);
  const [timeAvailable, setTimeAvailable] = useState('3 days');
  
  const [status, setStatus] = useState('idle'); // idle | processing | done | error
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('topics');
  
  const [history, setHistory] = useState([]);
  const [readingAloud, setReadingAloud] = useState(null); // tracks which answer index is being read
  const [copiedIndex, setCopiedIndex] = useState(null); // tracks which answer was just copied
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const resp = await api.get('/api/ai/exam-intelligence/history');
        if (resp.data.success) {
          setHistory(resp.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch history:', err);
      }
    };
    fetchHistory();
  }, []);

  const runPipeline = async () => {
    if (!notesFiles.length && !pyqFiles.length && !qbFiles.length) {
      setError("Please upload at least one file to process.");
      return;
    }
    
    setStatus('processing');
    setCurrentStep(0);
    setError(null);
    setResult(null);

    const stepTimer = setInterval(() => {
      setCurrentStep(prev => (prev < 4 ? prev + 1 : prev));
    }, 4500);

    try {
      const formData = new FormData();
      notesFiles.forEach(f => formData.append('notes_files', f));
      pyqFiles.forEach(f => formData.append('pyq_files', f));
      qbFiles.forEach(f => formData.append('qb_files', f));
      formData.append('time_available', timeAvailable);

      const response = await api.post('/api/ai/exam-intelligence/run', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000, 
      });

      clearInterval(stepTimer);

      if (response.data.success) {
        setCurrentStep(5);
        setStatus('done');
        setResult(response.data.data);
        setActiveTab('topics');
        
        // Refresh history
        api.get('/api/ai/exam-intelligence/history').then(r => setHistory(r.data.data || []));
      } else {
        setStatus('error');
        setError(response.data.message || 'Pipeline failed.');
      }
    } catch (err) {
      clearInterval(stepTimer);
      setStatus('error');
      setError(err.response?.data?.message || err.message || 'Pipeline process error.');
    }
  };

  const loadHistoryResult = (log) => {
    setResult(log.content);
    setStatus('done');
    setCurrentStep(5);
    setActiveTab('topics');
  };

  const TAB_CONFIG = [
    { key: 'topics', label: 'Priority Topics', icon: Flame },
    { key: 'notes', label: 'Smart Notes', icon: BookOpen },
    { key: 'questions', label: 'Questions', icon: HelpCircle },
    { key: 'answers', label: 'Model Answers', icon: Book },
    { key: 'revision', label: 'Revision', icon: Zap },
    { key: 'plan', label: 'Study Plan', icon: Clock },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-10">
      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-end justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center shadow-[0_4px_16px_rgba(244,63,94,0.3)]">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-0.5">Exam Intelligence Engine</h1>
            <p className="text-sm font-medium text-gray-500">Maximize marks globally with 80/20 principle</p>
          </div>
        </div>
      </motion.header>

      {status === 'idle' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 space-y-5">
                <div className="glass-card p-6 rounded-2xl">
                    <h3 className="text-[13px] font-semibold text-rose-400 uppercase tracking-wider mb-5 flex items-center gap-2"><Layers className="w-4 h-4"/> Input Sources</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FileUploadZone label="Upload Study Notes" icon={BookOpen} files={notesFiles} setFiles={setNotesFiles} accept=".pdf,.txt,.md" colorClass="text-blue-400" />
                        <FileUploadZone label="Upload PYQs" icon={History} files={pyqFiles} setFiles={setPyqFiles} accept=".pdf,.txt,.md" colorClass="text-violet-400" />
                        <FileUploadZone label="Upload Question Bank" icon={HelpCircle} files={qbFiles} setFiles={setQbFiles} accept=".pdf,.txt,.md" colorClass="text-amber-400" />
                        
                        <div className="glass-card p-5 rounded-2xl border border-white/[0.08] flex flex-col justify-center">
                            <label className="text-[12px] font-semibold text-gray-400 mb-2 block uppercase tracking-wider">Time Available</label>
                            <div className="flex items-center gap-2 bg-white/[0.04] p-1.5 rounded-xl border border-white/[0.08]">
                                <Clock className="w-4 h-4 text-gray-500 ml-2 shrink-0"/>
                                <select 
                                    value={timeAvailable} 
                                    onChange={e => setTimeAvailable(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm text-white w-full py-2 cursor-pointer appearance-none"
                                >
                                    <option className="bg-[#111] text-white">1 Day (Last minute)</option>
                                    <option className="bg-[#111] text-white">3 Days</option>
                                    <option className="bg-[#111] text-white">1 Week</option>
                                    <option className="bg-[#111] text-white">1 Month</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/[0.1] border border-red-500/20 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0"/> {error}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                         <button
                            onClick={runPipeline}
                            disabled={!notesFiles.length && !pyqFiles.length && !qbFiles.length}
                            className="bg-gradient-to-r from-rose-500 to-orange-400 hover:from-rose-400 hover:to-orange-300 text-white shadow-[0_4px_16px_rgba(244,63,94,0.3)] w-full py-4 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 disabled:shadow-none"
                        >
                            <Sparkles className="w-5 h-5 fill-current" /> Analyze & Generate Blueprint
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                 <div className="glass-card p-6 rounded-2xl border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent">
                    <h3 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-4">Past Sessions</h3>
                    <div className="space-y-2.5">
                        {history.length > 0 ? history.map((log, i) => (
                            <button key={i} onClick={() => loadHistoryResult(log)} className="w-full text-left p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all group flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-rose-500/[0.1] flex items-center justify-center">
                                    <Target className="w-4 h-4 text-rose-400" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-medium text-gray-300 group-hover:text-white transition-colors truncate w-40">Session {new Date(log.created_at).toLocaleDateString()}</p>
                                    <p className="text-[11px] text-gray-600">{log.content?.priority_topics?.length || 0} Priority Topics</p>
                                </div>
                            </button>
                        )) : (
                            <p className="text-sm text-gray-500 p-4 text-center border border-dashed border-white/[0.05] rounded-xl">No past sessions found.</p>
                        )}
                    </div>
                 </div>
            </div>

        </motion.div>
      )}

      {status === 'processing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center pt-10">
          <div className="glass-card p-8 rounded-2xl w-full max-w-md">
            <div className="flex flex-col items-center mb-8">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center mb-4 z-10 relative shadow-[0_0_30px_rgba(244,63,94,0.4)]">
                    <Target className="w-8 h-8 text-white" />
                </div>
                <div className="absolute inset-0 bg-rose-500/30 blur-xl animate-pulse rounded-full" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-wide">Building Neural Engine</h2>
              <p className="text-[13px] text-gray-400 mt-1">Applying 80/20 intelligence to your files...</p>
            </div>
            <StepIndicator steps={STEPS} currentStep={currentStep} status="processing" />
          </div>
        </motion.div>
      )}


      {status === 'done' && result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Top Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/[0.1] text-orange-400 flex items-center justify-center"><Flame className="w-5 h-5"/></div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Must Do</p>
                        <p className="text-xl font-bold text-white">{result.categorized_topics?.must_do?.length || 0}</p>
                    </div>
                </div>
                <div className="glass-card p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/[0.1] text-emerald-400 flex items-center justify-center"><CheckCircle2 className="w-5 h-5"/></div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Questions</p>
                        <p className="text-xl font-bold text-white">{result.important_questions?.length || 0}</p>
                    </div>
                </div>
                <div className="glass-card p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/[0.1] text-violet-400 flex items-center justify-center"><Lightbulb className="w-5 h-5"/></div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Notes</p>
                        <p className="text-xl font-bold text-white">{result.exam_notes?.length || 0}</p>
                    </div>
                </div>
                <button onClick={() => {setStatus('idle'); setResult(null); setNotesFiles([]); setPyqFiles([]); setQbFiles([]);}} className="glass-card p-4 rounded-xl flex items-center justify-center gap-2 hover:bg-white/[0.04] transition-colors border-white/[0.1]">
                    <RotateCcw className="w-4 h-4 text-gray-400"/>
                    <span className="text-sm font-semibold text-gray-300">New Run</span>
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-white/[0.02] p-1.5 rounded-2xl border border-white/[0.04] overflow-x-auto custom-scrollbar shadow-inner">
                {TAB_CONFIG.map(tab => {
                    const active = activeTab === tab.key;
                    const Icon = tab.icon;
                    return (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2 ${active ? 'bg-white/[0.08] text-white shadow-md border border-white/[0.06]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'}`}>
                            <Icon className={`w-4 h-4 ${active ? 'text-rose-400' : ''}`} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                
                {/* TOPICS TAB */}
                {activeTab === 'topics' && (
                    <motion.div key="topics" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        <div className="space-y-4">
                            <h3 className="text-sm border-l-2 border-rose-500 pl-3 font-bold text-rose-400 uppercase tracking-wider flex items-center justify-between">Must Do <span className="bg-rose-500/20 px-2 py-0.5 rounded text-[10px] text-rose-300">Highest ROI</span></h3>
                            {result.categorized_topics?.must_do?.map((t, i) => (
                                <div key={i} className="glass-card p-5 rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/[0.05] to-transparent">
                                    <h4 className="font-bold text-[15px] text-white mb-2">{t.name}</h4>
                                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-rose-500/[0.1]">
                                        <span className="text-[11px] font-semibold text-gray-400">Marks: <span className="text-rose-400">{t.expected_marks}</span></span>
                                        <span className="text-[11px] font-semibold text-gray-400">ROI: <span className="text-emerald">{t.roi}</span></span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm border-l-2 border-orange-500 pl-3 font-bold text-orange-400 uppercase tracking-wider">Should Do</h3>
                            {result.categorized_topics?.should_do?.map((t, i) => (
                                <div key={i} className="glass-card p-5 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.03] to-transparent">
                                    <h4 className="font-bold text-[14px] text-white mb-2">{t.name}</h4>
                                     <div className="flex justify-between items-center mt-3 pt-3 border-t border-orange-500/[0.1]">
                                        <span className="text-[11px] font-semibold text-gray-400">Marks: <span className="text-orange-400">{t.expected_marks}</span></span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm border-l-2 border-gray-600 pl-3 font-bold text-gray-500 uppercase tracking-wider">Low Priority</h3>
                            {result.categorized_topics?.low_priority?.map((t, i) => (
                                <div key={i} className="glass-card p-4 rounded-xl border border-gray-700/50 opacity-70">
                                    <h4 className="font-semibold text-[13px] text-gray-300">{t.name}</h4>
                                </div>
                            ))}
                        </div>

                    </motion.div>
                )}

                {/* SMART NOTES TAB */}
                {activeTab === 'notes' && (
                    <motion.div key="notes" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                        {result.exam_notes?.map((note, i) => (
                            <div key={i} className="glass-card p-0 rounded-2xl overflow-hidden border border-white/[0.08]">
                                <div className="p-5 bg-gradient-to-r from-emerald-500/[0.1] to-transparent border-b border-white/[0.04] flex gap-4">
                                     <div className="w-10 h-10 rounded-xl bg-emerald text-emerald-950 font-bold flex items-center justify-center shrink-0">#{i + 1}</div>
                                     <div>
                                        <h3 className="text-lg font-bold text-white">{note.topic}</h3>
                                        <p className="text-[13px] text-gray-400 mt-1.5 leading-relaxed bg-white/[0.03] p-2 rounded-lg border border-white/[0.05]">{note.definition}</p>
                                     </div>
                                </div>
                                
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="text-[11px] font-bold text-gray-500 uppercase mb-3 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5"/> Key Concepts</h4>
                                        <ul className="space-y-2">
                                            {note.key_concepts?.map((kc, j) => (
                                                <li key={j} className="text-[13px] text-gray-200 flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald flex-shrink-0 mt-1.5"/>{kc}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="space-y-6">
                                        {note.common_mistakes?.length > 0 && (
                                            <div>
                                                 <h4 className="text-[11px] font-bold text-red-400 uppercase mb-3 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5"/> Common Mistakes</h4>
                                                 <ul className="space-y-1.5">
                                                    {note.common_mistakes.map((cm, j) => (
                                                        <li key={j} className="text-[13px] text-red-200/80 bg-red-500/[0.08] px-3 py-1.5 rounded-lg border border-red-500/10">- {cm}</li>
                                                    ))}
                                                 </ul>
                                            </div>
                                        )}
                                        {note.exam_tips?.length > 0 && (
                                             <div>
                                                 <h4 className="text-[11px] font-bold text-amber-400 uppercase mb-3 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5"/> Exam Tips</h4>
                                                 {note.exam_tips.map((et, j) => (
                                                      <p key={j} className="text-[13px] text-amber-200 bg-amber-500/[0.08] px-3 py-2 rounded-lg border border-amber-500/20">{et}</p>
                                                 ))}
                                             </div>
                                        )}
                                    </div>
                                </div>
                                <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.04]">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase mr-3">Keywords Outline:</span>
                                    {note.keywords?.map((kw, j) => <span key={j} className="inline-block mx-1 my-1 px-2.5 py-1 rounded bg-white/[0.06] text-[11px] font-medium text-gray-300">{kw}</span>)}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* QUESTIONS TAB */}
                {activeTab === 'questions' && (
                    <motion.div key="questions" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="glass-card p-6 rounded-2xl">
                             <h3 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-5 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Frequently Asked Questions</h3>
                             <div className="space-y-3">
                                {result.important_questions?.map((q, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/10 text-violet-400 flex items-center justify-center font-bold text-sm">Q</div>
                                        <p className="text-gray-200 text-sm font-medium leading-relaxed mt-1">{q.question}</p>
                                    </div>
                                ))}
                             </div>
                        </div>

                         <div className="glass-card p-6 rounded-2xl">
                             <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-5 flex items-center gap-2"><Target className="w-4 h-4"/> Predicted Questions (AI Guess)</h3>
                             <div className="space-y-3">
                                {result.predicted_questions?.map((q, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-orange-500/[0.05] border border-orange-500/20 flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm">?</div>
                                        <p className="text-white text-sm font-medium leading-relaxed mt-1">{q.question}</p>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </motion.div>
                )}

                 {/* MODEL ANSWERS TAB */}
                {activeTab === 'answers' && (
                    <motion.div key="answers" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                        {result.model_answers?.map((ans, i) => {
                            // Use the flowing answer directly from backend
                            const answerText = ans.answer || [ans.definition, ans.explanation, ans.example, ans.conclusion].filter(Boolean).join('\n\n');
                            
                            // Smart paragraph splitting: try \n first, fallback to sentence-based splitting
                            let paragraphs = answerText.split(/\n+/).filter(p => p.trim());
                            
                            // If AI returned a single wall of text (1 paragraph), auto-split every ~3 sentences
                            if (paragraphs.length <= 1 && answerText.length > 200) {
                                const sentences = answerText.match(/[^.!?]+[.!?]+/g) || [answerText];
                                paragraphs = [];
                                let chunk = '';
                                sentences.forEach((sentence, idx) => {
                                    chunk += sentence;
                                    // Split every 3 sentences, or at the last sentence
                                    if ((idx + 1) % 3 === 0 || idx === sentences.length - 1) {
                                        paragraphs.push(chunk.trim());
                                        chunk = '';
                                    }
                                });
                            }
                            
                            const marks = ans.marks || 5;
                            const isReading = readingAloud === i;

                            return (
                             <motion.div 
                                key={i} 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.02] backdrop-blur-sm"
                             >
                                {/* Card Header */}
                                <div className="px-7 py-5 border-b border-white/[0.04] bg-gradient-to-r from-blue-500/[0.06] via-transparent to-transparent flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(59,130,246,0.3)]">
                                        <span className="text-white text-[13px] font-bold">Q{i+1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[15.5px] font-semibold text-white leading-relaxed">{ans.question}</h3>
                                    </div>
                                    <span className="shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/[0.12] to-emerald-500/[0.06] border border-emerald-500/[0.2] text-emerald-400 text-[12px] font-bold tracking-wide">
                                        {marks} marks
                                    </span>
                                </div>

                                {/* Answer Body — Clean, Readable Paragraphs */}
                                <div className="px-7 py-7">
                                    <div className="pl-5 border-l-2 border-blue-500/20 space-y-6">
                                        {paragraphs.map((para, j) => (
                                            <p key={j} className={`text-[14px] leading-[2] ${j === 0 ? 'text-gray-200' : 'text-gray-300/90'}`}>
                                                {para}
                                            </p>
                                        ))}
                                    </div>
                                </div>

                                {/* Word Count & Keywords Bar */}
                                <div className="px-7 py-3.5 border-t border-white/[0.03] bg-white/[0.01] flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mr-1">Keywords</span>
                                        {(ans.keywords || []).map((kw, k) => (
                                            <span key={k} className="px-2.5 py-1 rounded-md bg-indigo-500/[0.08] border border-indigo-500/[0.12] text-indigo-300 text-[11px] font-medium">
                                                {kw}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-gray-600 font-mono">
                                        ~{answerText.split(/\s+/).length} words
                                    </span>
                                </div>

                                {/* Diagram Suggestion */}
                                {ans.diagram_suggestions && (
                                    <div className="mx-7 mb-5 flex items-start gap-3 p-4 bg-amber-500/[0.04] border border-amber-500/[0.12] rounded-xl">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/[0.12] flex items-center justify-center shrink-0">
                                            <Lightbulb className="w-4 h-4 text-amber-400" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block mb-1">Diagram Suggestion</span>
                                            <p className="text-[12.5px] text-amber-200/80 leading-relaxed">{ans.diagram_suggestions}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="px-7 py-3.5 border-t border-white/[0.04] flex items-center justify-end gap-2.5">
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(`Q: ${ans.question}\n\n${answerText}`);
                                            setCopiedIndex(i);
                                            setTimeout(() => setCopiedIndex(null), 1500);
                                        }}
                                        className="px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all text-[12px] font-medium flex items-center gap-2"
                                    >
                                        <Copy className="w-3.5 h-3.5" /> 
                                        {copiedIndex === i ? '✓ Copied!' : 'Copy Answer'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if ('speechSynthesis' in window) {
                                                if (isReading) {
                                                    window.speechSynthesis.cancel();
                                                    setReadingAloud(null);
                                                } else {
                                                    window.speechSynthesis.cancel();
                                                    const utterance = new SpeechSynthesisUtterance(answerText);
                                                    utterance.rate = 0.9;
                                                    utterance.pitch = 1;
                                                    utterance.onend = () => setReadingAloud(null);
                                                    utterance.onerror = () => setReadingAloud(null);
                                                    window.speechSynthesis.speak(utterance);
                                                    setReadingAloud(i);
                                                }
                                            }
                                        }}
                                        className={`px-4 py-2 rounded-lg transition-all text-[12px] font-medium flex items-center gap-2 ${
                                            isReading 
                                                ? 'bg-rose-500/[0.12] border border-rose-500/[0.2] text-rose-400 hover:bg-rose-500/[0.2]' 
                                                : 'bg-indigo-500/[0.08] border border-indigo-500/[0.12] text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/[0.15]'
                                        }`}
                                    >
                                        {isReading ? <><Square className="w-3.5 h-3.5" /> Stop Reading</> : <><Volume2 className="w-3.5 h-3.5" /> Read Aloud</>}
                                    </button>
                                </div>
                             </motion.div>
                            );
                        })}
                    </motion.div>
                )}

                 {/* REVISION TAB */}
                {activeTab === 'revision' && (
                    <motion.div key="revision" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-card p-6 rounded-2xl border-emerald-500/20">
                             <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-5 flex items-center gap-2"><Zap className="w-4 h-4"/> Quick Revision Bulletins</h3>
                             <ul className="space-y-3">
                                {result.quick_revision?.map((r, i) => (
                                    <li key={i} className="text-[13px] text-gray-300 flex items-start gap-2 bg-emerald-500/[0.03] p-3 rounded-lg border border-emerald-500/[0.05]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"/> {r}
                                    </li>
                                ))}
                             </ul>
                        </div>
                        <div className="glass-card p-6 rounded-2xl border-rose-500/20 bg-rose-500/[0.02]">
                             <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-5 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Last Day Revision (Urgent)</h3>
                             <ul className="space-y-3">
                                {result.last_day_revision?.map((r, i) => (
                                    <li key={i} className="text-[13px] text-rose-100/90 font-medium flex items-start gap-2 bg-rose-500/[0.1] p-3 rounded-lg border border-rose-500/10">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.8)]"/> {r}
                                    </li>
                                ))}
                             </ul>
                        </div>
                    </motion.div>
                )}

                {/* PLAN TAB */}
                {activeTab === 'plan' && (
                    <motion.div key="plan" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="glass-card p-8 rounded-2xl relative overflow-hidden">
                             {/* Decorative bg */}
                             <div className="absolute -right-20 -top-20 text-white/[0.02] transform rotate-12">
                                <Clock strokeWidth={0.5} className="w-64 h-64" />
                             </div>
                             
                             <h3 className="text-lg font-bold text-white mb-6 relative z-10 flex items-center gap-3">
                                <span className="p-2 bg-primary/20 rounded-xl text-primary"><Clock className="w-5 h-5"/></span>
                                Study Optimizer ({timeAvailable})
                             </h3>

                             <div className="relative z-10 space-y-4">
                                {result.study_plan?.map((plan, i) => (
                                    <div key={i} className="flex flex-col md:flex-row gap-4 p-5 rounded-xl bg-[#111]/80 border border-white/[0.08] items-center">
                                        <div className="w-full md:w-48 shrink-0">
                                            <span className="px-3 py-1 rounded bg-white/[0.08] text-gray-300 text-[12px] font-bold tracking-wider uppercase mb-2 inline-block">{plan.day_or_block}</span>
                                            <p className="text-[13px] text-primary font-bold mt-1 max-w-[150px]">{plan.hours_allocated} Focus</p>
                                        </div>
                                        <div className="flex-1 space-y-1.5 w-full border-t md:border-t-0 md:border-l border-white/[0.1] pt-3 md:pt-0 md:pl-5">
                                            <h4 className="text-[15px] font-bold text-white">{plan.topic}</h4>
                                            <p className="text-[13px] text-gray-400 uppercase tracking-widest font-semibold flex items-center gap-2"><Target className="w-3.5 h-3.5 text-orange-400"/> {plan.focus}</p>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </motion.div>
      )}

    </div>
  );
};

export default ExamIntelligence;
