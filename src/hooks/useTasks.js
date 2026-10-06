// src/hooks/useTasks.js
// ============================================
// Task Hook — Supabase
// Baca tasks + drivers dari DB
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!isSupabaseEnabled()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Fetch tasks
      const { data: tasksData, error: tErr } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (tErr) throw tErr;

      // 2. Fetch drivers (profiles dengan role worker)
      const { data: driversData, error: dErr } = await supabase
        .from('profiles')
        .select('id, full_name, employee_id, position, division, is_active')
        .eq('role', 'worker')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (dErr) throw dErr;

      const normalizedTasks = (tasksData || []).map((t) => ({
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
        startedAt: t.started_at,
        completedAt: t.completed_at,
        createdAt: t.created_at,
      }));

      setTasks(normalizedTasks);
      setDrivers(driversData || []);
      setError(null);
    } catch (err) {
      console.error('[tasks] fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch + realtime
  useEffect(() => {
    fetchAll();

    if (!isSupabaseEnabled()) return;

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => fetchAll()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  // ============ ACTIONS ============

  const assignTask = async (taskUuid, driverId, driverName) => {
    const { error } = await supabase
      .from('tasks')
      .update({
        assigned_to: driverId,
        assigned_to_name: driverName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskUuid);

    if (error) throw error;
    await fetchAll();
  };

  const unassignTask = async (taskUuid) => {
    const { error } = await supabase
      .from('tasks')
      .update({
        assigned_to: null,
        assigned_to_name: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskUuid);

    if (error) throw error;
    await fetchAll();
  };

  return {
    tasks,
    drivers,
    loading,
    error,
    refetch: fetchAll,
    assignTask,
    unassignTask,
  };
}