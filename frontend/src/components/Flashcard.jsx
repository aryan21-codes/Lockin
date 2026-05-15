import React, { useState } from 'react';
import { RefreshCw, Trash2, Brain } from 'lucide-react';
import { api } from '../lib/api';

const Flashcard = ({ card, onDelete }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dynamic Tailwind mapping isolating the specific badge tags safely
  const difficultyColors = {
    easy: "text-green-400 border-green-400/20 bg-green-400/10",
    medium: "text-amber-400 border-amber-400/20 bg-amber-400/10",
    hard: "text-red-400 border-red-400/20 bg-red-400/10"
  };

  const badgeClass = difficultyColors[card.difficulty?.toLowerCase()] || difficultyColors.medium;

  const handleDelete = async (e) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      // Delete off Supabase via the router natively executing the SQL drop
      if (card.id && !card.id.toString().startsWith("temp")) {
         await api.delete(`/api/flashcards/${card.id}`);
      }
      onDelete(card.id);
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  return (
    <div 
      className={`relative h-72 w-full rounded-2xl cursor-pointer group transition-all duration-300 ${isDeleting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
      style={{ perspective: "1000px" }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div 
        className="w-full h-full duration-500 absolute top-0 left-0"
        style={{ transformStyle: "preserve-3d", transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front of Card */}
        <div 
          className="absolute w-full h-full glass-panel border border-white/10 rounded-2xl p-6 flex flex-col hover:border-amber-500/30 transition-colors shadow-lg"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex justify-between items-start mb-4">
            <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${badgeClass}`}>
              {card.difficulty || "medium"}
            </span>
            <button 
              onClick={handleDelete}
              className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-red-400 transition-colors z-10"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center text-center">
            <p className="text-xl font-medium text-white">{card.question}</p>
          </div>
          <div className="flex justify-center mt-4 text-gray-500 text-sm items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Click to flip
          </div>
        </div>

        {/* Back of Card */}
        <div 
          className="absolute w-full h-full glass-panel border border-amber-500/30 rounded-2xl p-6 flex flex-col bg-surface/90 shadow-xl"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2 text-amber-500">
               <Brain className="w-5 h-5" />
               <span className="text-sm font-semibold uppercase tracking-wider">Answer</span>
            </div>
            <button 
              onClick={handleDelete}
              className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-red-400 transition-colors z-10"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center text-center overflow-y-auto custom-scrollbar pr-2">
            <p className="text-gray-300 leading-relaxed text-sm md:text-base">{card.answer}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
