import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, X, LayoutDashboard, FileText, MonitorPlay, Presentation, 
  CheckSquare, StickyNote, Layers, Terminal, History, Zap, Brain,
  ArrowRight, CornerDownLeft
} from 'lucide-react';

const searchItems = [
  { 
    name: 'Dashboard', 
    description: 'Overview & stats', 
    path: '/', 
    icon: LayoutDashboard, 
    color: 'text-primary',
    category: 'Navigation'
  },
  { 
    name: 'AI Workflow', 
    description: 'Automated AI pipeline — extract, summarize, flashcards & quiz', 
    path: '/workflow', 
    icon: Zap, 
    color: 'text-cyan-400',
    category: 'AI Tools',
    keywords: ['pipeline', 'automation', 'upload', 'process']
  },
  { 
    name: 'AI Notes Summarizer', 
    description: 'Condense documents & PDFs into actionable insights', 
    path: '/notes', 
    icon: FileText, 
    color: 'text-amber-400',
    category: 'AI Tools',
    keywords: ['summarize', 'text', 'document', 'pdf', 'notes']
  },
  { 
    name: 'YouTube Summarizer', 
    description: 'Extract key insights from any YouTube video', 
    path: '/youtube', 
    icon: MonitorPlay, 
    color: 'text-red-400',
    category: 'AI Tools',
    keywords: ['video', 'transcript', 'youtube', 'yt']
  },
  { 
    name: 'PPT Generator', 
    description: 'Create polished slide decks from a prompt', 
    path: '/ppt', 
    icon: Presentation, 
    color: 'text-orange-400',
    category: 'AI Tools',
    keywords: ['slides', 'presentation', 'powerpoint', 'deck']
  },
  { 
    name: 'Flashcards', 
    description: 'Auto-generate spaced-repetition flashcards', 
    path: '/flashcards', 
    icon: Layers, 
    color: 'text-violet-400',
    category: 'AI Tools',
    keywords: ['study', 'learn', 'cards', 'revision', 'quiz']
  },
  { 
    name: 'Code Explainer', 
    description: 'Get line-by-line breakdowns of complex code', 
    path: '/code-explainer', 
    icon: Terminal, 
    color: 'text-blue-400',
    category: 'AI Tools',
    keywords: ['code', 'explain', 'debug', 'programming']
  },
  { 
    name: 'Todo List', 
    description: 'Track priorities and manage assignments', 
    path: '/todos', 
    icon: CheckSquare, 
    color: 'text-emerald-400',
    category: 'Workspace',
    keywords: ['tasks', 'todo', 'checklist', 'assignment']
  },
  { 
    name: 'Sticky Notes', 
    description: 'Draggable sticky notes board', 
    path: '/sticky', 
    icon: StickyNote, 
    color: 'text-yellow-400',
    category: 'Workspace',
    keywords: ['note', 'board', 'sticky', 'memo']
  },
  { 
    name: 'History', 
    description: 'View recent AI generation activity', 
    path: '/history', 
    icon: History, 
    color: 'text-gray-400',
    category: 'Workspace',
    keywords: ['recent', 'activity', 'log', 'past']
  },
  { 
    name: 'My Second Brain', 
    description: 'Knowledge graph, RAG chat, study insights & revision', 
    path: '/brain', 
    icon: Brain, 
    color: 'text-fuchsia-400',
    category: 'Intelligence',
    keywords: ['brain', 'knowledge', 'graph', 'rag', 'ai', 'insights', 'revision', 'spaced repetition']
  },
];

const SearchPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const navigate = useNavigate();

  // Filter results based on query
  const filteredResults = query.trim() === ''
    ? searchItems
    : searchItems.filter(item => {
        const q = query.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.keywords && item.keywords.some(k => k.includes(q)))
        );
      });

  // Group results by category
  const groupedResults = filteredResults.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // Flat list for keyboard navigation
  const flatResults = filteredResults;

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selected = resultsRef.current.querySelector('[data-selected="true"]');
      if (selected) {
        selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback((item) => {
    navigate(item.path);
    onClose();
  }, [navigate, onClose]);

  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatResults[selectedIndex]) {
          handleSelect(flatResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [flatResults, selectedIndex, handleSelect, onClose]);

  if (!isOpen) return null;

  let globalIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="relative w-full max-w-[560px] mx-4 animate-slideDown">
        <div className="bg-[#0f1117]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.03)] overflow-hidden">
          
          {/* Search Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
            <Search className="w-5 h-5 text-gray-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search pages, tools, actions..."
              className="flex-1 bg-transparent text-[15px] text-white placeholder-gray-600 focus:outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="p-1 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:flex items-center h-6 px-2 bg-white/[0.04] rounded-md text-[10px] text-gray-600 border border-white/[0.06] font-mono tracking-wider">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={resultsRef} className="max-h-[360px] overflow-y-auto custom-scrollbar py-2">
            {flatResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Search className="w-10 h-10 text-gray-700 mb-3" />
                <p className="text-gray-500 text-sm font-medium">No results found</p>
                <p className="text-gray-700 text-xs mt-1">Try searching for a different term</p>
              </div>
            ) : (
              Object.entries(groupedResults).map(([category, items]) => (
                <div key={category}>
                  <div className="px-5 pt-3 pb-1.5">
                    <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-600">
                      {category}
                    </span>
                  </div>
                  {items.map((item) => {
                    globalIndex++;
                    const currentIdx = globalIndex;
                    const isSelected = currentIdx === selectedIndex;
                    return (
                      <button
                        key={item.path}
                        data-selected={isSelected}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(currentIdx)}
                        className={`w-full flex items-center gap-3.5 px-5 py-3 text-left transition-all duration-150 group ${
                          isSelected 
                            ? 'bg-white/[0.06]' 
                            : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                          isSelected 
                            ? 'bg-white/[0.08] scale-105' 
                            : 'bg-white/[0.03]'
                        }`}>
                          <item.icon className={`w-[18px] h-[18px] ${item.color} transition-colors`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[13px] font-semibold transition-colors ${
                              isSelected ? 'text-white' : 'text-gray-300'
                            }`}>
                              {highlightMatch(item.name, query)}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-600 truncate mt-0.5">
                            {item.description}
                          </p>
                        </div>
                        <ArrowRight className={`w-4 h-4 shrink-0 transition-all duration-200 ${
                          isSelected 
                            ? 'text-gray-400 opacity-100 translate-x-0' 
                            : 'text-gray-700 opacity-0 -translate-x-1'
                        }`} />
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 px-5 py-2.5 border-t border-white/[0.06] bg-white/[0.01]">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
              <kbd className="h-[18px] px-1.5 bg-white/[0.04] rounded text-[10px] border border-white/[0.06] font-mono flex items-center">↑</kbd>
              <kbd className="h-[18px] px-1.5 bg-white/[0.04] rounded text-[10px] border border-white/[0.06] font-mono flex items-center">↓</kbd>
              <span className="ml-0.5">Navigate</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
              <CornerDownLeft className="w-3 h-3" />
              <span>Open</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
              <kbd className="h-[18px] px-1.5 bg-white/[0.04] rounded text-[10px] border border-white/[0.06] font-mono flex items-center">esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Highlight matching characters in the name
function highlightMatch(text, query) {
  if (!query.trim()) return text;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <span className="text-primary">{text.slice(index, index + query.length)}</span>
      {text.slice(index + query.length)}
    </>
  );
}

export default SearchPalette;
