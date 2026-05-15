import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import YouTubeSummarizer from './pages/YouTubeSummarizer';
import PPTGenerator from './pages/PPTGenerator';
import TodoList from './pages/TodoList';
import NotesSummarizer from './pages/NotesSummarizer';
import StickyNotes from './pages/StickyNotes';
import Auth from './pages/Auth';
import FlashcardsPage from './pages/FlashcardsPage';
import CodeExplainerPage from './pages/CodeExplainerPage';
import HistoryPage from './pages/History';
import AIWorkflow from './pages/AIWorkflow';
import ExamIntelligence from './pages/ExamIntelligence';
import SecondBrain from './pages/SecondBrain';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';

const PlaceholderContent = ({ title }) => (
  <div className="flex h-full items-center justify-center text-gray-500 animate-in fade-in duration-500">
    <div className="glass-panel p-10 rounded-2xl flex flex-col items-center gap-4 max-w-md text-center">
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <p className="text-sm">This feature is currently under construction. Please check back later.</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { session, loading } = useAuth();
  
  if (loading) {
      return (
          <div className="flex w-full h-screen items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
                <span className="text-xs text-gray-600 font-medium tracking-wide">Loading your workspace…</span>
              </div>
          </div>
      );
  }
  
  if (!session) {
    return <Navigate to="/auth" />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="notes" element={<NotesSummarizer />} />
              <Route path="youtube" element={<YouTubeSummarizer />} />
              <Route path="ppt" element={<PPTGenerator />} />
              <Route path="todos" element={<TodoList />} />
              <Route path="sticky" element={<StickyNotes />} />
              <Route path="flashcards" element={<FlashcardsPage />} />
              <Route path="code-explainer" element={<CodeExplainerPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="workflow" element={<AIWorkflow />} />
              <Route path="exam-intelligence" element={<ExamIntelligence />} />
              <Route path="brain" element={<SecondBrain />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
