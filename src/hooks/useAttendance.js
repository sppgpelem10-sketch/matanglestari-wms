// src/hooks/useAttendance.js
// ============================================
// useAttendance — hook utama absensi
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CURRENT_WORKER,
  OFFICE_LOCATION,
  loadRecords,
  saveRecords,
  createRecord,
  getTodayStatus,
  getMonthlySummary,
  groupByDay,
  getCurrentPosition,
  getMockPosition,
  distanceInMeters,
  getTodayOT,
  getMonthlyOT,
} from '../lib/attendance';

export function useAttendance() {
  const [records, setRecords] = useState(() => loadRecords());
  const [gpsState, setGpsState] = useState({
    loading: false,
    lat: null,
    lng: null,
    distance: null,
    withinRadius: null,
    isMock: false,
    error: null,
  });
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  // ticking clock
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // persist ke localStorage
  useEffect(() => {
    saveRecords(records);
  }, [records]);

  // refreshLocation — return value
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
        error: err?.message || 'GPS tidak tersedia — pakai lokasi default',
      };
      setGpsState(next);
      return next;
    }
  }, []);

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  // ============ ACTIONS ============

  const clockIn = useCallback(async () => {
    if (busy) return { ok: false, reason: 'busy' };
    const today = getTodayStatus(records);
    if (today.isClockedIn) return { ok: false, reason: 'already-in' };
    if (today.isDone) return { ok: false, reason: 'already-done' };

    setBusy(true);
    try {
      const loc = await refreshLocation();
      const location =
        loc.lat !== null ? { lat: loc.lat, lng: loc.lng, isMock: loc.isMock } : null;

      const rec = createRecord({
        type: 'clock-in',
        worker: CURRENT_WORKER,
        location,
      });

      setRecords((prev) => [...prev, rec]);
      setBusy(false);
      return { ok: true, record: rec };
    } catch (err) {
      console.error('clockIn error:', err);
      setBusy(false);
      return { ok: false, reason: 'error' };
    }
  }, [busy, records, refreshLocation]);

  const clockOut = useCallback(async () => {
    if (busy) return { ok: false, reason: 'busy' };
    const today = getTodayStatus(records);
    if (!today.isClockedIn) return { ok: false, reason: 'not-clocked-in' };

    setBusy(true);
    try {
      const loc = await refreshLocation();
      const location =
        loc.lat !== null ? { lat: loc.lat, lng: loc.lng, isMock: loc.isMock } : null;

      const rec = createRecord({
        type: 'clock-out',
        worker: CURRENT_WORKER,
        location,
      });

      setRecords((prev) => [...prev, rec]);
      setBusy(false);
      return { ok: true, record: rec };
    } catch (err) {
      console.error('clockOut error:', err);
      setBusy(false);
      return { ok: false, reason: 'error' };
    }
  }, [busy, records, refreshLocation]);

  const resetToday = useCallback(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    setRecords((prev) => prev.filter((r) => r.timestamp < todayStart.getTime()));
  }, []);

  const resetAll = useCallback(() => {
    if (confirm('Hapus semua data absensi? Tidak bisa dibatalkan.')) {
      setRecords([]);
    }
  }, []);

  // ============ DERIVED ============

  const todayStatus = useMemo(() => getTodayStatus(records), [records]);
  const monthlySummary = useMemo(() => getMonthlySummary(records), [records]);
  const recentDays = useMemo(() => groupByDay(records, 7), [records]);
  const todayOT = useMemo(() => getTodayOT(records), [records]);
  const monthlyOT = useMemo(() => getMonthlyOT(records), [records]);

  return {
    worker: CURRENT_WORKER,
    office: OFFICE_LOCATION,
    records,
    todayStatus,
    monthlySummary,
    recentDays,
    todayOT,
    monthlyOT,
    gps: gpsState,
    now,
    clockIn,
    clockOut,
    refreshLocation,
    resetToday,
    resetAll,
  };
}