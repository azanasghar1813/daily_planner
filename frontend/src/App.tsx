import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Today from './pages/Today';
import Calendar from './pages/Calendar';
import Notes from './pages/Notes';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import { useEffect } from 'react';
import { syncData, setupSSE, closeSSE } from './db/sync';
import { supabase } from './supabase';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider, useAuth } from './components/AuthProvider';

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      syncData();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setupSSE(session.access_token);
        }
      });
      const intervalId = setInterval(() => {
        syncData();
      }, 60 * 1000); // sync every 60 seconds as fallback

      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          syncData();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => {
        clearInterval(intervalId);
        document.removeEventListener('visibilitychange', handleVisibility);
        closeSSE();
      };
    }
  }, [user]);

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-background text-muted-foreground">Loading...</div>;

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<Today />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="daily-planner-theme">
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
