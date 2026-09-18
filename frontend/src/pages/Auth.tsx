import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../components/AuthProvider';
import { Navigate } from 'react-router-dom';
import { Mail, ArrowRight, Lock, MailCheck } from 'lucide-react';

export default function Auth() {
  const { user } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'confirm_email'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to today
  if (user) {
    return <Navigate to="/today" replace />;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // If email confirmation is disabled, session will exist.
        if (!data.session) {
          setAuthMode('confirm_email');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  if (authMode === 'confirm_email') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card border border-border p-8 rounded-2xl shadow-xl flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <MailCheck className="text-primary" size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-3">Check your inbox</h2>
          <p className="text-muted-foreground mb-6">
            We've sent a verification link to <span className="font-medium text-foreground">{email}</span>. 
            Please click the link to confirm your account.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            You can safely close this window or return to login once confirmed.
          </p>
          <button 
            onClick={() => setAuthMode('login')}
            className="w-full py-3 px-4 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card border border-border p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-4 p-2 shadow-inner border border-primary/10">
            <img src="/logo.png" alt="Daily Planner Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Daily Planner</h1>
          <p className="text-muted-foreground">Sign in to sync your tasks everywhere.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="group w-full flex items-center justify-center py-3 px-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 mt-6 shadow-sm shadow-primary/25"
          >
            <span>{loading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}</span>
            {!loading && <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(null); }}
              className="text-primary font-semibold hover:underline"
            >
              {authMode === 'login' ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
