import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';

// ─── Lazy-loaded pages ────────────────────────────────────────
// Only Dashboard and Auth are eagerly loaded for fastest first paint.
// All other pages are code-split and loaded on demand.
const YouTubeSummarizer = React.lazy(() => import('./pages/YouTubeSummarizer'));
const PPTGenerator = React.lazy(() => import('./pages/PPTGenerator'));
const TodoList = React.lazy(() => import('./pages/TodoList'));
const NotesSummarizer = React.lazy(() => import('./pages/NotesSummarizer'));
const StickyNotes = React.lazy(() => import('./pages/StickyNotes'));
const FlashcardsPage = React.lazy(() => import('./pages/FlashcardsPage'));
const CodeExplainerPage = React.lazy(() => import('./pages/CodeExplainerPage'));
const HistoryPage = React.lazy(() => import('./pages/History'));
const AIWorkflow = React.lazy(() => import('./pages/AIWorkflow'));
const ExamIntelligence = React.lazy(() => import('./pages/ExamIntelligence'));
const SecondBrain = React.lazy(() => import('./pages/SecondBrain'));

// ─── Page Loading Skeleton ────────────────────────────────────
const PageSkeleton = () => (
  <div className="w-full h-full min-h-[60vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
      <span className="text-xs text-gray-600 font-medium tracking-wide">Loading module…</span>
    </div>
  </div>
);

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
              <Route path="notes" element={<Suspense fallback={<PageSkeleton />}><NotesSummarizer /></Suspense>} />
              <Route path="youtube" element={<Suspense fallback={<PageSkeleton />}><YouTubeSummarizer /></Suspense>} />
              <Route path="ppt" element={<Suspense fallback={<PageSkeleton />}><PPTGenerator /></Suspense>} />
              <Route path="todos" element={<Suspense fallback={<PageSkeleton />}><TodoList /></Suspense>} />
              <Route path="sticky" element={<Suspense fallback={<PageSkeleton />}><StickyNotes /></Suspense>} />
              <Route path="flashcards" element={<Suspense fallback={<PageSkeleton />}><FlashcardsPage /></Suspense>} />
              <Route path="code-explainer" element={<Suspense fallback={<PageSkeleton />}><CodeExplainerPage /></Suspense>} />
              <Route path="history" element={<Suspense fallback={<PageSkeleton />}><HistoryPage /></Suspense>} />
              <Route path="workflow" element={<Suspense fallback={<PageSkeleton />}><AIWorkflow /></Suspense>} />
              <Route path="exam-intelligence" element={<Suspense fallback={<PageSkeleton />}><ExamIntelligence /></Suspense>} />
              <Route path="brain" element={<Suspense fallback={<PageSkeleton />}><SecondBrain /></Suspense>} />
            </Route>
          </Routes>
          <Analytics />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
