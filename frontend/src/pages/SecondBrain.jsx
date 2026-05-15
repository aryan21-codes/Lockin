import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Search, Send, Loader2, RefreshCw, Target, Zap, BookOpen,
  AlertTriangle, ChevronRight, HelpCircle, Check, X, Layers,
  TrendingUp, Clock, Star, MessageSquare, Lightbulb, BarChart3, Play
} from 'lucide-react';

// Lazy-load force graph to avoid SSR issues
let ForceGraph2D = null;

// ═══════════════════════════════════════
//  KNOWLEDGE GRAPH PANEL
// ═══════════════════════════════════════
const KnowledgeGraphPanel = ({ graphData, onNodeClick, isLoading }) => {
  const graphRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [GraphComponent, setGraphComponent] = useState(null);

  // Dynamic import of react-force-graph-2d
  useEffect(() => {
    import('react-force-graph-2d').then(mod => {
      setGraphComponent(() => mod.default);
    });
  }, []);

  // Measure container
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setDimensions({
        width: entry.contentRect.width,
        height: Math.max(entry.contentRect.height, 350),
      });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Transform Supabase data → force-graph format
  const formattedData = useMemo(() => {
    if (!graphData?.nodes?.length) return { nodes: [], links: [] };

    const nodes = graphData.nodes.map(n => ({
      id: n.topic,
      label: n.topic,
      frequency: n.frequency || 1,
      description: n.description || '',
      val: Math.max(3, Math.min(n.frequency * 2, 15)),
    }));

    const nodeIds = new Set(nodes.map(n => n.id));
    const links = (graphData.edges || [])
      .filter(e => nodeIds.has(e.from_topic) && nodeIds.has(e.to_topic))
      .map(e => ({
        source: e.from_topic,
        target: e.to_topic,
        label: e.relation_type || 'related',
        strength: e.strength || 1,
      }));

    return { nodes, links };
  }, [graphData]);

  // Custom node painting with glow
  const paintNode = useCallback((node, ctx, globalScale) => {
    const size = node.val || 5;
    const fontSize = Math.max(10 / globalScale, 2);
    const label = node.label || '';

    // Glow
    ctx.shadowColor = 'rgba(99, 102, 241, 0.6)';
    ctx.shadowBlur = 12;

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    const freq = node.frequency || 1;
    if (freq >= 3) {
      ctx.fillStyle = '#6366f1'; // primary
    } else if (freq >= 2) {
      ctx.fillStyle = '#8b5cf6'; // accent
    } else {
      ctx.fillStyle = '#3b82f6'; // blue
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Label
    if (globalScale > 0.6) {
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(label, node.x, node.y + size + 2);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!formattedData.nodes.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/[0.08] flex items-center justify-center mb-4">
          <Brain className="w-6 h-6 text-primary/60" />
        </div>
        <h3 className="text-[14px] font-medium text-gray-400">No knowledge graph yet</h3>
        <p className="text-[12px] text-gray-600 mt-1 max-w-[260px]">
          Upload study materials via AI Workflow to start building your knowledge map.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-[400px] rounded-xl overflow-hidden relative">
      {GraphComponent && (
        <GraphComponent
          ref={graphRef}
          graphData={formattedData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="rgba(0,0,0,0)"
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node, color, ctx) => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val + 4, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkColor={() => 'rgba(99,102,241,0.15)'}
          linkWidth={link => Math.max(0.5, link.strength * 0.5)}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          onNodeClick={node => onNodeClick?.(node)}
          cooldownTicks={80}
          d3AlphaDecay={0.04}
          d3VelocityDecay={0.3}
        />
      )}
    </div>
  );
};


// ═══════════════════════════════════════
//  ASK AI PANEL (RAG Chat)
// ═══════════════════════════════════════
const AskAIPanel = () => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [isAsking, setIsAsking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleAsk = async () => {
    if (!question.trim() || isAsking) return;
    const q = question.trim();
    setQuestion('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setIsAsking(true);

    try {
      const resp = await api.post('/api/brain/ask', { question: q });
      if (resp.data.success) {
        const data = resp.data.data;
        setMessages(prev => [...prev, {
          role: 'ai',
          content: data.answer,
          sources: data.sources,
          confidence: data.confidence,
          topics: data.topics_referenced,
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: resp.data.message || 'Failed to get answer.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Connection error. Please try again.' }]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mb-3 min-h-[200px] max-h-[400px]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <MessageSquare className="w-8 h-8 text-primary/30 mb-3" />
            <p className="text-[13px] text-gray-500">Ask anything about your study material.</p>
            <p className="text-[11px] text-gray-700 mt-1">Answers are sourced from YOUR knowledge base only.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-primary/[0.15] text-gray-200 rounded-br-md'
                : 'bg-white/[0.04] text-gray-300 border border-white/[0.06] rounded-bl-md'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.confidence && (
                <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-600">
                  <span className={`px-1.5 py-0.5 rounded ${
                    msg.confidence === 'high' ? 'bg-emerald/[0.1] text-emerald' :
                    msg.confidence === 'medium' ? 'bg-amber-500/[0.1] text-amber-400' :
                    'bg-red-500/[0.1] text-red-400'
                  }`}>
                    {msg.confidence} confidence
                  </span>
                  <span>{msg.sources?.length || 0} sources</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {isAsking && (
          <div className="flex justify-start">
            <div className="bg-white/[0.04] rounded-2xl rounded-bl-md px-4 py-3 border border-white/[0.06]">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          placeholder="Ask your knowledge base..."
          className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white placeholder-gray-600 focus:outline-none focus:border-primary/40 transition-colors"
        />
        <button
          onClick={handleAsk}
          disabled={!question.trim() || isAsking}
          className="btn-primary px-4 py-3 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════
//  INSIGHTS PANEL
// ═══════════════════════════════════════
const InsightsPanel = ({ insights, onRefresh, isLoading }) => {
  const [reinforcing, setReinforcing] = useState(false);
  const [reinforceData, setReinforceData] = useState(null);
  const [quizzing, setQuizzing] = useState(false);
  const [quizData, setQuizData] = useState(null);

  const handleReinforce = async () => {
    setReinforcing(true);
    try {
      const resp = await api.post('/api/brain/reinforce');
      if (resp.data.success) setReinforceData(resp.data.data);
    } catch (err) { console.error(err); }
    finally { setReinforcing(false); }
  };

  const handleWeakQuiz = async () => {
    setQuizzing(true);
    try {
      const resp = await api.post('/api/brain/weak-quiz');
      if (resp.data.success) setQuizData(resp.data.data);
    } catch (err) { console.error(err); }
    finally { setQuizzing(false); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  const data = insights || {};
  const stats = data.stats || {};
  const insightsList = data.insights || [];
  const weakTopics = data.weak_topics || [];

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Topics', value: stats.total_topics || 0, icon: Brain, color: 'text-primary' },
          { label: 'Embeddings', value: stats.total_embeddings || 0, icon: Layers, color: 'text-violet-400' },
          { label: 'Weak', value: stats.weak_count || 0, icon: AlertTriangle, color: 'text-amber-400' },
          { label: 'Due Today', value: stats.revision_due || 0, icon: Clock, color: 'text-cyan-400' },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
            <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
            <p className="text-[18px] font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Insights list */}
      {insightsList.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Suggestions</h4>
          {insightsList.slice(0, 5).map((ins, i) => (
            <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl text-[12px] ${
              ins.type === 'alert' ? 'bg-red-500/[0.05] border border-red-500/[0.1]' :
              ins.type === 'warning' ? 'bg-amber-500/[0.05] border border-amber-500/[0.1]' :
              'bg-white/[0.02] border border-white/[0.04]'
            }`}>
              {ins.priority === 'high' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" /> :
               <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />}
              <div>
                <p className="font-medium text-gray-300">{ins.title}</p>
                <p className="text-gray-500 mt-0.5">{ins.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Weak topics */}
      {weakTopics.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Weak Areas</h4>
          {weakTopics.slice(0, 5).map((wt, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400/60" />
                <span className="text-[12px] text-gray-300">{wt.topic}</span>
              </div>
              <span className="text-[10px] text-gray-600">{wt.days_since_review}d ago</span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleReinforce}
          disabled={reinforcing}
          className="flex-1 py-2.5 rounded-xl bg-primary/[0.08] text-primary border border-primary/[0.15] hover:bg-primary/[0.12] transition-all text-[12px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {reinforcing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
          Explain Weak Topics
        </button>
        <button
          onClick={handleWeakQuiz}
          disabled={quizzing}
          className="flex-1 py-2.5 rounded-xl bg-emerald/[0.08] text-emerald border border-emerald/[0.15] hover:bg-emerald/[0.12] transition-all text-[12px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {quizzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Quiz Weak Areas
        </button>
      </div>

      {/* Reinforce explanations */}
      <AnimatePresence>
        {reinforceData?.explanations?.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold text-primary uppercase tracking-wider">Explanations</h4>
              <button onClick={() => setReinforceData(null)} className="text-gray-600 hover:text-gray-400"><X className="w-3.5 h-3.5" /></button>
            </div>
            {reinforceData.explanations.map((exp, i) => (
              <div key={i} className="p-4 rounded-xl bg-primary/[0.03] border border-primary/[0.08]">
                <h5 className="text-[13px] font-semibold text-white mb-2">{exp.topic}</h5>
                <p className="text-[12px] text-gray-400 leading-relaxed whitespace-pre-wrap">{exp.explanation}</p>
                {exp.key_formula && (
                  <div className="mt-2 p-2 bg-white/[0.03] rounded-lg">
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider">Key Formula</span>
                    <p className="text-[12px] text-amber-400 font-mono mt-1">{exp.key_formula}</p>
                  </div>
                )}
                {exp.study_tip && (
                  <p className="text-[11px] text-primary/80 mt-2 flex items-start gap-1.5">
                    <Lightbulb className="w-3 h-3 shrink-0 mt-0.5" /> {exp.study_tip}
                  </p>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weak quiz results */}
      <AnimatePresence>
        {quizData?.questions?.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold text-emerald uppercase tracking-wider">Weak Area Quiz</h4>
              <button onClick={() => setQuizData(null)} className="text-gray-600 hover:text-gray-400"><X className="w-3.5 h-3.5" /></button>
            </div>
            {quizData.questions.map((q, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-[12px] font-medium text-gray-300 mb-2">{i + 1}. {q.question}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {q.options?.map((opt, j) => (
                    <div key={j} className={`px-2.5 py-1.5 rounded-lg text-[11px] border ${
                      opt === q.correct ? 'bg-emerald/[0.06] border-emerald/[0.15] text-emerald' : 'bg-white/[0.02] border-white/[0.04] text-gray-500'
                    }`}>
                      <span className="text-gray-700 mr-1">{String.fromCharCode(65 + j)}.</span> {opt}
                    </div>
                  ))}
                </div>
                {q.explanation && <p className="text-[10px] text-gray-600 mt-1.5">{q.explanation}</p>}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


// ═══════════════════════════════════════
//  REVISION PANEL
// ═══════════════════════════════════════
const RevisionPanel = ({ revision, onUpdate, isLoading }) => {
  const [updatingTopic, setUpdatingTopic] = useState(null);

  const handleReview = async (topic, correct) => {
    setUpdatingTopic(topic);
    try {
      await api.post('/api/brain/revision/update', { topic, correct });
      onUpdate?.();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingTopic(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[150px]">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  if (!revision?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Check className="w-8 h-8 text-emerald/40 mb-2" />
        <p className="text-[13px] text-gray-400">All caught up!</p>
        <p className="text-[11px] text-gray-600 mt-1">No topics due for revision right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {revision.map((rev, i) => {
        const confidence = rev.confidence_score ?? 0.5;
        const isUpdating = updatingTopic === rev.topic;
        return (
          <motion.div
            key={rev.id || i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-gray-300 truncate">{rev.topic}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden max-w-[120px]">
                  <div
                    className={`h-full rounded-full ${
                      confidence >= 0.7 ? 'bg-emerald' : confidence >= 0.4 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${confidence * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-600">{Math.round(confidence * 100)}%</span>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {isUpdating ? (
                <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
              ) : (
                <>
                  <button
                    onClick={() => handleReview(rev.topic, true)}
                    className="w-8 h-8 rounded-lg bg-emerald/[0.08] border border-emerald/[0.15] flex items-center justify-center text-emerald hover:bg-emerald/[0.15] transition-colors"
                    title="I know this"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleReview(rev.topic, false)}
                    className="w-8 h-8 rounded-lg bg-red-500/[0.08] border border-red-500/[0.15] flex items-center justify-center text-red-400 hover:bg-red-500/[0.15] transition-colors"
                    title="Need to study"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};


// ═══════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════
const SecondBrain = () => {
  const [graphData, setGraphData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [revision, setRevision] = useState(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [revisionLoading, setRevisionLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeTab, setActiveTab] = useState('graph');

  // Fetch all data on mount
  useEffect(() => {
    fetchGraph();
    fetchInsights();
    fetchRevision();
  }, []);

  const fetchGraph = async () => {
    setGraphLoading(true);
    try {
      const resp = await api.get('/api/brain/graph');
      if (resp.data.success) setGraphData(resp.data.data);
    } catch (err) { console.error(err); }
    finally { setGraphLoading(false); }
  };

  const fetchInsights = async () => {
    setInsightsLoading(true);
    try {
      const resp = await api.get('/api/brain/insights');
      if (resp.data.success) setInsights(resp.data.data);
    } catch (err) { console.error(err); }
    finally { setInsightsLoading(false); }
  };

  const fetchRevision = async () => {
    setRevisionLoading(true);
    try {
      const resp = await api.get('/api/brain/revision');
      if (resp.data.success) setRevision(resp.data.data);
    } catch (err) { console.error(err); }
    finally { setRevisionLoading(false); }
  };

  const handleSyncHistory = async () => {
    if (!window.confirm("This will scan your past workflows and ingest them into your Knowledge Graph. Continue?")) return;
    
    try {
      const resp = await api.post('/api/brain/backfill');
      if (resp.data.success) {
        alert(resp.data.message);
      } else {
        alert(resp.data.message || "Failed to sync history.");
      }
    } catch (err) {
      alert("Network error while trying to sync history.");
    }
  };

  const tabs = [
    { key: 'graph', label: 'Knowledge Map', icon: Brain },
    { key: 'ask', label: 'Ask AI', icon: MessageSquare },
    { key: 'insights', label: 'Insights', icon: BarChart3 },
    { key: 'revision', label: 'Revision', icon: RefreshCw },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-10">
      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-[0_4px_20px_rgba(139,92,246,0.4)]">
              <Brain className="w-[18px] h-[18px] text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">My Second Brain</h1>
              <p className="text-gray-500 text-[12px]">Your personal AI knowledge engine</p>
            </div>
          </div>
          <button
            onClick={() => { fetchGraph(); fetchInsights(); fetchRevision(); }}
            className="text-[12px] text-gray-500 hover:text-primary transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-white/[0.03]"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </motion.header>

      {/* Mobile tabs */}
      <div className="flex gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.04] mb-6 lg:hidden overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 px-3 rounded-lg text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === tab.key ? 'bg-white/[0.08] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Desktop layout: 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Left column: Knowledge Graph + Ask AI */}
        <div className={`lg:col-span-3 space-y-4 ${activeTab !== 'graph' && activeTab !== 'ask' ? 'hidden lg:block' : ''}`}>
          {/* Knowledge Graph */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card p-4 rounded-2xl ${activeTab !== 'graph' ? 'hidden lg:block' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                <h2 className="text-[13px] font-semibold text-white">Knowledge Map</h2>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleSyncHistory}
                  className="text-[11px] text-primary hover:text-primary/80 transition-colors bg-primary/[0.08] hover:bg-primary/[0.12] px-2 py-1 rounded"
                >
                  Sync Past Workflows
                </button>
                {graphData?.nodes?.length > 0 && (
                  <span className="text-[10px] text-gray-600">
                    {graphData.nodes.length} topics · {graphData.edges?.length || 0} connections
                  </span>
                )}
              </div>
            </div>
            <KnowledgeGraphPanel
              graphData={graphData}
              isLoading={graphLoading}
              onNodeClick={(node) => setSelectedNode(node)}
            />
            {/* Selected node details */}
            <AnimatePresence>
              {selectedNode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 p-3 rounded-xl bg-primary/[0.05] border border-primary/[0.1]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-[13px] font-semibold text-white">{selectedNode.label}</span>
                    </div>
                    <button onClick={() => setSelectedNode(null)} className="text-gray-600 hover:text-gray-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {selectedNode.description && (
                    <p className="text-[11px] text-gray-500 mt-1.5 ml-5">{selectedNode.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 ml-5 text-[10px] text-gray-600">
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Frequency: {selectedNode.frequency}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Ask AI */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`glass-card p-4 rounded-2xl ${activeTab !== 'ask' && activeTab !== 'graph' ? 'hidden lg:block' : ''}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-emerald" />
              <h2 className="text-[13px] font-semibold text-white">Ask Your Brain</h2>
            </div>
            <AskAIPanel />
          </motion.div>
        </div>

        {/* Right column: Insights + Revision */}
        <div className={`lg:col-span-2 space-y-4 ${activeTab !== 'insights' && activeTab !== 'revision' ? 'hidden lg:block' : ''}`}>
          {/* Insights */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`glass-card p-4 rounded-2xl ${activeTab !== 'insights' ? 'hidden lg:block' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <h2 className="text-[13px] font-semibold text-white">Study Insights</h2>
              </div>
              <button onClick={fetchInsights} className="text-gray-700 hover:text-gray-400 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <InsightsPanel insights={insights} isLoading={insightsLoading} onRefresh={fetchInsights} />
          </motion.div>

          {/* Revision */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`glass-card p-4 rounded-2xl ${activeTab !== 'revision' ? 'hidden lg:block' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <h2 className="text-[13px] font-semibold text-white">Today's Revision</h2>
              </div>
              <button onClick={fetchRevision} className="text-gray-700 hover:text-gray-400 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <RevisionPanel
              revision={revision}
              isLoading={revisionLoading}
              onUpdate={() => { fetchRevision(); fetchInsights(); }}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SecondBrain;
