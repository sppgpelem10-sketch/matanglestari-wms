// src/lib/authContext.jsx
// ============================================
// Auth Context — Supabase Auth
// ============================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseEnabled } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load session + profile saat mount
  useEffect(() => {
    if (!isSupabaseEnabled()) {
      console.warn('[auth] Supabase tidak aktif, skip auth');
      setLoading(false);
      return;
    }

    let mounted = true;

    async function init() {
      try {
        // Get session
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('[auth] init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[auth] event:', event);

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setProfile(null);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          // Load profile — ini async, ditunggu
          await loadProfile(session.user.id);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load profile dari tabel profiles
  async function loadProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[auth] load profile error:', error);
        setError(error.message);
        return null;
      }

      console.log('[auth] profile loaded:', data);
      setProfile(data);
      return data;
    } catch (err) {
      console.error('[auth] load profile exception:', err);
      return null;
    }
  }

  // Login
  async function signIn(email, password) {
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      throw error;
    }

    // Profile akan ke-load otomatis lewat onAuthStateChange
    return data;
  }

  // Logout
  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[auth] signOut error:', err);
    }
    setUser(null);
    setProfile(null);
  }

  // Refresh profile manual
  async function refreshProfile() {
    if (user) {
      return await loadProfile(user.id);
    }
    return null;
  }

  // Check role helper
  function hasRole(...roles) {
    if (!profile) return false;
    return roles.includes(profile.role);
  }

  const value = {
    user,
    profile,
    loading,
    error,
    signIn,
    signOut,
    refreshProfile,
    hasRole,
    isAuthenticated: !!user,
    isSupabaseReady: isSupabaseEnabled(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  }
  return ctx;
}