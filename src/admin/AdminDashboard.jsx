// src/admin/AdminDashboard.jsx
import React, { useState, useEffect, useMemo, Fragment } from 'react';
import {
  LayoutDashboard, Clock, DollarSign, Activity, Users,
  TrendingUp, ArrowUpRight, ArrowDownRight, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, MapPinned, PackageCheck,
  AlertTriangle, FileText, Timer, TrendingDown, Download, Check,
  Boxes, Inbox, UserCog, Wallet, Printer, Send,
} from 'lucide-react';
import {
  cn, Badge, Button, LiveDot, Sidebar, TopBar, Modal,
} from '../components/shared';
import {
  buildAttendanceLog, buildOTApprovals,
  formatRupiah, formatDuration, formatTime,
} from './attendanceHelpers';
import {
  buildPayroll, approvePayroll, resetPayrollApproval, exportPayrollCSV,
  formatOTHours, PAYROLL_CONFIG,
} from './payrollHelpers';
import { useAuth } from '../lib/authContext';
import { INVENTORY, ACTIVITY_FEED } from '../lib/mockData';
import EmployeeManagement from './views/EmployeeManagement';
import FinanceView from './views/FinanceView';
import PayslipPage from './views/PayslipTemplate';
import { printDocument } from '../components/DocumentTemplate';
import LogisticsReview from './views/LogisticsReview';
import { useAttendanceAdmin } from '../hooks/useAttendanceAdmin';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

// ============ OVERVIEW ============

function Overview() {
  const { records } = useAttendanceAdmin();
  const log = useMemo(() => buildAttendanceLog(records), [records]);

  const todayLog = log.filter(
    (l) => new Date(l.dayTs).toDateString() === new Date().toDateString()
  );
  const presentToday = todayLog.filter((l) => l.clockIn).length;

  const cards = [
    { label: 'Total Records', value: log.length, icon: Clock },
    { label: 'Karyawan Hadir Hari Ini', value: presentToday, icon: Users },
    { label: 'Pending OT Approval', value: 0, icon: TrendingUp },
    { label: 'Total OT Records', value: 0, icon: Timer },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-slate-50">
                <Icon className="w-4 h-4 text-slate-600" />
              </div>
              <p className="text-xs text-slate-500 font-medium">{c.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Absensi Terbaru</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {log.slice(0, 5).map((row, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                row.status === 'OT' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
              )}>
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{row.workerName}</p>
                <p className="text-xs text-slate-500">
                  {new Date(row.dayTs).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                  {row.clockIn && ` · In ${formatTime(row.clockIn.timestamp)}`}
                  {row.clockOut && ` · Out ${formatTime(row.clockOut.timestamp)}`}
                </p>
              </div>
              <Badge variant={
                row.status === 'OT' ? 'warning' :
                row.status === 'Normal' ? 'success' : 'neutral'
              }>
                {row.status}
              </Badge>
            </div>
          ))}
          {log.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              Belum ada data absensi. Coba clock in dari aplikasi mobile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ ATTENDANCE & OT ============

function AttendanceAndOT() {
  const [tab, setTab] = useState('attendance');
  const { records, loading: attLoading } = useAttendanceAdmin();
  const [expanded, setExpanded] = useState(null);
  const [approvalMap, setApprovalMap] = useState({});

  const log = useMemo(() => buildAttendanceLog(records), [records]);
  const approvals = useMemo(
    () => buildOTApprovals(records, approvalMap),
    [records, approvalMap]
  );
  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  const handleApprove = (approvalKey) => {
    setApprovalMap((prev) => ({ ...prev, [approvalKey]: 'approved' }));
  };

  const handleReject = (approvalKey) => {
    setApprovalMap((prev) => ({ ...prev, [approvalKey]: 'rejected' }));
  };

  if (attLoading && records.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memuat data absensi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          <button
            onClick={() => setTab('attendance')}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2',
              tab === 'attendance'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            Attendance Log
            <Badge variant="neutral">{log.length}</Badge>
          </button>
          <button
            onClick={() => setTab('ot')}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2',
              tab === 'ot'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            Pending OT Approvals
            {pendingCount > 0 && <Badge variant="danger">{pendingCount}</Badge>}
          </button>
        </div>
      </div>

      {tab === 'attendance' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Tanggal</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Karyawan</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Clock In</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Clock Out</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Total Jam</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">OT</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {log.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-xs">
                    Belum ada data absensi.
                  </td>
                </tr>
              )}
              {log.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-600">
                    {new Date(row.dayTs).toLocaleDateString('id-ID', {
                      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-900">{row.workerName}</td>
                  <td className="px-5 py-3 tabular-nums text-slate-700">
                    {row.clockIn ? formatTime(row.clockIn.timestamp) : '--:--'}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-slate-700">
                    {row.clockOut ? formatTime(row.clockOut.timestamp) : '--:--'}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900">
                    {formatDuration(row.workedMs)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold text-amber-700">
                    {row.ot?.isOT ? `${row.ot.roundedMinutes}m` : '-'}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={
                      row.status === 'OT' ? 'warning' :
                      row.status === 'Normal' ? 'success' :
                      row.status === 'Belum Clock Out' ? 'info' :
                      'danger'
                    }>
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'ot' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase w-8"></th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Tanggal</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Karyawan</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Clock Out</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Durasi OT</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Estimasi Biaya</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {approvals.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500 text-xs">
                    Tidak ada OT untuk di-approve.
                  </td>
                </tr>
              )}
              {approvals.map((ot) => (
                <Fragment key={ot.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setExpanded(expanded === ot.id ? null : ot.id)}
                        className="w-6 h-6 rounded hover:bg-slate-100 inline-flex items-center justify-center"
                      >
                        {expanded === ot.id
                          ? <ChevronUp className="w-4 h-4 text-slate-500" />
                          : <ChevronDown className="w-4 h-4 text-slate-500" />}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{ot.date}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{ot.workerName}</td>
                    <td className="px-5 py-3 tabular-nums text-slate-700">{ot.clockOut}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-amber-700">
                      {Math.floor(ot.otDuration / 60)}j {ot.otDuration % 60}m
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900">
                      {formatRupiah(ot.estimatedCost)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={
                        ot.status === 'approved' ? 'success' :
                        ot.status === 'rejected' ? 'danger' : 'warning'
                      }>
                        {ot.status === 'approved' ? 'Disetujui' :
                         ot.status === 'rejected' ? 'Ditolak' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      {ot.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="success" icon={CheckCircle2}
                            onClick={() => handleApprove(ot.approvalKey)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="danger" icon={XCircle}
                            onClick={() => handleReject(ot.approvalKey)}>
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="text-right text-xs text-slate-400">Sudah diproses</div>
                      )}
                    </td>
                  </tr>
                  {expanded === ot.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={8} className="px-5 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white rounded-lg border border-slate-200 p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <MapPinned className="w-3.5 h-3.5 text-brand-600" />
                              <p className="text-xs font-semibold text-slate-700">GPS Clock Out</p>
                            </div>
                            <p className="text-xs text-slate-600">{ot.gps}</p>
                            {ot.gpsDistance !== undefined && ot.gpsDistance !== null && (
                              <p className="text-[10px] text-slate-400 mt-1">
                                Jarak dari kantor: {ot.gpsDistance}m
                              </p>
                            )}
                          </div>
                          <div className="bg-white rounded-lg border border-slate-200 p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <p className="text-xs font-semibold text-slate-700">Task Terakhir</p>
                            </div>
                            <p className="text-xs text-slate-600">{ot.lastTask}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============ PAYROLL VIEW ============

function PayrollView() {
  const { user } = useAuth();
  const [monthOffset, setMonthOffset] = useState(0);
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadPayroll = async () => {
    setLoading(true);
    const ts = new Date();
    ts.setMonth(ts.getMonth() + monthOffset);
    try {
      const data = await buildPayroll(ts.getTime());
      setPayroll(data);
    } catch (err) {
      console.error('[payroll] load error:', err);
      alert('Gagal load payroll: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayroll();
  }, [monthOffset]);

  const handleApprove = async () => {
    if (!payroll) return;
    if (!confirm(`Approve payroll ${payroll.monthLabel}?`)) return;

    setActionLoading(true);
    try {
      await approvePayroll(
        payroll.monthKey,
        payroll.monthLabel,
        payroll.summary,
        user?.id
      );
      await loadPayroll();
      alert('✅ Payroll berhasil di-approve');
    } catch (err) {
      console.error('[payroll] approve error:', err);
      alert('Gagal approve: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    if (!payroll) return;
    if (!confirm('Reset approval payroll ini?')) return;
    try {
      await resetPayrollApproval(payroll.monthKey);
      await loadPayroll();
    } catch (err) {
      alert('Gagal reset: ' + err.message);
    }
  };

  const monthLabel = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  })();

  if (loading && !payroll) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memuat payroll...</p>
        </div>
      </div>
    );
  }

  if (!payroll) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <p className="text-sm text-slate-500">Gagal memuat data payroll</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setMonthOffset(monthOffset - 1)}
            className="w-8 h-8 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center">←</button>
          <div className="px-4 py-2 bg-white border border-slate-300 rounded-lg min-w-[200px] text-center">
            <p className="text-sm font-bold text-slate-900 capitalize">{monthLabel}</p>
          </div>
          <button onClick={() => setMonthOffset(Math.min(0, monthOffset + 1))}
            disabled={monthOffset >= 0}
            className="w-8 h-8 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center disabled:opacity-40">→</button>
        </div>
        <div className="flex items-center gap-2">
          {payroll.approvalStatus === 'approved' && (
            <>
              <Badge variant="success">
                <CheckCircle2 className="w-3 h-3" /> Approved
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleReset}>Reset</Button>
            </>
          )}
          <Button variant="secondary" icon={Printer} onClick={() => setShowPayslipModal(true)}>
            Print Slip Gaji
          </Button>
          <Button variant="secondary" icon={Download} onClick={() => exportPayrollCSV(payroll)}>
            Export CSV
          </Button>
          {payroll.approvalStatus !== 'approved' && (
            <Button variant="success" icon={Check} onClick={handleApprove} disabled={actionLoading}>
              {actionLoading ? 'Memproses...' : 'Approve Payroll'}
            </Button>
          )}
        </div>
      </div>

      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-brand-600" />
        </div>
        <div className="text-xs text-brand-900">
          <p className="font-semibold mb-1">Formula perhitungan gaji</p>
          <p className="text-brand-800">
            <code className="bg-white px-1.5 py-0.5 rounded font-mono text-[11px]">
              Gaji = Rate Harian × Hari Hadir
            </code>
            {' · '}
            <code className="bg-white px-1.5 py-0.5 rounded font-mono text-[11px]">
              Take Home = Gaji + OT
            </code>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center mb-3">
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Total Karyawan</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {payroll.summary.totalEmployees}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
            <DollarSign className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Total Gaji Harian</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            {formatRupiah(payroll.summary.totalBase)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Total OT Pay</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            {formatRupiah(payroll.summary.totalOT)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Total Take Home</p>
          <p className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">
            {formatRupiah(payroll.summary.totalPayroll)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Detail Payroll per Karyawan</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase w-8"></th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Karyawan</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Hadir</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">OT</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Gaji Harian</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">OT Pay</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Take Home</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payroll.rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-xs">
                  Belum ada data karyawan
                </td>
              </tr>
            )}
            {payroll.rows.map((r) => (
              <Fragment key={r.workerId}>
                <tr className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => setExpandedRow(expandedRow === r.workerId ? null : r.workerId)}>
                  <td className="px-5 py-3">
                    {expandedRow === r.workerId
                      ? <ChevronUp className="w-4 h-4 text-slate-500" />
                      : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{r.workerName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{r.workerIdDisplay}</p>
                  </td>
                  <td className="px-5 py-3 tabular-nums">
                    {r.daysPresent}<span className="text-slate-400">/{r.workingDays}</span>
                    {r.daysLate > 0 && (
                      <p className="text-[10px] text-amber-600">{r.daysLate} hari telat</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-amber-700 font-semibold">
                    {r.otMinutes > 0 ? formatOTHours(r.otMinutes) : '-'}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                    {formatRupiah(r.basePay)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-emerald-700 font-semibold">
                    {r.otPay > 0 ? `+${formatRupiah(r.otPay)}` : '-'}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-bold text-slate-900">
                    {formatRupiah(r.takeHome)}
                  </td>
                </tr>
                {expandedRow === r.workerId && (
                  <tr className="bg-slate-50">
                    <td colSpan={7} className="px-5 py-4">
                      <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <div className="grid grid-cols-4 gap-3">
                          <div className="rounded-lg p-3 border bg-slate-50 border-slate-200">
                            <p className="text-[10px] text-slate-500 font-semibold uppercase mb-1">Rate Harian</p>
                            <p className="text-sm font-bold tabular-nums text-slate-900">
                              {formatRupiah(r.dailyRate)}
                            </p>
                          </div>
                          <div className="rounded-lg p-3 border bg-slate-50 border-slate-200">
                            <p className="text-[10px] text-slate-500 font-semibold uppercase mb-1">Hari Hadir</p>
                            <p className="text-sm font-bold tabular-nums text-slate-900">
                              {r.daysPresent} hari
                            </p>
                          </div>
                          <div className="rounded-lg p-3 border bg-brand-50 border-brand-200">
                            <p className="text-[10px] text-slate-500 font-semibold uppercase mb-1">Gaji Pokok</p>
                            <p className="text-sm font-bold tabular-nums text-brand-700">
                              {formatRupiah(r.basePay)}
                            </p>
                          </div>
                          <div className="rounded-lg p-3 border bg-slate-50 border-slate-200">
                            <p className="text-[10px] text-slate-500 font-semibold uppercase mb-1">OT Pay</p>
                            <p className="text-sm font-bold tabular-nums text-emerald-700">
                              {r.otPay > 0 ? `+${formatRupiah(r.otPay)}` : 'Rp 0'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={showPayslipModal}
        onClose={() => setShowPayslipModal(false)}
        title="Preview Slip Gaji"
        subtitle={`${payroll.rows.length} karyawan · 5 slip per lembar F4`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-brand-50 border border-brand-200 rounded-lg p-3 no-print">
            <div className="text-xs text-brand-900">
              <p className="font-semibold mb-0.5">
                {Math.ceil(payroll.rows.length / 5)} lembar F4 akan dicetak
              </p>
              <p className="text-brand-700">5 slip gaji per lembar</p>
            </div>
            <Button icon={Printer} onClick={printDocument}>Cetak Sekarang</Button>
          </div>
          <div className="bg-slate-100 rounded-lg p-4 overflow-auto" style={{ maxHeight: '600px' }}>
            <div style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '215mm' }}>
              <PayslipPage rows={payroll.rows} monthLabel={payroll.monthLabel} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============ LIVE WMS MONITOR ============

function LiveWMSMonitor() {
  const [totalStockValue, setTotalStockValue] = useState(0);
  const [lowStockAlerts, setLowStockAlerts] = useState(0);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWMS = async () => {
    if (!isSupabaseEnabled()) {
      setLoading(false);
      return;
    }

    try {
      // 1. Inventory: total stock value + low stock
      const { data: inv } = await supabase
        .from('inventory')
        .select('stock, min_stock, selling_price, purchase_price');

      const totalVal = (inv || []).reduce((s, it) => {
        const price = Number(it.selling_price || it.purchase_price || 0);
        return s + Number(it.stock || 0) * price;
      }, 0);
      setTotalStockValue(totalVal);

      const lowCount = (inv || []).filter(
        (it) => Number(it.stock) < Number(it.min_stock || 50)
      ).length;
      setLowStockAlerts(lowCount);

      // 2. Activity log
      const { data: act } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setFeed(act || []);
    } catch (err) {
      console.error('[live-wms] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWMS();

    if (!isSupabaseEnabled()) return;

    const channel = supabase
      .channel('live-wms-monitor')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        () => fetchWMS()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        (payload) => {
          setFeed((prev) => [payload.new, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 font-medium">Total Stock Value</p>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900 tabular-nums">
            {formatRupiah(totalStockValue)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-slate-400">
            {totalStockValue > 0 ? 'Dari inventory aktif' : 'Belum ada data'}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 font-medium">Low Stock Alerts</p>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-600 tabular-nums">
            {lowStockAlerts}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            SKU di bawah minimum threshold
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LiveDot />
            <h3 className="text-sm font-semibold text-slate-900">Live Activity Feed</h3>
          </div>
          <Badge variant="neutral">{feed.length} event</Badge>
        </div>
        <div className="divide-y divide-slate-100">
          {loading && feed.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              Memuat aktivitas...
            </div>
          )}
          {!loading && feed.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              Belum ada aktivitas
            </div>
          )}
          {feed.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50"
            >
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0">
                {(a.actor_name || 'SY').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900">{a.text}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono text-slate-500">
                    {a.type}
                  </span>
                  <span className="text-[10px] text-slate-400">·</span>
                  <span className="text-[10px] text-slate-500">
                    {a.actor_name || 'System'}
                  </span>
                  <span className="text-[10px] text-slate-400">·</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(a.created_at).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
// ============ MAIN ============

export default function AdminDashboard() {
  const [view, setView] = useState('overview');

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'employees', label: 'Manajemen Pekerja', icon: UserCog },
    { id: 'attendance', label: 'Attendance & OT', icon: Clock },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'finance', label: 'Keuangan', icon: Wallet },
    { id: 'logistics', label: 'Logistik', icon: PackageCheck },
    { id: 'monitor', label: 'Live WMS Monitor', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      <Sidebar items={navItems} active={view} setActive={setView} brand="Matang Lestari" />
      <div className="ml-60">
        <TopBar
          title={navItems.find((n) => n.id === view)?.label}
          subtitle="UD Matang Lestari"
          actions={
            <button className="relative w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <Activity className="w-4 h-4 text-slate-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
          }
        />
        <main className="p-6">
          {view === 'overview' && <Overview />}
          {view === 'employees' && <EmployeeManagement />}
          {view === 'attendance' && <AttendanceAndOT />}
          {view === 'payroll' && <PayrollView />}
          {view === 'finance' && <FinanceView />}
          {view === 'logistics' && <LogisticsReview />}
          {view === 'monitor' && <LiveWMSMonitor />}
        </main>
      </div>
    </div>
  );
}