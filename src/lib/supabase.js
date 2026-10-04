// src/lib/supabase.js
// ============================================
// Supabase client + helper functions
// ============================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[supabase] WARNING: VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum di-set di .env'
  );
}

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const isSupabaseEnabled = () => supabase !== null;

// ============ AUTH ============

export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

// ============ PROFILE ============

export async function getMyProfile() {
  if (!supabase) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function getAllProfiles() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ============ GENERIC ============

export async function fetchAll(table, orderBy = { column: 'created_at', ascending: false }) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order(orderBy.column, { ascending: orderBy.ascending });
  if (error) throw error;
  return data || [];
}

export async function insertRow(table, row) {
  if (!supabase) throw new Error('Supabase tidak aktif');
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateRow(table, id, updates) {
  if (!supabase) throw new Error('Supabase tidak aktif');
  const { data, error } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRow(table, id) {
  if (!supabase) throw new Error('Supabase tidak aktif');
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============ REALTIME ============

export function subscribeTo(table, callback, filters = {}) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`realtime:${table}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, ...filters },
      callback
    );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}