// src/hooks/useAttendanceSupabase.js
// ============================================
// Attendance Hook — Supabase
// Baca/tulis absensi dari tabel `attendance`
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { useAuth } from '../lib/authContext';
import { kirimLaporan, formatAbsenMasuk, formatAbsenPulang } from '../lib/telegram';
import {
  OFFICE_LOCATION,
  getCurrentPosition,
  getMockPosition,
  distanceInMeters,
  isLate as checkIsLate,
  isEarlyOut as checkIsEarlyOut,
} from '../lib/attendance';

export function useAttendanceSupabase() {
  const { profile, user } = useAuth();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [gpsState, setGpsState] = useState({
    loading: false,
    lat: null,
    lng: null,
    distance: null,
    withinRadius: null,
    isMock: false,
    error: null,
  });
  const [now, setNow] = useState(Date.now());

  // Ticking clock
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ============ FETCH ============

  const fetchRecords = useCallback(async () => {
    if (!isSupabaseEnabled() || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('worker_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

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
      console.error('[attendance] fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecords();

    if (!isSupabaseEnabled() || !user) return;

    const channel = supabase
      .channel(`attendance-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `worker_id=eq.${user.id}`,
        },
        () => {
          fetchRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchRecords]);

  // ============ GPS ============

  const refreshLocation = useCallback(async () => {
    setGpsState((s) => ({ ...s, loading: true, error: null }));
    try {
      const pos = await getCurrentPosition();
      const dist = distanceInMeters(
        pos.lat,
        pos.lng,
        OFFICE_LOCATION.lat,
        OFFICE_LOCATION.lng
      );
      const next = {
        loading: false,
        lat: pos.lat,
        lng: pos.lng,
        distance: dist,
        withinRadius: dist <= OFFICE_LOCATION.radiusMeters,
        isMock: false,
        error: null,
      };
      setGpsState(next);
      return next;
    } catch (err) {
      const mock = await getMockPosition();
      const dist = distanceInMeters(
        mock.lat,
        mock.lng,
        OFFICE_LOCATION.lat,
        OFFICE_LOCATION.lng
      );
      const next = {
        loading: false,
        lat: mock.lat,
        lng: mock.lng,
        distance: dist,
        withinRadius: true,
        isMock: true,
        error: err?.message || 'GPS tidak tersedia',
      };
      setGpsState(next);
      return next;
    }
  }, []);

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  // ============ CLOCK IN ============

  const clockIn = useCallback(async () => {
    if (busy) return { ok: false, reason: 'busy' };
    if (!user || !profile) return { ok: false, reason: 'not-authenticated' };

    const today = new Date().toDateString();
    const todayIn = records.find(
      (r) =>
        r.type === 'clock-in' &&
        new Date(r.timestamp).toDateString() === today
    );
    if (todayIn) return { ok: false, reason: 'already-in' };

    setBusy(true);
    try {
      const loc = await refreshLocation();
      const nowTs = Date.now();

      const payload = {
        worker_id: user.id,
        worker_name: profile.full_name,
        type: 'clock-in',
        timestamp: new Date(nowTs).toISOString(),
        location_lat: loc.lat,
        location_lng: loc.lng,
        location_address: loc.lat ? OFFICE_LOCATION.name : null,
        location_distance: loc.distance,
        location_within_radius: loc.withinRadius,
        location_is_mock: loc.isMock,
        device_id: profile.device_id,
        is_late: checkIsLate(nowTs),
        is_early_out: false,
        is_simulated: false,
      };

      const { data, error } = await supabase
        .from('attendance')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // 🔔 Kirim notif Telegram (absen masuk)
      await kirimLaporan(formatAbsenMasuk(data));

      await fetchRecords();
      setBusy(false);
      return { ok: true, record: data };
    } catch (err) {
      console.error('[attendance] clockIn error:', err);
      setBusy(false);
      return { ok: false, reason: 'error', error: err.message };
    }
  }, [busy, user, profile, records, refreshLocation, fetchRecords]);

  // ============ CLOCK OUT ============

  const clockOut = useCallback(async () => {
    if (busy) return { ok: false, reason: 'busy' };
    if (!user || !profile) return { ok: false, reason: 'not-authenticated' };

    const today = new Date().toDateString();
    const todayIn = records.find(
      (r) => r.type === 'clock-in' && new Date(r.timestamp).toDateString() === today
    );
    const todayOut = records.find(
      (r) => r.type === 'clock-out' && new Date(r.timestamp).toDateString() === today
    );
    if (!todayIn) return { ok: false, reason: 'not-clocked-in' };
    if (todayOut) return { ok: false, reason: 'already-done' };

    setBusy(true);
    try {
      const loc = await refreshLocation();
      const nowTs = Date.now();

      const payload = {
        worker_id: user.id,
        worker_name: profile.full_name,
        type: 'clock-out',
        timestamp: new Date(nowTs).toISOString(),
        location_lat: loc.lat,
        location_lng: loc.lng,
        location_address: loc.lat ? OFFICE_LOCATION.name : null,
        location_distance: loc.distance,
        location_within_radius: loc.withinRadius,
        location_is_mock: loc.isMock,
        device_id: profile.device_id,
        is_late: false,
        is_early_out: checkIsEarlyOut(nowTs),
        is_simulated: false,
      };

      const { data, error } = await supabase
        .from('attendance')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // 🔔 Kirim notif Telegram (absen pulang)
      await kirimLaporan(formatAbsenPulang(data));

      await fetchRecords();
      setBusy(false);
      return { ok: true, record: data };
    } catch (err) {
      console.error('[attendance] clockOut error:', err);
      setBusy(false);
      return { ok: false, reason: 'error', error: err.message };
    }
  }, [busy, user, profile, records, refreshLocation, fetchRecords]);

  // ============ DERIVED ============

  const todayStatus = useMemo(() => {
    const today = new Date().toDateString();
    const todayRecords = records.filter(
      (r) => new Date(r.timestamp).toDateString() === today
    );
    const sorted = [...todayRecords].sort((a, b) => a.timestamp - b.timestamp);
    const clockIn = sorted.find((r) => r.type === 'clock-in') || null;
    const clockOut = [...sorted].reverse().find((r) => r.type === 'clock-out') || null;

    const isClockedIn = !!clockIn && !clockOut;
    const isDone = !!clockIn && !!clockOut;

    let workedMs = 0;
    if (clockIn && clockOut) workedMs = clockOut.timestamp - clockIn.timestamp;
    else if (clockIn && isClockedIn) workedMs = Date.now() - clockIn.timestamp;

    return {
      clockIn,
      clockOut,
      isClockedIn,
      isDone,
      workedMs,
      isLateToday: clockIn?.isLate || false,
      isEarlyOutToday: clockOut?.isEarlyOut || false,
    };
  }, [records]);

  const monthlySummary = useMemo(() => {
    const ref = new Date();
    const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1).getTime();
    const monthEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    const monthRecords = records.filter(
      (r) => r.timestamp >= monthStart && r.timestamp <= monthEnd
    );

    const byDay = {};
    monthRecords.forEach((r) => {
      const d = new Date(r.timestamp);
      d.setHours(0, 0, 0, 0);
      const key = d.getTime();
      if (!byDay[key]) byDay[key] = { clockIn: null, clockOut: null };
      if (r.type === 'clock-in') byDay[key].clockIn = r;
      if (r.type === 'clock-out') byDay[key].clockOut = r;
    });

    let totalWorkedMs = 0;
    let daysPresent = 0;
    let daysLate = 0;

    Object.values(byDay).forEach((d) => {
      if (d.clockIn) {
        daysPresent++;
        if (d.clockIn.isLate) daysLate++;
      }
      if (d.clockIn && d.clockOut) {
        totalWorkedMs += d.clockOut.timestamp - d.clockIn.timestamp;
      }
    });

    return {
      monthLabel: ref.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      totalWorkedMs,
      daysPresent,
      daysLate,
      totalRecords: monthRecords.length,
    };
  }, [records]);

  const recentDays = useMemo(() => {
    const byDay = {};
    records.forEach((r) => {
      const d = new Date(r.timestamp);
      d.setHours(0, 0, 0, 0);
      const key = d.getTime();
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(r);
    });

    return Object.entries(byDay)
      .map(([dayTs, items]) => {
        const sorted = [...items].sort((a, b) => a.timestamp - b.timestamp);
        const clockIn = sorted.find((r) => r.type === 'clock-in') || null;
        const clockOut = [...sorted].reverse().find((r) => r.type === 'clock-out') || null;
        let workedMs = 0;
        if (clockIn && clockOut) workedMs = clockOut.timestamp - clockIn.timestamp;
        return { dayTs: Number(dayTs), clockIn, clockOut, workedMs, records: sorted };
      })
      .sort((a, b) => b.dayTs - a.dayTs)
      .slice(0, 7);
  }, [records]);

  const todayOT = useMemo(() => {
    if (!todayStatus.clockOut) return { isOT: false, roundedMinutes: 0, cost: 0 };
    const clockOutTs = todayStatus.clockOut.timestamp;
    const shiftEnd = new Date(clockOutTs);
    shiftEnd.setHours(17, 0, 0, 0);
    const diffMs = clockOutTs - shiftEnd.getTime();
    if (diffMs <= 0) return { isOT: false, roundedMinutes: 0, cost: 0 };
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 30) return { isOT: false, roundedMinutes: 0, cost: 0 };
    const roundedMinutes = Math.floor(minutes / 15) * 15;
    const cost = Math.round((roundedMinutes / 60) * 50000);
    return { isOT: roundedMinutes > 0, roundedMinutes, cost };
  }, [todayStatus]);

  // ============ RESET (debug) ============

  const resetToday = useCallback(async () => {
    if (!user) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    await supabase
      .from('attendance')
      .delete()
      .eq('worker_id', user.id)
      .gte('timestamp', todayStart.toISOString());
    await fetchRecords();
  }, [user, fetchRecords]);

  const resetAll = useCallback(async () => {
    if (!user) return;
    if (!confirm('Hapus semua data absensi kamu?')) return;
    await supabase
      .from('attendance')
      .delete()
      .eq('worker_id', user.id);
    await fetchRecords();
  }, [user, fetchRecords]);

  return {
    worker: profile
      ? {
          id: profile.id,
          name: profile.full_name,
          initials: profile.full_name
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
          phone: profile.phone,
          deviceId: profile.device_id,
          division: profile.division,
          joinedAt: profile.joined_at,
        }
      : null,
    office: OFFICE_LOCATION,
    records,
    todayStatus,
    monthlySummary,
    recentDays,
    todayOT,
    gps: gpsState,
    now,
    loading,
    error,
    clockIn,
    clockOut,
    refreshLocation,
    resetToday,
    resetAll,
    refetch: fetchRecords,
  };
}