import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useGuestStore } from '../store/useGuestStore';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const isGuest = useGuestStore((state) => state.isGuest);
  const clearGuestSession = useGuestStore((state) => state.clearGuestSession);

  useEffect(() => {
    // Check active session on mount
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };
    
    checkSession();

    // Listen for auth state changes globally
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // If user logs in/signs up while in guest mode, clear guest state
        if (session && isGuest) {
          clearGuestSession();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    // Clear guest state on successful login
    if (useGuestStore.getState().isGuest) {
      clearGuestSession();
    }
    return data;
  };

  const signup = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        }
      }
    });
    if (error) throw error;
    // Clear guest state on successful signup
    if (useGuestStore.getState().isGuest) {
      clearGuestSession();
    }
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signInWithGoogleIdToken = async (token) => {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: token,
    });
    if (error) throw error;
    // Clear guest state on successful login
    if (useGuestStore.getState().isGuest) {
      clearGuestSession();
    }
    return data;
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
    return data;
  };

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?type=recovery`,
    });
    if (error) throw error;
    return data;
  };

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, session, login, signup, logout, signInWithGoogle, signInWithGoogleIdToken, resetPassword, updatePassword, loading, isGuest }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
