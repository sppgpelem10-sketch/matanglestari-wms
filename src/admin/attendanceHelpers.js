// src/admin/attendanceHelpers.js
// ============================================
// Helper untuk Admin — compute dari records (dari Supabase)
// ============================================

import {
  isSameDay,
  startOfDay,
  calculateOvertime,
  formatTime,
  formatDuration,
} from '../lib/attendance';

// Group records per hari per worker → Attendance Log rows
export function buildAttendanceLog(records) {
  const buckets = {};
  records.forEach((r) => {
    const day = startOfDay(r.timestamp);
    const key = `${r.workerId}__${day}`;
    if (!buckets[key]) {
      buckets[key] = {
        workerId: r.workerId,
        workerName: r.workerName,
        dayTs: day,
        clockIn: null,
        clockOut: null,
      };
    }
    if (r.type === 'clock-in') buckets[key].clockIn = r;
    if (r.type === 'clock-out') buckets[key].clockOut = r;
  });

  return Object.values(buckets)
    .map((b) => {
      const workedMs =
        b.clockIn && b.clockOut
          ? b.clockOut.timestamp - b.clockIn.timestamp
          : 0;
      const ot = b.clockOut ? calculateOvertime(b.clockOut.timestamp) : null;
      return {
        ...b,
        workedMs,
        ot,
        isLate: b.clockIn?.isLate || false,
        isEarlyOut: b.clockOut?.isEarlyOut || false,
        status: !b.clockIn
          ? 'Absen'
          : !b.clockOut
          ? 'Belum Clock Out'
          : ot?.isOT
          ? 'OT'
          : 'Normal',
      };
    })
    .sort((a, b) => b.dayTs - a.dayTs);
}

// Build OT Approvals — grup by (worker, day) dengan OT > 0
// Approval status dari tabel ot_approvals di Supabase
export function buildOTApprovals(records, approvalMap = {}) {
  const log = buildAttendanceLog(records);
  return log
    .filter((row) => row.ot && row.ot.isOT && row.clockOut)
    .map((row) => {
      const approvalKey = `${row.workerId}__${row.dayTs}`;
      const approvalStatus = approvalMap[approvalKey] || 'pending';
      return {
        id: `OT-${row.workerId}-${row.dayTs}`,
        date: new Date(row.dayTs).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        workerName: row.workerName,
        workerId: row.workerId,
        clockOut: formatTime(row.clockOut.timestamp),
        clockOutTs: row.clockOut.timestamp,
        otDuration: row.ot.roundedMinutes,
        estimatedCost: row.ot.cost,
        gps: row.clockOut.location?.address || 'Tidak tersedia',
        gpsDistance: row.clockOut.location?.distance,
        lastTask: '—',
        status: approvalStatus,
        approvalKey,
      };
    })
    .sort((a, b) => b.clockOutTs - a.clockOutTs);
}

// Format rupiah
export function formatRupiah(amount) {
  if (!amount) return 'Rp 0';
  return 'Rp ' + amount.toLocaleString('id-ID');
}

// Export ulang
export {
  formatTime,
  formatDuration,
  isSameDay,
  startOfDay,
};