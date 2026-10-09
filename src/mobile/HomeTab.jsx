// src/mobile/HomeTab.jsx
import React, { useState, useEffect } from 'react';
import {
  MapPin, CheckCircle2, Clock, Fingerprint, ShieldCheck,
  PackageCheck, Calendar, AlertTriangle, RefreshCw, History,
  ChevronRight, Timer, X,
} from 'lucide-react';
import { cn, Badge, Button } from '../components/shared';
import { useAttendanceSupabase as useAttendance } from '../hooks/useAttendanceSupabase';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import {
  formatTime, formatTimeFull, formatDuration, formatDurationLong,
  getShiftStart, getShiftEnd, SHIFT_CONFIG,
} from '../lib/attendance';

export default function HomeTab() {
  const {
    worker, office, records, todayStatus, recentDays,
    gps, now, clockIn, clockOut, refreshLocation, resetToday, resetAll,
  } = useAttendance();

  const [toast, setToast] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // ============ STATS PENGIRIMAN (REAL) ============
  const [shipStats, setShipStats] = useState({ done: 0, total: 0, loading: true });

  useEffect(() => {
    let cancelled = false;

    async function fetchShipStats() {
      if (!isSupabaseEnabled() || !worker?.id) {
        if (!cancelled) setShipStats({ done: 0, total: 0, loading: false });
        return;
      }

      try {
        const today = new Date().toISOString().slice(0, 10);

        // Ambil outbound hari ini yang terkait driver/worker ini
        // Prioritas: driver_id → staff_id → semua outbound hari ini
        const { data, error } = await supabase
          .from('outbound')
          .select('id, status, driver_id, staff_id, date')
          .eq('date', today);

        if (error) throw error;

        const rows = data || [];

        // Kalau ada driver_id/staff_id yang match worker, filter.
        // Kalau tidak ada match sama sekali, tampilkan semua outbound hari ini
        // (biar admin/owner tetap lihat angka yang masuk akal).
        const mine = rows.filter(
          (o) => o.driver_id === worker.id || o.staff_id === worker.id
        );
        const scope = mine.length > 0 ? mine : rows;

        const done = scope.filter(
          (o) => String(o.status || '').toLowerCase() === 'shipped'
        ).length;

        if (!cancelled) {
          setShipStats({ done, total: scope.length, loading: false });
        }
      } catch (err) {
        console.error('[HomeTab] fetch ship stats error:', err);
        if (!cancelled) setShipStats({ done: 0, total: 0, loading: false });
      }
    }

    fetchShipStats();

    // Realtime — update kalau ada perubahan di outbound hari ini
    if (!isSupabaseEnabled()) return;

    const channel = supabase
      .channel(`home-outbound-${worker?.id || 'anon'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'outbound' },
        () => { fetchShipStats(); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [worker?.id]);

  const today = new Date(now);
  const tanggal = today.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const hour = today.getHours();
  const greeting = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';
  const firstName = worker.name.split(' ')[0];

  const withinRadius = gps.withinRadius !== false;
  const canClock = !gps.loading;

  const shiftStart = getShiftStart(now);
  const shiftEnd = getShiftEnd(now);
  const progressPct = Math.min(100, Math.max(0, ((now - shiftStart) / (shiftEnd - shiftStart)) * 100));

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleClock = async () => {
    if (!canClock) {
      showToast('error', 'Sedang mendeteksi lokasi, tunggu sebentar');
      return;
    }

    const action = todayStatus.isClockedIn ? clockOut : clockIn;
    const result = await action();

    if (!result.ok) {
      const reasons = {
        'busy': 'Sedang memproses, tunggu sebentar',
        'already-in': 'Kamu sudah clock in hari ini',
        'already-done': 'Kamu sudah clock out hari ini',
        'not-clocked-in': 'Belum clock in',
      };
      showToast('error', reasons[result.reason] || 'Gagal memproses');
      return;
    }

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1500);
    showToast('success', todayStatus.isClockedIn ? 'Clock out berhasil!' : 'Clock in berhasil!');
  };

  const simulateLateClockOut = () => {
    const clockInRec = records.find(
      (r) => r.type === 'clock-in' && new Date(r.timestamp).toDateString() === today.toDateString()
    );
    if (!clockInRec) {
      showToast('error', 'Clock in dulu sebelum simulasi');
      return;
    }

    const fakeClockOutTs = new Date(now);
    fakeClockOutTs.setHours(20, 45, 0, 0);

    const fakeRec = {
      id: `ATT-SIM-${Date.now()}`,
      workerId: worker.id,
      workerName: worker.name,
      type: 'clock-out',
      timestamp: fakeClockOutTs.getTime(),
      location: { lat: office.lat, lng: office.lng, address: office.name, distance: 12, withinRadius: true, isMock: true },
      deviceId: worker.deviceId,
      isLate: false,
      isEarlyOut: false,
      isSimulated: true,
    };

    const existing = [...records, fakeRec];
    localStorage.setItem('gudangku_attendance_v1', JSON.stringify(existing));
    window.location.reload();
  };

  const btnLabel = todayStatus.isDone
    ? 'SELESAI'
    : todayStatus.isClockedIn
      ? 'CLOCK OUT'
      : 'CLOCK IN';

  const btnDisabled = !canClock || todayStatus.isDone;

  return (
    <div className="p-5 space-y-5">
      {/* HEADER */}
      <div className="flex items-start justify-between pt-2">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{tanggal}</p>
          <h1 className="text-xl font-bold text-slate-900 mt-1">{greeting}, {firstName}</h1>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[10px] font-semibold text-emerald-700">Device Verified</span>
        </div>
      </div>

      {/* GPS INFO */}
      {gps.error && gps.isMock && (
        <div className="flex items-start gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
          <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Lokasi default kantor digunakan
          </p>
        </div>
      )}

      {/* CARD CLOCK */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="text-center mb-6">
          <p className="text-4xl font-bold text-slate-900 tabular-nums tracking-tight">
            {formatTimeFull(now)}
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {todayStatus.isDone
              ? 'Shift selesai hari ini'
              : todayStatus.isClockedIn
                ? `Shift aktif sejak ${formatTime(todayStatus.clockIn.timestamp)}`
                : 'Belum clock in hari ini'}
          </p>
        </div>

        <button
          onClick={handleClock}
          disabled={btnDisabled}
          className={cn(
            'w-full aspect-square max-w-[220px] mx-auto rounded-full flex flex-col items-center justify-center gap-2 transition-all',
            'focus:outline-none focus:ring-4',
            !btnDisabled
              ? todayStatus.isClockedIn
                ? 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-300 active:scale-95'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-200 active:scale-95 shadow-lg shadow-indigo-600/20'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed',
            showSuccess && 'ring-4 ring-emerald-300'
          )}
        >
          {showSuccess ? (
            <>
              <CheckCircle2 className="w-16 h-16 animate-bounce" />
              <span className="text-sm font-semibold">Berhasil!</span>
            </>
          ) : (
            <>
              {todayStatus.isClockedIn ? (
                <Clock className="w-12 h-12 opacity-90" />
              ) : (
                <Fingerprint className="w-12 h-12 opacity-90" />
              )}
              <span className="text-lg font-bold tracking-wide">{btnLabel}</span>
              <span className="text-[10px] opacity-75 font-medium">
                {todayStatus.isDone
                  ? 'Shift sudah selesai'
                  : todayStatus.isClockedIn
                    ? 'Tekan untuk selesai'
                    : 'Tekan untuk mulai'}
              </span>
            </>
          )}
        </button>

        <div className="mt-6 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MapPin className="w-4 h-4 flex-shrink-0 text-slate-500" />
            <span className="text-xs font-medium text-slate-600 truncate">
              {gps.loading
                ? 'Mendeteksi lokasi...'
                : gps.distance !== null
                  ? `Lokasi: ${office.name}`
                  : 'Lokasi tidak diketahui'}
            </span>
          </div>
          <button
            onClick={refreshLocation}
            disabled={gps.loading}
            className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center flex-shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 text-slate-500', gps.loading && 'animate-spin')} />
          </button>
        </div>

        {todayStatus.isEarlyOutToday && (
          <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Clock out lebih awal dari jam {SHIFT_CONFIG.endHour}:00
            </p>
          </div>
        )}
      </div>

      {/* PROGRESS SHIFT */}
      {todayStatus.isClockedIn && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-semibold text-slate-700">Jam kerja berjalan</span>
            </div>
            <span className="text-sm font-bold text-indigo-600 tabular-nums font-mono">
              {formatDurationLong(todayStatus.workedMs)}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-1000',
                progressPct > 100 ? 'bg-amber-500' : 'bg-indigo-500'
              )}
              style={{ width: `${Math.min(100, progressPct)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-slate-500 font-medium">
            <span>Shift: {SHIFT_CONFIG.startHour}:00</span>
            <span>{Math.round(progressPct)}%</span>
            <span>{SHIFT_CONFIG.endHour}:00</span>
          </div>
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center mb-2">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Jam Kerja</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
            {formatDuration(todayStatus.workedMs)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {todayStatus.isLateToday ? (
              <span className="text-amber-600 font-medium">Telat hari ini</span>
            ) : todayStatus.clockIn ? (
              <span className="text-emerald-600 font-medium">Tepat waktu</span>
            ) : 'Belum mulai'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center mb-2">
            <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Pengiriman</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
            {shipStats.loading ? '—' : `${shipStats.done}/${shipStats.total}`}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {shipStats.loading
              ? 'Memuat...'
              : shipStats.total === 0
                ? 'Belum ada jadwal'
                : 'Selesai hari ini'}
          </p>
        </div>
      </div>

      {/* RIWAYAT */}
      <div className="space-y-2">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
              <History className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900">Riwayat Absensi</p>
              <p className="text-[11px] text-slate-500">7 hari terakhir</p>
            </div>
          </div>
          <ChevronRight className={cn('w-4 h-4 text-slate-400 transition-transform', showHistory && 'rotate-90')} />
        </button>

        {showHistory && (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {recentDays.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-slate-500">Belum ada riwayat absensi</p>
              </div>
            ) : (
              recentDays.map((day) => {
                const isToday = new Date(day.dayTs).toDateString() === today.toDateString();
                const inTime = day.clockIn ? formatTime(day.clockIn.timestamp) : '--:--';
                const outTime = day.clockOut ? formatTime(day.clockOut.timestamp) : '--:--';
                const late = day.clockIn?.isLate;
                return (
                  <div key={day.dayTs} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-900">
                          {isToday ? 'Hari ini' : new Date(day.dayTs).toLocaleDateString('id-ID', {
                            weekday: 'short', day: 'numeric', month: 'short',
                          })}
                        </span>
                        {late && <Badge variant="warning">Telat</Badge>}
                      </div>
                      <span className="text-xs font-bold text-slate-700 tabular-nums">
                        {formatDuration(day.workedMs)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 ml-5">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        In: <span className="font-semibold text-slate-700 tabular-nums">{inTime}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Out: <span className="font-semibold text-slate-700 tabular-nums">{outTime}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* DEBUG */}
      {import.meta.env.DEV && (
        <div className="pt-2 space-y-2">
          {todayStatus.isClockedIn && (
            <button
              onClick={simulateLateClockOut}
              className="w-full text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-lg font-medium transition-colors"
            >
              🧪 Simulasi Clock Out Jam 20:45 (test OT)
            </button>
          )}
          {records.length > 0 && (
            <div className="flex justify-center gap-2">
              <button onClick={resetToday} className="text-[10px] text-slate-400 hover:text-slate-600 underline">
                Reset hari ini
              </button>
              <span className="text-[10px] text-slate-300">·</span>
              <button onClick={resetAll} className="text-[10px] text-red-400 hover:text-red-600 underline">
                Reset semua data
              </button>
            </div>
          )}
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 w-[340px]">
          <div className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border',
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-red-600 text-white border-red-700'
          )}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="text-xs font-medium flex-1">{toast.msg}</span>
            <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}