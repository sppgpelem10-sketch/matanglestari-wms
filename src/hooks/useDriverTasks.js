// src/hooks/useDriverTasks.js
// ============================================
// Task untuk driver yang login (dari tabel tasks)
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { useAuth } from '../lib/authContext';

const TASKS_STORAGE_KEY = 'matanglestari_driver_tasks_v1';

export function useDriverTasks() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTasks = useCallback(async () => {
    if (!isSupabaseEnabled() || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Normalize
      const normalized = (data || []).map((t) => ({
        id: t.code,
        uuid: t.id,
        soId: t.so_id,
        customer: t.customer,
        address: t.address,
        phone: t.phone,
        items: t.items,
        status: t.status,
        assignedTo: t.assigned_to,
        assignedToName: t.assigned_to_name,
        startedAt: t.started_at ? new Date(t.started_at).getTime() : null,
        completedAt: t.completed_at ? new Date(t.completed_at).getTime() : null,
        podSignature: t.pod_signature,
        podPhoto: t.pod_photo,
        podNotes: t.pod_notes,
      }));

      // Merge dengan data lokal (startedAt untuk hitung timer)
      let localMap = {};
      try {
        const raw = localStorage.getItem(TASKS_STORAGE_KEY);
        if (raw) localMap = JSON.parse(raw);
      } catch {}

      const merged = normalized.map((t) => {
        const local = localMap[t.id] || {};
        return {
          ...t,
          // local.startedAt override dari DB kalau ada
          startedAt: t.startedAt || local.startedAt || null,
          status: local.status || t.status, // local override (buat optimistic update)
        };
      });

      setTasks(merged);
      setError(null);
    } catch (err) {
      console.error('[driver-tasks] fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch + realtime
  useEffect(() => {
    fetchTasks();

    if (!isSupabaseEnabled() || !user) return;

    const channel = supabase
      .channel(`driver-tasks-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `assigned_to=eq.${user.id}`,
        },
        () => fetchTasks()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchTasks]);

  // ============ ACTIONS ============

  // Mulai pengiriman → update status jadi "In Progress" + started_at
  const startTask = async (taskUuid) => {
    const now = new Date().toISOString();

    // Optimistic update lokal
    setTasks((prev) =>
      prev.map((t) =>
        t.uuid === taskUuid
          ? { ...t, status: 'In Progress', startedAt: Date.now() }
          : t
      )
    );

    // Update DB
    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'In Progress',
        started_at: now,
        updated_at: now,
      })
      .eq('id', taskUuid);

    if (error) {
      console.error('[driver-tasks] start error:', error);
      await fetchTasks(); // rollback
      throw error;
    }

    // Save local timer
    try {
      const raw = localStorage.getItem(TASKS_STORAGE_KEY);
      const map = raw ? JSON.parse(raw) : {};
      const t = tasks.find((x) => x.uuid === taskUuid);
      if (t) map[t.id] = { startedAt: Date.now(), status: 'In Progress' };
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(map));
    } catch {}
  };

  // Selesaikan → update status "Completed" + pod_signature + pod_photo
  const completeTask = async (taskUuid, podData) => {
    const now = new Date().toISOString();

    // Optimistic
    setTasks((prev) =>
      prev.map((t) =>
        t.uuid === taskUuid
          ? { ...t, status: 'Completed', completedAt: Date.now() }
          : t
      )
    );

    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'Completed',
        completed_at: now,
        pod_signature: podData.signature || null,
        pod_photo: podData.photo || null,
        pod_notes: podData.notes || null,
        updated_at: now,
      })
      .eq('id', taskUuid);

    if (error) {
      console.error('[driver-tasks] complete error:', error);
      await fetchTasks();
      throw error;
    }

    // Clear local timer
    try {
      const raw = localStorage.getItem(TASKS_STORAGE_KEY);
      const map = raw ? JSON.parse(raw) : {};
      const t = tasks.find((x) => x.uuid === taskUuid);
      if (t) {
        map[t.id] = { status: 'Completed', completedAt: Date.now() };
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(map));
      }
    } catch {}
  };

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    startTask,
    completeTask,
  };
}