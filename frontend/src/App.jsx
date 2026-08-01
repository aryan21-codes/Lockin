import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './components/ui/Toast';
import { useGuestStore } from './store/useGuestStore';

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

// ─── Routes guests CAN access ─────────────────────────────────
const GUEST_ALLOWED_PATHS = ['/', '/notes', '/flashcards', '/code-explainer', '/ppt'];

const ProtectedRoute = ({ children }) => {
  const { session, loading } = useAuth();
  const isGuest = useGuestStore((state) => state.isGuest);
  
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
  
  // Allow authenticated users through
  if (session) {
    return children;
  }

  // Allow guest users through
  if (isGuest) {
    return children;
  }

  // Not authenticated and not guest → redirect to auth
  return <Navigate to="/auth" />;
};

/**
 * Wraps routes that are NOT accessible to guests.
 * Redirects guests to /auth with a contextual message.
 */
const AuthOnlyRoute = ({ children }) => {
  const { session } = useAuth();
  const isGuest = useGuestStore((state) => state.isGuest);

  if (isGuest && !session) {
    return <Navigate to="/auth" state={{ guestBlocked: true }} />;
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
              {/* Guest-accessible AI demo routes */}
              <Route path="notes" element={<Suspense fallback={<PageSkeleton />}><NotesSummarizer /></Suspense>} />
              <Route path="flashcards" element={<Suspense fallback={<PageSkeleton />}><FlashcardsPage /></Suspense>} />
              <Route path="code-explainer" element={<Suspense fallback={<PageSkeleton />}><CodeExplainerPage /></Suspense>} />
              <Route path="ppt" element={<Suspense fallback={<PageSkeleton />}><PPTGenerator /></Suspense>} />
              {/* Auth-only routes — guests are redirected */}
              <Route path="youtube" element={<AuthOnlyRoute><Suspense fallback={<PageSkeleton />}><YouTubeSummarizer /></Suspense></AuthOnlyRoute>} />
              <Route path="todos" element={<AuthOnlyRoute><Suspense fallback={<PageSkeleton />}><TodoList /></Suspense></AuthOnlyRoute>} />
              <Route path="sticky" element={<AuthOnlyRoute><Suspense fallback={<PageSkeleton />}><StickyNotes /></Suspense></AuthOnlyRoute>} />
              <Route path="history" element={<AuthOnlyRoute><Suspense fallback={<PageSkeleton />}><HistoryPage /></Suspense></AuthOnlyRoute>} />
              <Route path="workflow" element={<AuthOnlyRoute><Suspense fallback={<PageSkeleton />}><AIWorkflow /></Suspense></AuthOnlyRoute>} />
              <Route path="exam-intelligence" element={<AuthOnlyRoute><Suspense fallback={<PageSkeleton />}><ExamIntelligence /></Suspense></AuthOnlyRoute>} />
              <Route path="brain" element={<AuthOnlyRoute><Suspense fallback={<PageSkeleton />}><SecondBrain /></Suspense></AuthOnlyRoute>} />
            </Route>
          </Routes>
          <Analytics />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
