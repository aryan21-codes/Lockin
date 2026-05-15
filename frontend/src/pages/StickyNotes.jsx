import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Plus, Trash2 } from 'lucide-react';
import AnimatedButton from '../components/ui/AnimatedButton';

const StickyNotes = () => {
  const [notes, setNotes] = useState([
    { id: 1, text: 'Brainstorm ideas for the new app features', color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-100 shadow-[0_0_15px_rgba(234,179,8,0.2)]', x: 20, y: 20 },
    { id: 2, text: 'Review pull requests before 5 PM', color: 'bg-neonBlue/20 border-neonBlue/50 text-blue-100 shadow-[0_0_15px_rgba(0,204,255,0.2)]', x: 320, y: 50 },
    { id: 3, text: "Don't forget to email professor about the extension", color: 'bg-neonPurple/20 border-neonPurple/50 text-pink-100 shadow-[0_0_15px_rgba(161,51,255,0.2)]', x: 100, y: 250 },
  ]);

  const [draggingId, setDraggingId] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const addNote = () => {
    const colors = [
      'bg-yellow-500/20 border-yellow-500/50 text-yellow-100 shadow-[0_0_15px_rgba(234,179,8,0.2)]',
      'bg-neonBlue/20 border-neonBlue/50 text-blue-100 shadow-[0_0_15px_rgba(0,204,255,0.2)]',
      'bg-neonPurple/20 border-neonPurple/50 text-pink-100 shadow-[0_0_15px_rgba(161,51,255,0.2)]',
      'bg-green-500/20 border-green-500/50 text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
    ];
    const newNote = {
      id: Date.now(),
      text: '',
      color: colors[Math.floor(Math.random() * colors.length)],
      x: Math.random() * 200 + 50,
      y: Math.random() * 200 + 50
    };
    setNotes([...notes, newNote]);
  };

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
    setNotes(notes.map(note => {
      if (note.id === draggingId) {
        return {
          ...note,
          x: e.clientX - offset.x,
          y: e.clientY - offset.y
        };
      }
      return note;
    }));
  };

  const handlePointerUp = () => {
    setDraggingId(null);
  };

  const deleteNote = (id) => {
    setNotes(notes.filter(n => n.id !== id));
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
               className={`absolute w-64 h-64 p-5 rounded-2xl border backdrop-blur-xl flex flex-col gap-3 group ${note.color} ${draggingId === note.id ? 'z-50 cursor-grabbing' : 'cursor-grab z-10 hover:z-40'}`}
               style={{ left: note.x, top: note.y }}
               onPointerDown={(e) => {
                 // Only initiate drag on the wrapper, not on textarea or button
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
                 onChange={(e) => setNotes(notes.map(n => n.id === note.id ? { ...n, text: e.target.value } : n))}
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
      </motion.div>
    </div>
  );
};

export default StickyNotes;
