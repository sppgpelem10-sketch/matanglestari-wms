// src/hooks/useDrivers.js
// Ambil driver (role=worker) dari profiles

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

export function useDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDrivers = useCallback(async () => {
    if (!isSupabaseEnabled()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, employee_id, position, division, phone, is_active')
        .eq('role', 'worker')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;

      setDrivers(data || []);
      setError(null);
    } catch (err) {
      console.error('[drivers] fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  return { drivers, loading, error, refetch: fetchDrivers };
}