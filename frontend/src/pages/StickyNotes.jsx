import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Plus, Trash2, Loader2 } from 'lucide-react';
import AnimatedButton from '../components/ui/AnimatedButton';
import { api } from '../lib/api';

// Color presets — store a short key in DB, map to full Tailwind classes on the frontend
const COLOR_MAP = {
  yellow: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-100 shadow-[0_0_15px_rgba(234,179,8,0.2)]',
  blue:   'bg-neonBlue/20 border-neonBlue/50 text-blue-100 shadow-[0_0_15px_rgba(0,204,255,0.2)]',
  purple: 'bg-neonPurple/20 border-neonPurple/50 text-pink-100 shadow-[0_0_15px_rgba(161,51,255,0.2)]',
  green:  'bg-green-500/20 border-green-500/50 text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.2)]',
};
const COLOR_KEYS = Object.keys(COLOR_MAP);

const StickyNotes = () => {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggingId, setDraggingId] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Debounce timers for auto-saving text and position changes
  const saveTimers = useRef({});

  // ── Fetch notes on mount ──
  useEffect(() => {
    fetchNotes();
    return () => {
      // Clear any pending save timers on unmount
      Object.values(saveTimers.current).forEach(clearTimeout);
    };
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await api.get('/api/sticky-notes/');
      if (res.data.success) {
        setNotes(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch sticky notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Debounced save — batches rapid text/position changes into a single API call ──
  const debouncedUpdate = useCallback((noteId, updates) => {
    if (saveTimers.current[noteId]) clearTimeout(saveTimers.current[noteId]);
    saveTimers.current[noteId] = setTimeout(async () => {
      try {
        await api.put(`/api/sticky-notes/${noteId}`, updates);
      } catch (err) {
        console.error('Failed to save sticky note:', err);
      }
    }, 500);
  }, []);

  // ── Add note ──
  const addNote = async () => {
    const colorKey = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
    const tempId = `temp-${Date.now()}`;
    const newNote = {
      id: tempId,
      text: '',
      color: colorKey,
      x: Math.random() * 200 + 50,
      y: Math.random() * 200 + 50,
    };

    // Optimistic UI
    setNotes(prev => [...prev, newNote]);

    try {
      const res = await api.post('/api/sticky-notes/', {
        text: '',
        color: colorKey,
        x: newNote.x,
        y: newNote.y,
      });
      if (res.data.success && res.data.data) {
        // Replace temp note with real one from server
        setNotes(prev => prev.map(n => n.id === tempId ? res.data.data : n));
      }
    } catch (err) {
      console.error('Failed to create note:', err);
      setNotes(prev => prev.filter(n => n.id !== tempId));
    }
  };

  // ── Delete note ──
  const deleteNote = async (id) => {
    const prev = [...notes];
    setNotes(notes.filter(n => n.id !== id));
    try {
      await api.delete(`/api/sticky-notes/${id}`);
    } catch (err) {
      console.error('Failed to delete note:', err);
      setNotes(prev);
    }
  };

  // ── Update text ──
  const updateText = (id, text) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n));
    if (!id.toString().startsWith('temp-')) {
      debouncedUpdate(id, { text });
    }
  };

  // ── Drag handlers ──
  const handlePointerDown = (e, id) => {
    e.target.setPointerCapture(e.pointerId);
    setDraggingId(id);
    const note = notes.find(n => n.id === id);
    setOffset({
      x: e.clientX - note.x,
      y: e.clientY - note.y
    });
  };

  const handlePointerMove = (e) => {
    if (!draggingId) return;
    const newX = e.clientX - offset.x;
    const newY = e.clientY - offset.y;
    setNotes(prev => prev.map(note => {
      if (note.id === draggingId) {
        return { ...note, x: newX, y: newY };
      }
      return note;
    }));
  };

  const handlePointerUp = () => {
    if (draggingId) {
      const note = notes.find(n => n.id === draggingId);
      if (note && !note.id.toString().startsWith('temp-')) {
        debouncedUpdate(draggingId, { x: note.x, y: note.y });
      }
    }
    setDraggingId(null);
  };

  return (
    <div className="h-full w-full flex flex-col pb-4">
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-6 z-10 shrink-0"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <motion.div whileHover={{ rotate: 10, scale: 1.1 }} transition={{ type: 'spring', stiffness: 300 }}>
              <StickyNote className="w-8 h-8 text-pink-500" />
            </motion.div>
            Sticky Notes Board
          </h1>
          <p className="text-gray-400">Draggable notes that autosave to your dashboard.</p>
        </div>
        <AnimatedButton 
          onClick={addNote}
          variant="secondary"
          className="px-6 py-3 rounded-xl border border-white/10 font-medium"
        >
          <Plus className="w-5 h-5" /> New Note
        </AnimatedButton>
      </motion.header>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex-1 glass-panel rounded-2xl relative overflow-hidden bg-surface/30 cursor-crosshair touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
          </div>
        ) : (
          <>
            <AnimatePresence>
              {notes.map(note => (
                <motion.div 
                  key={note.id}
                  initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                  animate={{ 
                    opacity: 1, 
                    scale: draggingId === note.id ? 1.05 : 1, 
                    rotate: 0,
                    boxShadow: draggingId === note.id ? '0 25px 50px rgba(0,0,0,0.4)' : 'none',
                  }}
                  exit={{ opacity: 0, scale: 0.3, rotate: 15, transition: { duration: 0.2 } }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className={`absolute w-64 h-64 p-5 rounded-2xl border backdrop-blur-xl flex flex-col gap-3 group ${COLOR_MAP[note.color] || COLOR_MAP.yellow} ${draggingId === note.id ? 'z-50 cursor-grabbing' : 'cursor-grab z-10 hover:z-40'}`}
                  style={{ left: note.x, top: note.y }}
                  onPointerDown={(e) => {
                    if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                      handlePointerDown(e, note.id);
                    }
                  }}
                >
                  <div className="w-full flex justify-between items-center shrink-0 mb-1">
                    <div className="w-12 h-2 bg-white/20 rounded-full mx-auto cursor-grab active:cursor-grabbing"></div>
                    <motion.button 
                      onClick={() => deleteNote(note.id)}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.8 }}
                      className="opacity-0 group-hover:opacity-100 text-white/50 hover:text-red-400 transition-all p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                  
                  <textarea 
                    value={note.text}
                    onChange={(e) => updateText(note.id, e.target.value)}
                    placeholder="Write something..."
                    className="w-full h-full bg-transparent border-none resize-none focus:outline-none custom-scrollbar outline-none font-medium"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {notes.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none"
              >
                Click 'New Note' to create your first sticky note
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default StickyNotes;
