// src/lib/attendance.js
// ============================================
// ATTENDANCE CORE — config, kalkulasi, storage
// ============================================

export const SHIFT_CONFIG = {
  startHour: 8,
  startMinute: 0,
  endHour: 17,
  endMinute: 0,
  lateThresholdMin: 15,
};

export const OFFICE_LOCATION = {
  lat: -6.2088,
  lng: 106.8456,
  name: 'Office HQ',
  radiusMeters: 100,
};

export const CURRENT_WORKER = {
  id: 'EMP-2023-0147',
  name: 'Budi Santoso',
  initials: 'BS',
  phone: '0812-3456-7890',
  deviceId: 'DV-8821-XK',
  division: 'Field Delivery',
  joinedAt: '12 Mar 2023',
};

export const OT_CONFIG = {
  ratePerHour: 50000,
  minMinutesToCount: 30,
  roundToMinutes: 15,
};

const STORAGE_KEY = 'gudangku_attendance_v1';

// ============ STORAGE ============

export function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed saving attendance:', e);
  }
}

export function clearRecords() {
  localStorage.removeItem(STORAGE_KEY);
}

// ============ HELPERS ============

export function isSameDay(ts, ref = Date.now()) {
  const a = new Date(ts);
  const b = new Date(ref);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfDay(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function formatTime(ts) {
  if (!ts) return '--:--';
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeFull(ts) {
  if (!ts) return '--:--:--';
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDate(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateShort(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDuration(ms) {
  if (!ms || ms < 0) return '0j 0m';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}j ${m}m`;
}

export function formatDurationLong(ms) {
  if (!ms || ms < 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============ SHIFT LOGIC ============

export function getShiftStart(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(SHIFT_CONFIG.startHour, SHIFT_CONFIG.startMinute, 0, 0);
  return d.getTime();
}

export function getShiftEnd(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(SHIFT_CONFIG.endHour, SHIFT_CONFIG.endMinute, 0, 0);
  return d.getTime();
}

export function isLate(ts) {
  const shiftStart = getShiftStart(ts);
  const threshold = shiftStart + SHIFT_CONFIG.lateThresholdMin * 60 * 1000;
  return ts > threshold;
}

export function isEarlyOut(ts) {
  return ts < getShiftEnd(ts);
}

// ============ GEO ============

export function distanceInMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation tidak didukung browser ini'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });
}

export function getMockPosition() {
  return Promise.resolve({
    lat: OFFICE_LOCATION.lat,
    lng: OFFICE_LOCATION.lng,
    isMock: true,
  });
}

// ============ RECORD FACTORY ============

export function createRecord({ type, worker, location }) {
  const ts = Date.now();
  const distance = location
    ? distanceInMeters(location.lat, location.lng, OFFICE_LOCATION.lat, OFFICE_LOCATION.lng)
    : null;

  return {
    id: `ATT-${ts}-${Math.random().toString(36).slice(2, 7)}`,
    workerId: worker.id,
    workerName: worker.name,
    type,
    timestamp: ts,
    location: location
      ? {
          lat: location.lat,
          lng: location.lng,
          address: OFFICE_LOCATION.name,
          distance,
          withinRadius: distance !== null && distance <= OFFICE_LOCATION.radiusMeters,
          isMock: !!location.isMock,
        }
      : null,
    deviceId: worker.deviceId,
    isLate: type === 'clock-in' ? isLate(ts) : false,
    isEarlyOut: type === 'clock-out' ? isEarlyOut(ts) : false,
  };
}

// ============ TODAY SUMMARY ============

export function getTodayStatus(records) {
  const today = records
    .filter((r) => isSameDay(r.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  const clockIn = today.find((r) => r.type === 'clock-in') || null;
  const clockOut = [...today].reverse().find((r) => r.type === 'clock-out') || null;

  const isClockedIn = !!clockIn && !clockOut;
  const isDone = !!clockIn && !!clockOut;

  let workedMs = 0;
  if (clockIn && clockOut) {
    workedMs = clockOut.timestamp - clockIn.timestamp;
  } else if (clockIn && isClockedIn) {
    workedMs = Date.now() - clockIn.timestamp;
  }

  return {
    clockIn,
    clockOut,
    isClockedIn,
    isDone,
    workedMs,
    isLateToday: clockIn?.isLate || false,
    isEarlyOutToday: clockOut?.isEarlyOut || false,
  };
}

// ============ MONTHLY SUMMARY ============

export function getMonthlySummary(records, refTs = Date.now()) {
  const ref = new Date(refTs);
  const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1).getTime();
  const monthEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

  const monthRecords = records.filter(
    (r) => r.timestamp >= monthStart && r.timestamp <= monthEnd
  );

  const byDay = {};
  monthRecords.forEach((r) => {
    const key = startOfDay(r.timestamp);
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
}

// ============ HISTORY GROUPING ============

export function groupByDay(records, limitDays = 7) {
  const byDay = {};
  records.forEach((r) => {
    const key = startOfDay(r.timestamp);
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

      return {
        dayTs: Number(dayTs),
        clockIn,
        clockOut,
        workedMs,
        records: sorted,
      };
    })
    .sort((a, b) => b.dayTs - a.dayTs)
    .slice(0, limitDays);
}

// ============ OVERTIME ============

export function calculateOvertime(clockOutTs) {
  if (!clockOutTs) {
    return { ms: 0, minutes: 0, roundedMinutes: 0, cost: 0, isOT: false };
  }

  const shiftEnd = getShiftEnd(clockOutTs);
  const diffMs = clockOutTs - shiftEnd;

  if (diffMs <= 0) {
    return { ms: 0, minutes: 0, roundedMinutes: 0, cost: 0, isOT: false };
  }

  const minutes = Math.floor(diffMs / 60000);

  if (minutes < OT_CONFIG.minMinutesToCount) {
    return { ms: diffMs, minutes, roundedMinutes: 0, cost: 0, isOT: false };
  }

  const roundedMinutes = Math.floor(minutes / OT_CONFIG.roundToMinutes) * OT_CONFIG.roundToMinutes;
  const cost = Math.round((roundedMinutes / 60) * OT_CONFIG.ratePerHour);

  return {
    ms: diffMs,
    minutes,
    roundedMinutes,
    cost,
    isOT: roundedMinutes > 0,
  };
}

export function getTodayOT(records) {
  const today = records.filter((r) => isSameDay(r.timestamp));
  const clockOut = [...today].reverse().find((r) => r.type === 'clock-out');
  if (!clockOut) {
    return { ms: 0, minutes: 0, roundedMinutes: 0, cost: 0, isOT: false };
  }
  return calculateOvertime(clockOut.timestamp);
}

export function getMonthlyOT(records, refTs = Date.now()) {
  const ref = new Date(refTs);
  const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1).getTime();
  const monthEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

  const monthRecords = records.filter(
    (r) => r.timestamp >= monthStart && r.timestamp <= monthEnd
  );

  const byDay = {};
  monthRecords.forEach((r) => {
    const key = startOfDay(r.timestamp);
    if (!byDay[key]) byDay[key] = { clockIn: null, clockOut: null };
    if (r.type === 'clock-in') byDay[key].clockIn = r;
    if (r.type === 'clock-out') byDay[key].clockOut = r;
  });

  let totalRoundedMinutes = 0;
  let totalCost = 0;
  let daysWithOT = 0;

  Object.values(byDay).forEach((d) => {
    if (d.clockOut) {
      const ot = calculateOvertime(d.clockOut.timestamp);
      if (ot.isOT) {
        totalRoundedMinutes += ot.roundedMinutes;
        totalCost += ot.cost;
        daysWithOT++;
      }
    }
  });

  return {
    roundedMinutes: totalRoundedMinutes,
    totalMs: totalRoundedMinutes * 60 * 1000,
    cost: totalCost,
    daysWithOT,
  };
}

export function formatOT(minutes) {
  if (!minutes || minutes <= 0) return '0j 0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}j ${m}m`;
}

export function formatRupiah(amount) {
  if (!amount) return 'Rp 0';
  return 'Rp ' + amount.toLocaleString('id-ID');
}