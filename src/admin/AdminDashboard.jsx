// src/admin/AdminDashboard.jsx
import React, { useState, useEffect, useMemo, Fragment } from 'react';
import {
  LayoutDashboard, Clock, DollarSign, Activity, Users,
  TrendingUp, ArrowUpRight, ArrowDownRight, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, MapPinned, PackageCheck,
  AlertTriangle, FileText, Timer, TrendingDown, Download, Check,
  Boxes, Inbox, UserCog, Wallet, Printer, Send, Building2,
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
import RentalsWrapper from './views/rentals/RentalsWrapper';
import { useAttendanceAdmin } from '../hooks/useAttendanceAdmin';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

// ============ OVERVIEW ============
// (sama seperti aslinya, tidak berubah)

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
// (fungsi AttendanceAndOT — sama persis, tidak berubah)
// ... [salin dari file asli kamu, tidak ada perubahan] ...

// ============ PAYROLL VIEW ============
// (fungsi PayrollView — sama persis, tidak berubah)
// ... [salin dari file asli kamu, tidak ada perubahan] ...

// ============ LIVE WMS MONITOR ============
// (fungsi LiveWMSMonitor — sama persis, tidak berubah)
// ... [salin dari file asli kamu, tidak ada perubahan] ...

// ============ MAIN ============

export default function AdminDashboard() {
  const [view, setView] = useState('overview');

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'employees', label: 'Manajemen Pekerja', icon: UserCog },
    { id: 'attendance', label: 'Attendance & OT', icon: Clock },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'finance', label: 'Keuangan', icon: Wallet },
    { id: 'rentals', label: 'Sewa Bulanan', icon: Building2 },  // ← MENU BARU
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
          {view === 'rentals' && <RentalsWrapper />}          
          {view === 'logistics' && <LogisticsReview />}
          {view === 'monitor' && <LiveWMSMonitor />}
        </main>
      </div>
    </div>
  );
}