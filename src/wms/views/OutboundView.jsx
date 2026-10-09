// src/wms/views/OutboundView.jsx
import React, { useState, useMemo } from 'react';
import {
  Search, X, ChevronDown, ChevronUp, Camera, CheckCircle2,
  PackageCheck, Image as ImageIcon, Eye, Package, Clock, Loader, Send,
  Truck, MapPin, User, AlertTriangle,
} from 'lucide-react';
import { cn, Badge, Button, Modal } from '../../components/shared';
import PhotoUploader from './PhotoUploader';
import { reduceStockFromOutbound, validateStock } from '../../lib/inventoryStore';
import { useOutbound } from '../../hooks/useOutbound';
import { useDrivers } from '../../hooks/useDrivers';
import { uploadPhotos } from '../../lib/storageHelpers';
import { createTaskFromOutbound } from '../../lib/orderHelpers';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { kirimLaporan, formatOutbound } from '../../lib/telegram';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatRupiah(n) {
  if (!n && n !== 0) return 'Rp 0';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

export default function OutboundView() {
  const { outbounds, loading, error, refetch } = useOutbound();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [processTarget, setProcessTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const filtered = useMemo(() => {
    return outbounds.filter((o) => {
      const matchQ =
        o.id.toLowerCase().includes(q.toLowerCase()) ||
        o.customer.toLowerCase().includes(q.toLowerCase());
      if (filter === 'all') return matchQ;
      return matchQ && o.status.toLowerCase() === filter;
    });
  }, [outbounds, q, filter]);

  // ============ PROSES OUTBOUND (assign driver + foto) ============

  const handleProcess = async (outboundUuid, data) => {
    if (!isSupabaseEnabled()) {
      alert('Supabase tidak aktif');
      return;
    }

    setActionLoading(true);
    try {
      // 1. Upload foto
      let photoUrls = [];
      if (data.photos && data.photos.length > 0) {
        photoUrls = await uploadPhotos('outbound-photos', data.photos);
      }

      // 2. Update outbound — set driver + foto + notes
      const { error } = await supabase
        .from('outbound')
        .update({
          driver: data.driverName,
          driver_id: data.driverId,
          staff_name: data.staffName || null,
          photos: photoUrls,
          notes: data.notes || null,
        })
        .eq('id', outboundUuid);

      if (error) throw error;

      await refetch();
      setProcessTarget(null);
      alert('✅ Outbound siap dikirim. Lanjut klik "Konfirmasi Kirim" untuk mengurangi stok.');
    } catch (err) {
      console.error('[outbound] process error:', err);
      alert('Gagal: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ============ KONFIRMASI KIRIM (kurangi stok + auto-task) ============

  const handleShip = async (outbound) => {
    setActionLoading(true);
    try {
      // 1. Validasi stok
      const issues = await validateStock(outbound.lines);

      if (issues.length > 0) {
        const msg = issues
          .map((i) => `• ${i.sku} (${i.name})\n  Butuh: ${i.needed} · Tersedia: ${i.available}`)
          .join('\n\n');
        const proceed = confirm(`⚠️ STOK TIDAK MENCUKUPI\n\n${msg}\n\nLanjutkan kirim?`);
        if (!proceed) {
          setActionLoading(false);
          return;
        }
      }

      // 2. Kurangi stok
      const stockUpdate = await reduceStockFromOutbound(outbound.lines, {
        outboundId: outbound.id,
        date: outbound.date,
      });

      // 3. Update status
      const { error } = await supabase
        .from('outbound')
        .update({
          status: 'Shipped',
          shipped_at: new Date().toISOString(),
        })
        .eq('id', outbound.uuid);

      if (error) throw error;

      // 4. AUTO-CREATE TASK
      const task = await createTaskFromOutbound({
        id: outbound.uuid,
        code: outbound.id,
        customer: outbound.customer,
        soId: outbound.soId,
        customerAddress: outbound.customerAddress,
        customerPhone: outbound.customerPhone,
        customerContact: outbound.customerContact,
      });

      // 🔔 Kirim notif Telegram
      // Catatan: `outbound` dari useOutbound pakai camelCase,
      // jadi kita mapping dulu ke format yang dibaca formatter (snake_case)
      await kirimLaporan(formatOutbound({
        code: outbound.id,
        date: outbound.date,
        time: outbound.time,
        customer: outbound.customer,
        customer_address: outbound.customerAddress,
        driver: outbound.driver,
        items: outbound.lines?.length || 0,
        total_qty: outbound.totalQty,
        subtotal: outbound.subtotal,
        staff_name: outbound.staffName,
        notes: outbound.notes,
      }, outbound.lines || []));

      await refetch();

      const stockLines = stockUpdate
        .map((u) => {
          if (u.notFound) return `• ${u.sku}: TIDAK DITEMUKAN`;
          if (u.shortfall > 0) return `• ${u.sku}: ${u.before} → ${u.after} (kurang ${u.shortfall})`;
          return `• ${u.sku}: ${u.before} → ${u.after} (−${u.reduced})`;
        })
        .join('\n');

      let alertMsg = `✅ Pengiriman dikonfirmasi!\n\nStok inventory dikurangi:\n${stockLines}`;
      if (task) {
        alertMsg += `\n\n📋 Task pengiriman dibuat: ${task.code}\nCek di menu Task Dispatch.`;
      }
      alert(alertMsg);
    } catch (err) {
      console.error('[outbound] ship error:', err);
      alert('Gagal kirim: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ============ LOADING ============

  if (loading && outbounds.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memuat data outbound...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nomor outbound atau customer..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'pending', label: 'Pending' },
            { id: 'shipped', label: 'Shipped' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                filter === f.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
          ⚠️ Error: {error}
        </div>
      )}

      {/* Info box */}
      <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 flex items-start gap-2">
        <Truck className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-brand-900">
          Outbound otomatis dibuat saat SO dibuat. Tugas staff gudang: assign driver + upload foto, terus konfirmasi kirim.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center mb-2">
            <PackageCheck className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Total Outbound</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            {outbounds.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mb-2">
            <Send className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Shipped</p>
          <p className="text-xl font-bold text-emerald-600 mt-1 tabular-nums">
            {outbounds.filter((o) => o.status === 'Shipped').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Pending</p>
          <p className="text-xl font-bold text-amber-600 mt-1 tabular-nums">
            {outbounds.filter((o) => o.status === 'Pending').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-2">
            <Package className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Total Qty</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            {outbounds.reduce((s, o) => s + (o.totalQty || 0), 0)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase w-8"></th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Outbound ID</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Customer</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Driver</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Tanggal</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Qty</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Total</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Foto</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-5 py-12 text-center text-slate-500 text-xs">
                  {outbounds.length === 0
                    ? 'Belum ada outbound. Bikin SO dulu di menu Sales Orders.'
                    : 'Tidak ada outbound yang cocok dengan filter'}
                </td>
              </tr>
            )}
            {filtered.map((out) => (
              <tr key={out.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <button
                    onClick={() => setExpanded(expanded === out.id ? null : out.id)}
                    className="w-6 h-6 rounded hover:bg-slate-100 inline-flex items-center justify-center"
                  >
                    {expanded === out.id
                      ? <ChevronUp className="w-4 h-4 text-slate-500" />
                      : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                </td>
                <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{out.id}</td>
                <td className="px-5 py-3 font-medium text-slate-900">{out.customer}</td>
                <td className="px-5 py-3 text-slate-700 text-xs">{out.driver || '-'}</td>
                <td className="px-5 py-3">
                  <p className="text-slate-700">{formatDate(out.date)}</p>
                  <p className="text-[10px] text-slate-500">{out.time}</p>
                </td>
                <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900">
                  {out.totalQty}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                  {formatRupiah(out.subtotal)}
                </td>
                <td className="px-5 py-3 text-center">
                  {out.photos.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                      <Camera className="w-3.5 h-3.5" /> {out.photos.length}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <Badge variant={out.status === 'Shipped' ? 'success' : 'warning'}>
                    {out.status}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  {out.status === 'Pending' && !out.driver && (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={User}
                      onClick={() => setProcessTarget(out)}
                    >
                      Proses
                    </Button>
                  )}
                  {out.status === 'Pending' && out.driver && (
                    <Button
                      size="sm"
                      variant="success"
                      icon={Send}
                      onClick={() => handleShip(out)}
                      disabled={actionLoading}
                    >
                      Kirim
                    </Button>
                  )}
                  {out.status === 'Shipped' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Eye}
                      onClick={() => setExpanded(expanded === out.id ? null : out.id)}
                    >
                      Detail
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Proses Outbound */}
      <Modal
        open={!!processTarget}
        onClose={() => setProcessTarget(null)}
        title="Proses Outbound"
        subtitle={processTarget ? `${processTarget.id} — ${processTarget.customer}` : ''}
        size="lg"
      >
        {processTarget && (
          <ProcessOutboundForm
            outbound={processTarget}
            onSave={handleProcess}
            onCancel={() => setProcessTarget(null)}
            loading={actionLoading}
          />
        )}
      </Modal>
    </div>
  );
}

// ============ FORM PROSES OUTBOUND ============

function ProcessOutboundForm({ outbound, onSave, onCancel, loading }) {
  const { drivers, loading: driversLoading } = useDrivers();
  const [driverId, setDriverId] = useState('');
  const [notes, setNotes] = useState(outbound.notes || '');
  const [photos, setPhotos] = useState([]);

  const driver = drivers.find((d) => d.id === driverId);
  const canSave = driverId && photos.length > 0;

  const handleSave = () => {
    if (!driver) return;
    onSave(outbound.uuid, {
      driverId: driver.id,
      driverName: driver.full_name,
      staffName: null,
      photos,
      notes: notes.trim() || null,
    });
  };

  const totalHarga = (outbound.lines || []).reduce(
    (s, l) => s + (l.qty || 0) * (l.price || 0),
    0
  );

  return (
    <div className="space-y-5">
      {/* Info SO */}
      <div className="bg-slate-50 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-slate-500 font-medium mb-0.5">Customer</p>
            <p className="text-slate-900 font-semibold">{outbound.customer}</p>
          </div>
          <div>
            <p className="text-slate-500 font-medium mb-0.5">Terkait SO</p>
            <p className="text-slate-900 font-mono text-xs">{outbound.soId || '-'}</p>
          </div>
        </div>

        {outbound.customerAddress && (
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Alamat Kirim</p>
                <p className="text-xs text-slate-900">{outbound.customerAddress}</p>
              </div>
            </div>
          </div>
        )}

        {outbound.customerPhone && (
          <div className="pt-2 border-t border-slate-200">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Telepon</p>
            <p className="text-xs text-slate-900">{outbound.customerPhone}</p>
          </div>
        )}
      </div>

      {/* Driver Select */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Driver <span className="text-red-500">*</span>
        </label>
        {driversLoading ? (
          <div className="p-3 text-center text-xs text-slate-500">Memuat driver...</div>
        ) : drivers.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            ⚠️ Belum ada driver. Bikin dulu di Manajemen Pekerja dengan role "worker".
          </div>
        ) : (
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">-- Pilih driver --</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name} {d.position ? `· ${d.position}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* SKU Table — Read-only */}
      <div>
        <label className="text-xs font-semibold text-slate-700 mb-2 block">
          Barang Dikirim (dari SO)
        </label>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">SKU</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Produk</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-20">Qty</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-28">Harga</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-32">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(outbound.lines || []).map((line, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">{line.sku}</td>
                  <td className="px-3 py-2 text-slate-900">{line.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-900 font-semibold">
                    {line.qty} {line.unit}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                    {formatRupiah(line.price)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-900">
                    {formatRupiah((line.qty || 0) * (line.price || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td colSpan={4} className="px-3 py-3 text-right text-xs font-semibold text-slate-600">
                  TOTAL
                </td>
                <td className="px-3 py-3 text-right font-bold text-slate-900 tabular-nums">
                  {formatRupiah(totalHarga)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Photo Uploader */}
      <PhotoUploader
        photos={photos}
        onChange={setPhotos}
        label="Foto Barang Sebelum Kirim"
        required
        maxPhotos={6}
        helpText="Foto barang sebelum packing sebagai bukti"
      />

      {/* Notes */}
      <div>
        <label className="text-xs font-semibold text-slate-700 mb-2 block">
          Catatan (opsional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Contoh: Barang sudah dicek, packing aman"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Batal
        </Button>
        <Button icon={CheckCircle2} onClick={handleSave} disabled={!canSave || loading}>
          {loading ? 'Menyimpan...' : 'Simpan & Siap Kirim'}
        </Button>
      </div>
    </div>
  );
}