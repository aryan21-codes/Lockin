import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { CheckSquare, Plus, Calendar, Flag, Trash2, Circle, CheckCircle2, ListTodo } from 'lucide-react';
import AnimatedButton from '../components/ui/AnimatedButton';
import { TodoSkeleton } from '../components/ui/SkeletonLoader';
import { useToast } from '../components/ui/Toast';

const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const response = await api.get('/api/todos/');
      if (response.data.success) {
        setTodos(response.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    try {
      const response = await api.post('/api/todos/', {
        title: newTask,
        priority: priority,
        due_date: null,
        completed: false
      });
      
      if (response.data.success) {
        setTodos([...todos, response.data.data]);
        setNewTask('');
        setPriority('medium');
        toast.success('Task added!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to add task');
    }
  };

  const toggleTodo = async (id) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    const newCompleted = !todo.completed;
    setTodos(todos.map(t => t.id === id ? { ...t, completed: newCompleted } : t));
    
    if (newCompleted) {
      toast.success('Task completed! 🎉');
    }
    
    try {
      await api.put(`/api/todos/${id}`, { completed: newCompleted });
    } catch (err) {
      console.error(err);
      setTodos(todos.map(t => t.id === id ? { ...t, completed: !newCompleted } : t));
    }
  };

  const deleteTodo = async (id) => {
    const prevTodos = [...todos];
    setTodos(todos.filter(todo => todo.id !== id));
    try {
      await api.delete(`/api/todos/${id}`);
      toast.info('Task deleted');
    } catch (err) {
      console.error(err);
      setTodos(prevTodos);
    }
  };

  const priorityConfig = {
    high: { color: 'text-red-400', bg: 'bg-red-500/[0.06]', border: 'border-red-500/[0.12]', dot: 'bg-red-400' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-500/[0.06]', border: 'border-amber-500/[0.12]', dot: 'bg-amber-400' },
    low: { color: 'text-emerald-400', bg: 'bg-emerald-500/[0.06]', border: 'border-emerald-500/[0.12]', dot: 'bg-emerald-400' },
  };

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-1.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.1 }}
              className="w-9 h-9 rounded-xl bg-emerald/[0.1] border border-emerald/[0.15] flex items-center justify-center"
            >
              <CheckSquare className="w-[18px] h-[18px] text-emerald" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Tasks</h1>
            </div>
          </div>
          {totalCount > 0 && (
            <div className="text-[12px] font-medium text-gray-500">
              <span className="text-emerald">{completedCount}</span> / {totalCount} completed
            </div>
          )}
        </div>
      </motion.header>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-emerald to-emerald/60 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / totalCount) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      )}

      {/* Add task form */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4 rounded-2xl"
      >
        <form onSubmit={handleAddTodo} className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            placeholder="What needs to be done?" 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl py-3 px-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/40 focus:bg-white/[0.04] input-glow transition-all"
            required
          />
          <div className="flex gap-3">
            <select 
              value={priority} 
              onChange={(e) => setPriority(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 text-sm text-gray-400 focus:outline-none focus:border-primary/40 outline-none cursor-pointer"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <AnimatedButton 
              type="submit" 
              variant="primary"
              className="px-5 py-3 rounded-xl text-sm font-medium shrink-0"
            >
              <Plus className="w-4 h-4" /> Add
            </AnimatedButton>
          </div>
        </form>
      </motion.div>

      {/* Task list */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card rounded-2xl overflow-hidden"
      >
        {isLoading ? (
          <TodoSkeleton />
        ) : todos.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-14 flex flex-col justify-center items-center text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
              <ListTodo className="w-6 h-6 text-gray-600" />
            </div>
            <h3 className="text-gray-400 font-medium text-[14px]">No tasks yet</h3>
            <p className="text-gray-600 text-[12px] mt-1.5 max-w-[200px]">Add your first task above to start tracking your productivity.</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            <div className="divide-y divide-white/[0.04]">
              {todos.sort((a,b) => a.completed - b.completed).map((todo, idx) => {
                const p = priorityConfig[todo.priority] || priorityConfig.medium;
                return (
                  <motion.div 
                    key={todo.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -30, height: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    layout
                    className={`flex justify-between items-center px-5 py-4 hover:bg-white/[0.02] transition-all duration-200 group ${todo.completed ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <motion.button 
                        onClick={() => toggleTodo(todo.id)} 
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        className="text-gray-500 hover:text-emerald transition-colors shrink-0"
                      >
                        {todo.completed ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-emerald" />
                          </motion.div>
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </motion.button>
                      <div className={`flex flex-col min-w-0 ${todo.completed ? 'line-through' : ''}`}>
                        <span className={`font-medium text-[14px] truncate ${todo.completed ? 'text-gray-500' : 'text-gray-200'}`}>{todo.title}</span>
                        <div className="flex gap-2 items-center mt-1">
                           <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold tracking-wide uppercase ${p.bg} ${p.border} ${p.color} flex items-center gap-1`}>
                             <span className={`w-1 h-1 rounded-full ${p.dot}`}></span>
                             {todo.priority}
                           </span>
                           {todo.due_date && (
                             <span className="flex items-center gap-1 text-[11px] text-gray-500">
                               <Calendar className="w-3 h-3" /> {todo.due_date}
                             </span>
                           )}
                        </div>
                      </div>
                    </div>
                    
                    <motion.button 
                      onClick={() => deleteTodo(todo.id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="opacity-0 group-hover:opacity-100 p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/[0.06] rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
};

export default TodoList;
