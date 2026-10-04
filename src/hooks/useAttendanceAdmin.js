// src/hooks/useAttendanceAdmin.js
// ============================================
// Attendance Hook — Admin View
// Baca SEMUA attendance dari Supabase (bukan filter per user)
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

export function useAttendanceAdmin() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecords = useCallback(async () => {
    if (!isSupabaseEnabled()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Normalize ke format UI
      const normalized = (data || []).map((row) => ({
        id: row.id,
        workerId: row.worker_id,
        workerName: row.worker_name,
        type: row.type,
        timestamp: new Date(row.timestamp).getTime(),
        location: row.location_lat
          ? {
              lat: row.location_lat,
              lng: row.location_lng,
              address: row.location_address,
              distance: row.location_distance,
              withinRadius: row.location_within_radius,
              isMock: row.location_is_mock,
            }
          : null,
        deviceId: row.device_id,
        isLate: row.is_late,
        isEarlyOut: row.is_early_out,
        isSimulated: row.is_simulated,
      }));

      setRecords(normalized);
      setError(null);
    } catch (err) {
      console.error('[attendance-admin] fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();

    if (!isSupabaseEnabled()) return;

    // Realtime — semua perubahan
    const channel = supabase
      .channel('attendance-admin-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        () => {
          fetchRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecords]);

  return {
    records,
    loading,
    error,
    refetch: fetchRecords,
  };
}