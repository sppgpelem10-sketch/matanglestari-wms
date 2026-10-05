// src/lib/payrollHelpers.js
// ============================================
// Payroll Helper — Supabase
// - Rate harian dari tabel `profiles`
// - Attendance dari tabel `attendance`
// - Approval dari tabel `payroll_approvals`
// ============================================

import { supabase, isSupabaseEnabled } from '../lib/supabase';

// Konfigurasi
export const PAYROLL_CONFIG = {
  workingDaysPerMonth: 22,
  defaultDailyRate: 230000,
};

// ============ HELPER ============

function getMonthRange(monthTs) {
  const ref = new Date(monthTs);
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    monthKey: `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`,
    monthLabel: ref.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
  };
}

// Hitung OT dari clock-out timestamp
function calculateOvertime(clockInTs, clockOutTs) {
  if (!clockInTs || !clockOutTs) {
    return { isOT: false, roundedMinutes: 0, cost: 0 };
  }

  const totalMs = clockOutTs - clockInTs;
  const standardMs = 8 * 60 * 60 * 1000;
  const otMs = Math.max(0, totalMs - standardMs);

  if (otMs <= 0) return { isOT: false, roundedMinutes: 0, cost: 0 };

  const minutes = Math.floor(otMs / 60000);
  if (minutes < 30) return { isOT: false, roundedMinutes: 0, cost: 0 };

  const roundedMinutes = Math.floor(minutes / 15) * 15;
  const cost = Math.round((roundedMinutes / 60) * 50000);
  return { isOT: roundedMinutes > 0, roundedMinutes, cost };
}

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ============ BUILD PAYROLL ============

export async function buildPayroll(monthTs = Date.now()) {
  if (!isSupabaseEnabled()) {
    return emptyPayroll(monthTs);
  }

  const range = getMonthRange(monthTs);

  try {
    // 1. Ambil semua profiles aktif
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name, employee_id, position, division, daily_rate, role, is_active')
      .eq('is_active', true);

    if (pErr) throw pErr;

    // 2. Ambil attendance bulan ini
    const { data: attendance, error: aErr } = await supabase
      .from('attendance')
      .select('worker_id, worker_name, type, timestamp')
      .gte('timestamp', range.start)
      .lte('timestamp', range.end);

    if (aErr) throw aErr;

    // 3. Group attendance per worker per day
    const byWorker = {};
    (attendance || []).forEach((r) => {
      if (!byWorker[r.worker_id]) {
        byWorker[r.worker_id] = { workerId: r.worker_id, workerName: r.worker_name, days: {} };
      }
      const dayKey = startOfDay(new Date(r.timestamp).getTime());
      if (!byWorker[r.worker_id].days[dayKey]) {
        byWorker[r.worker_id].days[dayKey] = { clockIn: null, clockOut: null };
      }
      if (r.type === 'clock-in') byWorker[r.worker_id].days[dayKey].clockIn = r;
      if (r.type === 'clock-out') byWorker[r.worker_id].days[dayKey].clockOut = r;
    });

    // 4. Hitung per worker
    const rows = (profiles || []).map((p) => {
      const w = byWorker[p.id] || { days: {} };

      let daysPresent = 0;
      let daysLate = 0;
      let totalWorkedMs = 0;
      let totalOTMinutes = 0;
      let totalOTCost = 0;

      Object.values(w.days).forEach((d) => {
        if (d.clockIn) {
          daysPresent++;
          // isLate flag: cek dari jam clock-in
          const ts = new Date(d.clockIn.timestamp);
          const lateThreshold = new Date(ts);
          lateThreshold.setHours(8, 15, 0, 0);
          if (ts > lateThreshold) daysLate++;
        }
        if (d.clockIn && d.clockOut) {
  const inTs = new Date(d.clockIn.timestamp).getTime();
  const outTs = new Date(d.clockOut.timestamp).getTime();
  totalWorkedMs += outTs - inTs;
  const ot = calculateOvertime(inTs, outTs);  // ← BARU: kirim 2 parameter
  // ...
}
        }
      });

      const dailyRate = Number(p.daily_rate) || PAYROLL_CONFIG.defaultDailyRate;
      const basePay = dailyRate * daysPresent;
      const otPay = totalOTCost;
      const takeHome = basePay + otPay;
      const daysAbsent = Math.max(0, PAYROLL_CONFIG.workingDaysPerMonth - daysPresent);

      return {
        workerId: p.id,
        workerName: p.full_name,
        workerIdDisplay: p.employee_id,
        workerPosition: p.position,
        workerDivision: p.division,
        daysPresent,
        daysLate,
        daysAbsent,
        workingDays: PAYROLL_CONFIG.workingDaysPerMonth,
        totalWorkedMs,
        otMinutes: totalOTMinutes,
        dailyRate,
        basePay,
        otPay,
        takeHome,
      };
    });

    rows.sort((a, b) => b.takeHome - a.takeHome);

    const totalPayroll = rows.reduce((s, r) => s + r.takeHome, 0);
    const totalOT = rows.reduce((s, r) => s + r.otPay, 0);
    const totalBase = rows.reduce((s, r) => s + r.basePay, 0);

    // 5. Ambil approval status
    const { data: approval } = await supabase
      .from('payroll_approvals')
      .select('*')
      .eq('month_key', range.monthKey)
      .maybeSingle();

    return {
      monthKey: range.monthKey,
      monthLabel: range.monthLabel,
      rows,
      summary: {
        totalEmployees: rows.length,
        totalPayroll,
        totalOT,
        totalBase,
      },
      approvalStatus: approval?.status || 'pending',
      approvalData: approval || null,
    };
  } catch (err) {
    console.error('[payroll] build error:', err);
    return emptyPayroll(monthTs);
  }
}

function emptyPayroll(monthTs) {
  const range = getMonthRange(monthTs);
  return {
    monthKey: range.monthKey,
    monthLabel: range.monthLabel,
    rows: [],
    summary: { totalEmployees: 0, totalPayroll: 0, totalOT: 0, totalBase: 0 },
    approvalStatus: 'pending',
    approvalData: null,
  };
}

// ============ APPROVAL ============

export async function approvePayroll(monthKey, monthLabel, summary, userId) {
  if (!isSupabaseEnabled()) throw new Error('Supabase tidak aktif');

  const { data: existing } = await supabase
    .from('payroll_approvals')
    .select('id')
    .eq('month_key', monthKey)
    .maybeSingle();

  const payload = {
    month_key: monthKey,
    month_label: monthLabel,
    total_employees: summary.totalEmployees,
    total_payroll: summary.totalPayroll,
    total_ot_pay: summary.totalOT,
    status: 'approved',
    approved_by: userId,
    approved_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from('payroll_approvals')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('payroll_approvals').insert(payload);
    if (error) throw error;
  }

  return true;
}

export async function resetPayrollApproval(monthKey) {
  if (!isSupabaseEnabled()) return;
  const { error } = await supabase
    .from('payroll_approvals')
    .delete()
    .eq('month_key', monthKey);
  if (error) throw error;
}

// ============ EXPORT CSV ============

export function exportPayrollCSV(payroll) {
  const headers = [
    'Worker ID', 'Nama', 'Posisi', 'Divisi',
    'Hari Hadir', 'Hari Telat', 'Hari Absen', 'Total Jam Kerja',
    'OT (jam)', 'Rate Harian', 'Gaji Pokok', 'OT Pay', 'Take Home',
  ];

  const lines = payroll.rows.map((r) => [
    r.workerIdDisplay || r.workerId,
    r.workerName,
    r.workerPosition || '-',
    r.workerDivision || '-',
    r.daysPresent,
    r.daysLate,
    r.daysAbsent,
    (r.totalWorkedMs / 3600000).toFixed(1),
    (r.otMinutes / 60).toFixed(1),
    r.dailyRate,
    r.basePay,
    r.otPay,
    r.takeHome,
  ]);

  const csv = [headers, ...lines]
    .map((row) => row.map((v) => `"${v}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `payroll-${payroll.monthKey}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ============ FORMAT ============

export function formatRupiah(amount) {
  if (!amount && amount !== 0) return 'Rp 0';
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

export function formatOTHours(minutes) {
  if (!minutes) return '0j';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
}
