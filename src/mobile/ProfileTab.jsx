// src/mobile/ProfileTab.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Phone, Smartphone, Building2, Calendar,
  BadgeCheck, LogOut, Clock, PackageCheck, Award,
} from 'lucide-react';
import { Badge } from '../components/shared';
import { useAttendanceSupabase as useAttendance } from '../hooks/useAttendanceSupabase';
import { useAuth } from '../lib/authContext';
import { formatDuration } from '../lib/attendance';

export default function ProfileTab() {
  const { worker, monthlySummary } = useAttendance();
  const { profile, signOut, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect ke login kalau logout
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Pakai profile dari Supabase kalau ada, fallback ke worker mock
  const displayName = profile?.full_name || worker.name;
  const displayId = profile?.employee_id || worker.id;
  const displayPhone = profile?.phone || worker.phone;
  const displayDivision = profile?.division || worker.division;
  const displayPosition = profile?.position || worker.position;
  const displayInitials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const menuItems = [
    { icon: User, label: 'Nama', value: displayName },
    { icon: Phone, label: 'Nomor HP', value: displayPhone },
    { icon: Building2, label: 'Divisi', value: displayDivision },
    { icon: User, label: 'Jabatan', value: displayPosition },
    { icon: Calendar, label: 'Bergabung', value: worker.joinedAt },
  ];

  const handleLogout = async () => {
    if (!confirm('Keluar dari akun?')) return;
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="p-5 space-y-4">
      {/* HEADER */}
      <div className="pt-2 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center text-white text-xl font-bold">
          {displayInitials}
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">{displayName}</h1>
          <p className="text-xs text-slate-500">ID: {displayId}</p>
          <div className="mt-1">
            <Badge variant="success">
              <BadgeCheck className="w-3 h-3" /> Aktif
            </Badge>
          </div>
        </div>
      </div>

      {/* MONTHLY SUMMARY */}
      <div className="bg-slate-900 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Ringkasan Bulan Ini</h3>
          <span className="text-[10px] text-slate-400 font-medium capitalize">
            {monthlySummary.monthLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">
              Total Jam Kerja
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {formatDuration(monthlySummary.totalWorkedMs)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">
              Total Pengiriman
            </p>
            <p className="text-2xl font-bold tabular-nums">87</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Kehadiran</p>
            <p className="text-sm font-semibold">{monthlySummary.daysPresent} hari</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Rating</p>
            <p className="text-sm font-semibold text-emerald-400">4.8 / 5.0</p>
          </div>
        </div>

        {monthlySummary.daysLate > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-700 flex items-center gap-2 text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            <p className="text-[11px] font-medium">
              {monthlySummary.daysLate} hari telat bulan ini
            </p>
          </div>
        )}
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <Clock className="w-4 h-4 text-brand-600 mx-auto mb-1" />
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Hadir</p>
          <p className="text-sm font-bold text-slate-900 mt-0.5 tabular-nums">
            {monthlySummary.daysPresent}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <PackageCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Kirim</p>
          <p className="text-sm font-bold text-slate-900 mt-0.5 tabular-nums">87</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <Award className="w-4 h-4 text-amber-600 mx-auto mb-1" />
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Rating</p>
          <p className="text-sm font-bold text-slate-900 mt-0.5 tabular-nums">4.8</p>
        </div>
      </div>

      {/* INFO LIST */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-slate-500" />
              </div>
              <span className="text-sm text-slate-600 flex-1">{item.label}</span>
              <span className="text-sm font-medium text-slate-900">{item.value}</span>
            </div>
          );
        })}
      </div>

      {/* LOGOUT */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-red-200 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Keluar Akun
      </button>
    </div>
  );
}