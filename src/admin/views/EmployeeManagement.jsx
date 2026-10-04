// src/admin/views/EmployeeManagement.jsx
import React, { useState, useMemo } from 'react';
import {
  Search, Plus, X, Edit3, Trash2, Key, User, Mail, Phone,
  Building2, Calendar, BadgeCheck, XCircle, Clock, TrendingUp,
  ShieldCheck, Users, Wallet, Loader, RefreshCw,
} from 'lucide-react';
import { cn, Badge, Button, Input, Modal } from '../../components/shared';
import { useEmployees } from '../../hooks/useEmployees';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';

function formatRupiah(n) {
  if (!n && n !== 0) return 'Rp 0';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function EmployeeManagement() {
  const { employees, loading, error, refetch } = useEmployees();
  const [q, setQ] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchQ =
        (e.full_name || '').toLowerCase().includes(q.toLowerCase()) ||
        (e.employee_id || '').toLowerCase().includes(q.toLowerCase()) ||
        (e.email || '').toLowerCase().includes(q.toLowerCase());
      const matchRole = filterRole === 'all' || e.role === filterRole;
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && e.is_active) ||
        (filterStatus === 'inactive' && !e.is_active);
      return matchQ && matchRole && matchStatus;
    });
  }, [employees, q, filterRole, filterStatus]);

  // ============ SAVE ============

  const handleSave = async (data) => {
    if (!isSupabaseEnabled()) {
      alert('Supabase tidak aktif');
      return;
    }

    setActionLoading(true);
    try {
      if (editTarget) {
        // UPDATE
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: data.name,
            phone: data.phone,
            role: data.role,
            position: data.position,
            division: data.division,
            daily_rate: data.dailyRate,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editTarget.id);

        if (error) throw error;
        alert('✅ Data karyawan berhasil diperbarui');
      } else {
        // CREATE via Edge Function
        const password = data.password || 'MatangLestari2026!';
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Session expired, silakan login ulang');

        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        console.log('[create-employee] calling edge function...');

        const res = await fetch(`${SUPABASE_URL}/functions/v1/create-employee`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: data.email,
            password,
            full_name: data.name,
            phone: data.phone,
            role: data.role,
            position: data.position,
            division: data.division,
            daily_rate: data.dailyRate,
          }),
        });

        const result = await res.json();
        console.log('[create-employee] response:', result);

        if (!res.ok) {
          throw new Error(result.error || result.details || 'Gagal membuat karyawan');
        }

        alert(
          `✅ Karyawan "${data.name}" berhasil dibuat!\n\n` +
          `📧 Email: ${data.email}\n` +
          `🔑 Password: ${password}\n\n` +
          `Karyawan bisa langsung login dengan kredensial di atas.`
        );
      }

      await refetch();
      setShowForm(false);
      setEditTarget(null);
    } catch (err) {
      console.error('[employee] save error:', err);
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ============ DEACTIVATE / ACTIVATE ============

  const handleDeactivate = async (id) => {
    if (!confirm('Nonaktifkan karyawan ini? Dia gak bisa login lagi.')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (id) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await refetch();
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') return <Badge variant="danger">Admin Pusat</Badge>;
    if (role === 'wms') return <Badge variant="info">WMS</Badge>;
    return <Badge variant="neutral">Worker</Badge>;
  };

  // ============ LOADING ============

  if (loading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memuat data karyawan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama, ID, atau email..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            disabled={loading}
            className="w-9 h-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4 text-slate-600', loading && 'animate-spin')} />
          </button>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Semua Role</option>
            <option value="worker">Worker</option>
            <option value="wms">WMS</option>
            <option value="admin">Admin Pusat</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
          <Button icon={Plus} onClick={() => { setEditTarget(null); setShowForm(true); }}>
            Tambah Karyawan
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
          ⚠️ Error: {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center mb-2">
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Total Karyawan</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            {employees.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mb-2">
            <BadgeCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Aktif</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            {employees.filter((e) => e.is_active).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mb-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Admin & WMS</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            {employees.filter((e) => e.role === 'admin' || e.role === 'wms').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-2">
            <XCircle className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Nonaktif</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            {employees.filter((e) => !e.is_active).length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Karyawan</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">ID</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Jabatan</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Kontak</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Role</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Gaji Harian</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-slate-500 text-xs">
                  {employees.length === 0
                    ? 'Belum ada karyawan. Klik "Tambah Karyawan" untuk mulai.'
                    : 'Tidak ada karyawan yang cocok dengan filter'}
                </td>
              </tr>
            )}
            {filtered.map((e) => (
              <tr
                key={e.id}
                className="hover:bg-slate-50 cursor-pointer"
                onClick={() => setDetailTarget(e)}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0">
                      {getInitials(e.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{e.full_name || 'Unnamed'}</p>
                      <p className="text-[10px] text-slate-500">{e.division || '-'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-slate-700">{e.employee_id}</td>
                <td className="px-5 py-3 text-slate-700">{e.position || '-'}</td>
                <td className="px-5 py-3">
                  <p className="text-xs text-slate-700">{e.email}</p>
                  <p className="text-[10px] text-slate-500">{e.phone || '-'}</p>
                </td>
                <td className="px-5 py-3">{getRoleBadge(e.role)}</td>
                <td className="px-5 py-3 text-right">
                  <p className="tabular-nums font-semibold text-slate-900">
                    {formatRupiah(e.daily_rate)}
                  </p>
                  <p className="text-[10px] text-slate-400">per hari</p>
                </td>
                <td className="px-5 py-3">
                  {e.is_active ? (
                    <Badge variant="success">
                      <BadgeCheck className="w-3 h-3" /> Aktif
                    </Badge>
                  ) : (
                    <Badge variant="neutral">
                      <XCircle className="w-3 h-3" /> Nonaktif
                    </Badge>
                  )}
                </td>
                <td className="px-5 py-3" onClick={(ev) => ev.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => { setEditTarget(e); setShowForm(true); }}
                      className="w-7 h-7 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <button
                      onClick={() => setResetTarget(e)}
                      className="w-7 h-7 rounded-lg hover:bg-amber-50 inline-flex items-center justify-center"
                      title="Reset Password"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-600" />
                    </button>
                    {e.is_active ? (
                      <button
                        onClick={() => handleDeactivate(e.id)}
                        disabled={actionLoading}
                        className="w-7 h-7 rounded-lg hover:bg-red-50 inline-flex items-center justify-center disabled:opacity-50"
                        title="Nonaktifkan"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(e.id)}
                        disabled={actionLoading}
                        className="w-7 h-7 rounded-lg hover:bg-emerald-50 inline-flex items-center justify-center disabled:opacity-50"
                        title="Aktifkan"
                      >
                        <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditTarget(null); }}
        title={editTarget ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
        subtitle={editTarget ? editTarget.employee_id : 'Karyawan baru langsung bisa login setelah disimpan'}
        size="md"
      >
        <EmployeeForm
          initial={editTarget}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
          loading={actionLoading}
        />
      </Modal>

      {/* Detail Slide-over */}
      {detailTarget && (
        <EmployeeDetail
          employee={detailTarget}
          onClose={() => setDetailTarget(null)}
          onEdit={(emp) => {
            setDetailTarget(null);
            setEditTarget(emp);
            setShowForm(true);
          }}
          onResetPassword={(emp) => {
            setDetailTarget(null);
            setResetTarget(emp);
          }}
        />
      )}

      {/* Reset Password Modal */}
      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset Password"
        subtitle={resetTarget ? resetTarget.full_name : ''}
        size="sm"
      >
        {resetTarget && (
          <ResetPasswordForm
            employee={resetTarget}
            onClose={() => setResetTarget(null)}
          />
        )}
      </Modal>
    </div>
  );
}

// ============ FORM ============

function EmployeeForm({ initial, onSave, onCancel, loading }) {
  const [name, setName] = useState(initial?.full_name || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [role, setRole] = useState(initial?.role || 'worker');
  const [position, setPosition] = useState(initial?.position || '');
  const [division, setDivision] = useState(initial?.division || 'Field Delivery');
  const [dailyRate, setDailyRate] = useState(initial?.daily_rate || 230000);
  const [password, setPassword] = useState('MatangLestari2026!');

  const canSave =
    name &&
    email &&
    phone &&
    position &&
    dailyRate > 0 &&
    (initial || password.length >= 6);

  return (
    <div className="space-y-4">
      <Input
        label="Nama Lengkap"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Contoh: Budi Santoso"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Email"
          icon={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@matanglestari.co.id"
          disabled={!!initial}
        />
        <Input
          label="Nomor HP"
          icon={Phone}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0812-xxxx-xxxx"
        />
      </div>

      {!initial && (
        <div>
          <Input
            label="Password Awal"
            icon={Key}
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            Karyawan pakai password ini buat login pertama kali
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="worker">Worker (Driver/Helper)</option>
            <option value="wms">WMS Operator</option>
            <option value="admin">Admin Pusat</option>
          </select>
        </div>
        <Input
          label="Jabatan"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="Contoh: Driver Pengiriman"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Divisi</label>
          <select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="Field Delivery">Field Delivery</option>
            <option value="Warehouse">Warehouse</option>
            <option value="Management">Management</option>
            <option value="Finance">Finance</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Gaji Harian (Rp)
          </label>
          <input
            type="number"
            value={dailyRate}
            onChange={(e) => setDailyRate(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 tabular-nums"
            placeholder="230000"
          />
          {dailyRate > 0 && (
            <p className="text-[10px] text-slate-500 mt-1">
              = {formatRupiah(dailyRate)} per hari hadir
            </p>
          )}
        </div>
      </div>

      {dailyRate > 0 && (
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
          <p className="text-[11px] text-brand-900">
            <strong>Estimasi gaji bulanan:</strong>{' '}
            {formatRupiah(dailyRate * 22)} (22 hari kerja)
          </p>
        </div>
      )}

      {!initial && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800">
          <p className="font-semibold mb-1">✅ Karyawan langsung bisa login</p>
          <p>
            Setelah disimpan, karyawan bisa login dengan email + password di atas.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>Batal</Button>
        <Button
          onClick={() =>
            onSave({
              name,
              email,
              phone,
              role,
              position,
              division,
              dailyRate,
              password,
            })
          }
          disabled={!canSave || loading}
        >
          {loading ? 'Menyimpan...' : initial ? 'Simpan Perubahan' : 'Tambah Karyawan'}
        </Button>
      </div>
    </div>
  );
}

// ============ DETAIL SLIDE-OVER ============

function EmployeeDetail({ employee, onClose, onEdit, onResetPassword }) {
  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 z-50" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-[480px] bg-white z-50 overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900">Detail Karyawan</h2>
            <p className="text-xs text-slate-500 mt-0.5">{employee.employee_id}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-lg font-bold text-brand-700">
              {getInitials(employee.full_name)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{employee.full_name}</h3>
              <p className="text-xs text-slate-500">
                {employee.position || '-'} · {employee.division || '-'}
              </p>
              <div className="mt-1 flex items-center gap-2">
                {employee.is_active ? (
                  <Badge variant="success">
                    <BadgeCheck className="w-3 h-3" /> Aktif
                  </Badge>
                ) : (
                  <Badge variant="neutral">
                    <XCircle className="w-3 h-3" /> Nonaktif
                  </Badge>
                )}
                {employee.role === 'admin' && <Badge variant="danger">Admin</Badge>}
                {employee.role === 'wms' && <Badge variant="info">WMS</Badge>}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Informasi
            </h4>
            <InfoRow icon={Mail} label="Email" value={employee.email} />
            <InfoRow icon={Phone} label="Nomor HP" value={employee.phone || '-'} />
            <InfoRow icon={Building2} label="Divisi" value={employee.division || '-'} />
            <InfoRow
              icon={Calendar}
              label="Bergabung"
              value={
                employee.joined_at
                  ? new Date(employee.joined_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '-'
              }
            />
          </div>

          <div className="bg-gradient-to-br from-brand-50 to-brand-100 border border-brand-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-xs font-bold text-brand-900">Gaji Harian</p>
            </div>
            <p className="text-2xl font-bold text-brand-900 tabular-nums">
              {formatRupiah(employee.daily_rate)}
            </p>
            <p className="text-[11px] text-brand-700 mt-1">
              Estimasi bulanan (22 hari):{' '}
              <strong>{formatRupiah((employee.daily_rate || 0) * 22)}</strong>
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200 space-y-2">
            <Button
              variant="secondary"
              className="w-full"
              icon={Edit3}
              onClick={() => onEdit && onEdit(employee)}
            >
              Edit Data
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              icon={Key}
              onClick={() => onResetPassword && onResetPassword(employee)}
            >
              Reset Password
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
      <span className="text-xs text-slate-500 w-24 flex-shrink-0">{label}</span>
      <span className="text-xs text-slate-900 font-medium truncate">{value}</span>
    </div>
  );
}

// ============ RESET PASSWORD ============

function ResetPasswordForm({ employee, onClose }) {
  const [mode, setMode] = useState('auto');
  const [manualPass, setManualPass] = useState('');
  const [generated, setGenerated] = useState(null);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars[Math.floor(Math.random() * chars.length)];
    }
    return pass;
  };

  const handleReset = () => {
    const newPass = mode === 'auto' ? generatePassword() : manualPass;
    if (!newPass || newPass.length < 6) {
      alert('Password minimal 6 karakter');
      return;
    }
    setGenerated(newPass);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generated);
  };

  if (generated) {
    return (
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-xs text-emerald-800 font-medium mb-2">
            Password baru untuk <strong>{employee.full_name}</strong>
          </p>
          <div className="bg-white rounded-md p-3 flex items-center justify-between gap-2 border border-emerald-200">
            <code className="text-sm font-mono text-slate-900">{generated}</code>
            <button
              onClick={handleCopy}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-[11px] text-amber-800 font-semibold mb-1">
            ⚠️ CARA SET PASSWORD
          </p>
          <p className="text-[11px] text-amber-800">
            Password di atas <strong>belum otomatis ke-set</strong>. Admin harus:
          </p>
          <ol className="text-[11px] text-amber-800 list-decimal ml-4 mt-1 space-y-0.5">
            <li>Buka Supabase Dashboard → Authentication → Users</li>
            <li>
              Cari user: <strong>{employee.email}</strong>
            </li>
            <li>
              Klik 3 titik → <strong>Reset Password</strong>
            </li>
            <li>Paste password di atas</li>
          </ol>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200">
          <Button onClick={onClose}>Selesai</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-lg p-3">
        <p className="text-xs text-slate-600">
          Reset password untuk <strong>{employee.full_name}</strong> ({employee.email})
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700">Metode</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('auto')}
            className={cn(
              'px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
              mode === 'auto'
                ? 'bg-brand-50 text-brand-700 border-brand-300'
                : 'bg-white text-slate-600 border-slate-300'
            )}
          >
            Generate Otomatis
          </button>
          <button
            onClick={() => setMode('manual')}
            className={cn(
              'px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
              mode === 'manual'
                ? 'bg-brand-50 text-brand-700 border-brand-300'
                : 'bg-white text-slate-600 border-slate-300'
            )}
          >
            Set Manual
          </button>
        </div>
      </div>

      {mode === 'manual' && (
        <Input
          label="Password Baru"
          type="text"
          value={manualPass}
          onChange={(e) => setManualPass(e.target.value)}
          placeholder="Minimal 6 karakter"
        />
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
        <Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button onClick={handleReset}>Generate Password</Button>
      </div>
    </div>
  );
}