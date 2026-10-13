// src/admin/views/rentals/RentalsView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, X, Edit2, Trash2, Building2, Phone, MapPin, Loader, AlertCircle,
} from 'lucide-react';
import { cn, Badge, Button, Modal } from '../../../components/shared';
import { fetchRentals, createRental, updateRental, deleteRental } from '../../../lib/rentStore';

function formatRupiah(n) {
  if (!n && n !== 0) return '-';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function RentalsView() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchRentals();
      setRentals(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rentals.filter((r) => {
      const matchQ =
        r.tenant_name?.toLowerCase().includes(q.toLowerCase()) ||
        r.unit_name?.toLowerCase().includes(q.toLowerCase()) ||
        r.code?.toLowerCase().includes(q.toLowerCase());
      if (filter === 'all') return matchQ;
      return matchQ && r.status?.toLowerCase() === filter.toLowerCase();
    });
  }, [rentals, q, filter]);

  const handleSave = async (data) => {
    setActionLoading(true);
    try {
      if (editTarget) {
        await updateRental(editTarget.id, data);
      } else {
        await createRental(data);
      }
      await load();
      setShowForm(false);
      setEditTarget(null);
      alert(editTarget ? '✅ Data penyewa diupdate' : '✅ Penyewa baru ditambahkan');
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (rental) => {
    if (!confirm(`Hapus penyewa "${rental.tenant_name}"?\n\nSemua kwitansi terkait akan ikut terhapus.`)) return;
    try {
      await deleteRental(rental.id);
      await load();
    } catch (err) {
      alert('Gagal hapus: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari penyewa / unit / kode..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {['all', 'Aktif', 'Selesai'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                filter === f
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              )}
            >
              {f === 'all' ? 'Semua' : f}
            </button>
          ))}
          <Button icon={Plus} onClick={() => { setEditTarget(null); setShowForm(true); }}>
            Tambah Penyewa
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* SUMMARY */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Penyewa" value={rentals.length} color="brand" />
        <StatCard label="Aktif" value={rentals.filter(r => r.status === 'Aktif').length} color="emerald" />
        <StatCard label="Selesai" value={rentals.filter(r => r.status === 'Selesai').length} color="slate" />
        <StatCard
          label="Total Fee / Bulan"
          value={formatRupiah(rentals.filter(r => r.status === 'Aktif').reduce((s, r) => s + (r.monthly_fee || 0), 0))}
          color="amber"
        />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Kode</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Nama Penyewa</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Unit</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Kontak</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Mulai Sewa</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Fee / Bulan</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center">
                  <Loader className="w-6 h-6 text-brand-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Memuat data penyewa...</p>
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-slate-500 text-xs">
                  {rentals.length === 0 ? 'Belum ada penyewa. Klik "Tambah Penyewa" untuk mulai.' : 'Tidak ada yang cocok'}
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{r.code}</td>
                <td className="px-5 py-3 font-medium text-slate-900">{r.tenant_name}</td>
                <td className="px-5 py-3 text-slate-700">{r.unit_name}</td>
                <td className="px-5 py-3 text-slate-600 text-xs">
                  {r.tenant_phone ? (
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.tenant_phone}</span>
                  ) : '-'}
                </td>
                <td className="px-5 py-3 text-slate-700">{formatDate(r.start_date)}</td>
                <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900">
                  {formatRupiah(r.monthly_fee)}
                </td>
                <td className="px-5 py-3">
                  <Badge variant={r.status === 'Aktif' ? 'success' : 'secondary'}>{r.status}</Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => { setEditTarget(r); setShowForm(true); }}
                      className="w-7 h-7 rounded hover:bg-brand-50 flex items-center justify-center"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-brand-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      className="w-7 h-7 rounded hover:bg-red-50 flex items-center justify-center"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL FORM */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditTarget(null); }}
        title={editTarget ? 'Edit Penyewa' : 'Tambah Penyewa Baru'}
        subtitle={editTarget?.code || 'Isi data penyewa'}
        size="md"
      >
        <RentalForm
          initial={editTarget}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
          loading={actionLoading}
        />
      </Modal>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', colors[color])}>
        <Building2 className="w-4 h-4" />
      </div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
    </div>
  );
}

function RentalForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    tenant_name: initial?.tenant_name || '',
    tenant_phone: initial?.tenant_phone || '',
    tenant_address: initial?.tenant_address || '',
    unit_name: initial?.unit_name || '',
    start_date: initial?.start_date || new Date().toISOString().slice(0, 10),
    end_date: initial?.end_date || '',
    monthly_fee: initial?.monthly_fee || '',
    status: initial?.status || 'Aktif',
    notes: initial?.notes || '',
  });

  const set = (k, v) => setForm({ ...form, [k]: v });

  const canSave = form.tenant_name.trim() && form.unit_name.trim() && form.start_date;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nama Penyewa" required>
          <input
            value={form.tenant_name}
            onChange={(e) => set('tenant_name', e.target.value)}
            placeholder="Contoh: PT Sumber Rejeki"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>
        <Field label="No. HP">
          <input
            value={form.tenant_phone}
            onChange={(e) => set('tenant_phone', e.target.value)}
            placeholder="08xx"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>
      </div>

      <Field label="Alamat">
        <input
          value={form.tenant_address}
          onChange={(e) => set('tenant_address', e.target.value)}
          placeholder="Alamat penyewa"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </Field>

      <Field label="Unit yang Disewa" required>
        <input
          value={form.unit_name}
          onChange={(e) => set('unit_name', e.target.value)}
          placeholder="Contoh: Gudang A, Ruko No. 3"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Tanggal Mulai" required>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => set('start_date', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>
        <Field label="Tanggal Selesai (opsional)">
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => set('end_date', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>
      </div>

      <Field label="Fee Bulanan (isi manual)">
        <input
          type="number"
          value={form.monthly_fee}
          onChange={(e) => set('monthly_fee', e.target.value)}
          placeholder="Contoh: 1500000"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {form.monthly_fee > 0 && (
          <p className="text-[10px] text-slate-500 mt-1">
            {formatRupiah(form.monthly_fee)}
          </p>
        )}
      </Field>

      <Field label="Status">
        <select
          value={form.status}
          onChange={(e) => set('status', e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="Aktif">Aktif</option>
          <option value="Selesai">Selesai</option>
        </select>
      </Field>

      <Field label="Catatan">
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={2}
          placeholder="Catatan tambahan"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>Batal</Button>
        <Button onClick={() => onSave(form)} disabled={!canSave || loading}>
          {loading ? 'Menyimpan...' : (initial ? 'Simpan Perubahan' : 'Tambah Penyewa')}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}