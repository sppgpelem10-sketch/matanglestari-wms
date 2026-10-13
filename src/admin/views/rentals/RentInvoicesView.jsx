// src/admin/views/rentals/RentInvoicesView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, Edit2, Trash2, Printer, FileText, Loader, AlertCircle,
} from 'lucide-react';
import { cn, Badge, Button, Modal } from '../../../components/shared';
import {
  fetchRentInvoices, fetchRentals, createRentInvoice, updateRentInvoice,
  deleteRentInvoice, BULAN_ID,
} from '../../../lib/rentStore';
import { printDocument } from '../../../components/DocumentTemplate';
import { ReceiptDoc } from '../../../components/ReceiptTemplate';

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

export default function RentInvoicesView() {
  const [invoices, setInvoices] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [inv, ren] = await Promise.all([fetchRentInvoices(), fetchRentals()]);
      setInvoices(inv);
      setRentals(ren);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchQ =
        inv.code?.toLowerCase().includes(q.toLowerCase()) ||
        inv.rentals?.tenant_name?.toLowerCase().includes(q.toLowerCase());
      const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
      const matchYear = !filterYear || inv.period_year === filterYear;
      return matchQ && matchStatus && matchYear;
    });
  }, [invoices, q, filterStatus, filterYear]);

  const handleSave = async (data) => {
    setActionLoading(true);
    try {
      if (editTarget) {
        await updateRentInvoice(editTarget.id, data);
      } else {
        await createRentInvoice(data);
      }
      await load();
      setShowForm(false);
      setEditTarget(null);
      alert(editTarget ? '✅ Kwitansi diupdate' : '✅ Kwitansi baru dibuat');
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (inv) => {
    if (!confirm(`Hapus kwitansi ${inv.code}?`)) return;
    try {
      await deleteRentInvoice(inv.id);
      await load();
    } catch (err) {
      alert('Gagal hapus: ' + err.message);
    }
  };

  const handlePrint = (inv) => {
    setPrintTarget({ invoice: inv, rental: inv.rentals });
    // Tunggu render, baru print
    setTimeout(() => printDocument(), 400);
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari kwitansi / penyewa..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {['all', 'Lunas', 'Belum Bayar'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                filterStatus === f
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              )}
            >
              {f === 'all' ? 'Semua' : f}
            </button>
          ))}
          <Button icon={Plus} onClick={() => { setEditTarget(null); setShowForm(true); }}>
            Buat Kwitansi
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
        <Stat label="Total Kwitansi" value={invoices.length} />
        <Stat label="Lunas" value={invoices.filter(i => i.status === 'Lunas').length} color="emerald" />
        <Stat label="Belum Bayar" value={invoices.filter(i => i.status === 'Belum Bayar').length} color="amber" />
        <Stat
          label={`Total ${filterYear}`}
          value={formatRupiah(
            invoices
              .filter(i => i.period_year === filterYear && i.status === 'Lunas')
              .reduce((s, i) => s + (i.amount || 0), 0)
          )}
          color="brand"
        />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Kode</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Penyewa</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Unit</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Periode</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Nominal</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Tgl Bayar</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Metode</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center">
                  <Loader className="w-6 h-6 text-brand-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Memuat kwitansi...</p>
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center text-slate-500 text-xs">
                  {invoices.length === 0 ? 'Belum ada kwitansi. Klik "Buat Kwitansi" untuk mulai.' : 'Tidak ada yang cocok'}
                </td>
              </tr>
            )}
            {filtered.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{inv.code}</td>
                <td className="px-5 py-3 font-medium text-slate-900">{inv.rentals?.tenant_name || '-'}</td>
                <td className="px-5 py-3 text-slate-700">{inv.rentals?.unit_name || '-'}</td>
                <td className="px-5 py-3 text-slate-700">
                  {BULAN_ID[inv.period_month - 1]} {inv.period_year}
                </td>
                <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900">
                  {formatRupiah(inv.amount)}
                </td>
                <td className="px-5 py-3 text-slate-600 text-xs">{formatDate(inv.payment_date)}</td>
                <td className="px-5 py-3 text-slate-600 text-xs">{inv.payment_method}</td>
                <td className="px-5 py-3">
                  <Badge variant={inv.status === 'Lunas' ? 'success' : 'warning'}>{inv.status}</Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handlePrint(inv)}
                      className="w-7 h-7 rounded hover:bg-brand-50 flex items-center justify-center"
                      title="Cetak Kwitansi"
                    >
                      <Printer className="w-3.5 h-3.5 text-brand-600" />
                    </button>
                    <button
                      onClick={() => { setEditTarget(inv); setShowForm(true); }}
                      className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(inv)}
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
        title={editTarget ? 'Edit Kwitansi' : 'Buat Kwitansi Baru'}
        subtitle={editTarget?.code || 'Pilih penyewa & periode'}
        size="md"
      >
        <InvoiceForm
          initial={editTarget}
          rentals={rentals}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
          loading={actionLoading}
        />
      </Modal>

      {/* HIDDEN PRINT ROOT */}
      {printTarget && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
          <ReceiptDoc invoice={printTarget.invoice} rental={printTarget.rental} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color = 'slate' }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    brand: 'bg-brand-50 text-brand-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', colors[color])}>
        <FileText className="w-4 h-4" />
      </div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
    </div>
  );
}

// ============ FORM ============

function InvoiceForm({ initial, rentals, onSave, onCancel, loading }) {
  const now = new Date();
  const [form, setForm] = useState({
    rental_id: initial?.rental_id || '',
    period_month: initial?.period_month || (now.getMonth() + 1),
    period_year: initial?.period_year || now.getFullYear(),
    amount: initial?.amount || '',
    payment_date: initial?.payment_date || now.toISOString().slice(0, 10),
    payment_method: initial?.payment_method || 'Cash',
    status: initial?.status || 'Belum Bayar',
    notes: initial?.notes || '',
  });

  const set = (k, v) => setForm({ ...form, [k]: v });

  // Saat penyewa dipilih → auto-isi amount dengan monthly_fee
  const handleRentalChange = (rentalId) => {
    const r = rentals.find(x => x.id === rentalId);
    setForm({
      ...form,
      rental_id: rentalId,
      amount: form.amount || r?.monthly_fee || '',
    });
  };

  const selectedRental = rentals.find(x => x.id === form.rental_id);
  const canSave = form.rental_id && form.period_month && form.period_year;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Penyewa <span className="text-red-500">*</span>
        </label>
        <select
          value={form.rental_id}
          onChange={(e) => handleRentalChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">-- Pilih penyewa --</option>
          {rentals.filter(r => r.status === 'Aktif').map((r) => (
            <option key={r.id} value={r.id}>
              {r.tenant_name} · {r.unit_name}
            </option>
          ))}
        </select>
        {selectedRental && (
          <p className="text-[10px] text-slate-500 mt-1">
            Fee bulanan default: {formatRupiah(selectedRental.monthly_fee)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Bulan <span className="text-red-500">*</span>
          </label>
          <select
            value={form.period_month}
            onChange={(e) => set('period_month', Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {BULAN_ID.map((b, i) => (
              <option key={i} value={i + 1}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Tahun <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.period_year}
            onChange={(e) => set('period_year', Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Nominal (isi manual)
        </label>
        <input
          type="number"
          value={form.amount}
          onChange={(e) => set('amount', e.target.value)}
          placeholder="Contoh: 1500000"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {form.amount > 0 && (
          <p className="text-[10px] text-slate-500 mt-1">{formatRupiah(form.amount)}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tanggal Bayar</label>
          <input
            type="date"
            value={form.payment_date}
            onChange={(e) => set('payment_date', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Metode</label>
          <select
            value={form.payment_method}
            onChange={(e) => set('payment_method', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="Cash">Cash</option>
            <option value="Transfer">Transfer</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
        <select
          value={form.status}
          onChange={(e) => set('status', e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="Belum Bayar">Belum Bayar</option>
          <option value="Lunas">Lunas</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Catatan</label>
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={2}
          placeholder="Catatan tambahan"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>Batal</Button>
        <Button icon={Printer} onClick={() => onSave(form)} disabled={!canSave || loading}>
          {loading ? 'Menyimpan...' : (initial ? 'Simpan Perubahan' : 'Simpan & Siap Cetak')}
        </Button>
      </div>
    </div>
  );
}