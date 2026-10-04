// src/wms/views/OutboundView.jsx
import React, { useState, useMemo, Fragment } from 'react';
import {
  Search, Plus, X, ChevronDown, ChevronUp, Camera, CheckCircle2,
  PackageCheck, Image as ImageIcon, Eye, Package, Clock, Loader, Send,
} from 'lucide-react';
import { cn, Badge, Button, Modal } from '../../components/shared';
import { SALES_ORDERS } from '../../lib/mockData';
import PhotoUploader from './PhotoUploader';
import { reduceStockFromOutbound, validateStock } from '../../lib/inventoryStore';
import { useOutbound } from '../../hooks/useOutbound';
import { uploadPhotos } from '../../lib/storageHelpers';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

const DRIVERS = [
  { id: 'EMP-2023-0147', name: 'Budi Santoso' },
  { id: 'EMP-2023-0203', name: 'Andi Wijaya' },
  { id: 'EMP-2022-0089', name: 'Rudi Hartono' },
];

export default function OutboundView() {
  const { outbounds, loading, error, refetch } = useOutbound();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [detailTarget, setDetailTarget] = useState(null);
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

  // ============ CREATE ============

  const handleCreate = async (data) => {
    if (!isSupabaseEnabled()) {
      alert('Supabase tidak aktif');
      return;
    }

    setActionLoading(true);
    try {
      // 1. Upload foto ke Storage
      console.log('[outbound] uploading photos...');
      const photoUrls = await uploadPhotos('outbound-photos', data.photos);

      // 2. Insert header
      const { data: header, error: hErr } = await supabase
        .from('outbound')
        .insert({
          code: data.code,
          date: data.date,
          time: data.time,
          customer: data.customer,
          so_id: data.soId,
          driver: data.driver,
          staff_name: data.staffName,
          items: data.items,
          total_qty: data.totalQty,
          photos: photoUrls,
          notes: data.notes,
          status: 'Pending',
        })
        .select()
        .single();

      if (hErr) throw hErr;

      // 3. Insert lines
      const linesPayload = data.lines.map((l) => ({
        outbound_id: header.id,
        sku: l.sku,
        name: l.name,
        qty: l.qty,
        unit: l.unit || 'dus',
      }));

      const { error: lErr } = await supabase
        .from('outbound_lines')
        .insert(linesPayload);

      if (lErr) throw lErr;

      await refetch();
      setShowForm(false);
      alert('✅ Outbound berhasil disimpan');
    } catch (err) {
      console.error('[outbound] create error:', err);
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ============ SHIP ============

  const handleShip = async (id) => {
    const outbound = outbounds.find((o) => o.id === id);
    if (!outbound) return;

    setActionLoading(true);
    try {
      // 1. Validasi stok
      const issues = await validateStock(outbound.lines);

      if (issues.length > 0) {
        const msg = issues
          .map((i) => `• ${i.sku} (${i.name})\n  Butuh: ${i.needed} · Tersedia: ${i.available}`)
          .join('\n\n');
        const proceed = confirm(
          `⚠️ STOK TIDAK MENCUKUPI\n\n${msg}\n\nLanjutkan kirim?`
        );
        if (!proceed) {
          setActionLoading(false);
          return;
        }
      }

      // 2. Kurangi stok inventory
      const stockUpdate = await reduceStockFromOutbound(outbound.lines, {
        outboundId: outbound.id,
        date: outbound.date,
      });

      // 3. Update status di DB
      const { error } = await supabase
        .from('outbound')
        .update({
          status: 'Shipped',
          shipped_at: new Date().toISOString(),
        })
        .eq('id', outbound.uuid);

      if (error) throw error;

      await refetch();
      setDetailTarget(null);

      const lines = stockUpdate
        .map((u) => {
          if (u.notFound) return `• ${u.sku}: TIDAK DITEMUKAN`;
          if (u.shortfall > 0) return `• ${u.sku}: ${u.before} → ${u.after} (kurang ${u.shortfall})`;
          return `• ${u.sku}: ${u.before} → ${u.after} (−${u.reduced})`;
        })
        .join('\n');
      alert(`✅ Pengiriman dikonfirmasi!\n\nStok inventory dikurangi:\n${lines}`);
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
          <Button icon={Plus} onClick={() => setShowForm(true)}>
            Barang Keluar
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
          ⚠️ Error: {error}
        </div>
      )}

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
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Foto</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center text-slate-500 text-xs">
                  {outbounds.length === 0
                    ? 'Belum ada data outbound. Klik "Barang Keluar" untuk mulai.'
                    : 'Tidak ada outbound yang cocok dengan filter'}
                </td>
              </tr>
            )}
            {filtered.map((out) => (
              <Fragment key={out.id}>
                <tr className="hover:bg-slate-50">
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
                  <td className="px-5 py-3 text-slate-700 text-xs">{out.driver}</td>
                  <td className="px-5 py-3">
                    <p className="text-slate-700">{formatDate(out.date)}</p>
                    <p className="text-[10px] text-slate-500">{out.time}</p>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900">
                    {out.totalQty}
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
                    <Button
                      size="sm"
                      variant={out.status === 'Pending' ? 'success' : 'secondary'}
                      icon={out.status === 'Pending' ? Send : Eye}
                      onClick={() => setDetailTarget(out)}
                    >
                      {out.status === 'Pending' ? 'Kirim' : 'Detail'}
                    </Button>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Barang Keluar (Outbound)"
        subtitle="Catat pengiriman barang ke customer"
        size="lg"
      >
        <OutboundForm
          onCreate={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={actionLoading}
        />
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title="Detail Outbound"
        subtitle={detailTarget ? detailTarget.id : ''}
        size="lg"
      >
        {detailTarget && (
          <OutboundDetail
            outbound={detailTarget}
            onShip={() => handleShip(detailTarget.id)}
            loading={actionLoading}
          />
        )}
      </Modal>
    </div>
  );
}

// ============ FORM ============

function OutboundForm({ onCreate, onCancel, loading }) {
  const [soId, setSoId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ sku: '', name: '', qty: 1, unit: 'dus' }]);
  const [photos, setPhotos] = useState([]);

  const so = SALES_ORDERS.find((s) => s.id === soId);

  const addLine = () => setLines([...lines, { sku: '', name: '', qty: 1, unit: 'dus' }]);
  const removeLine = (i) => setLines(lines.filter((_, x) => x !== i));
  const updateLine = (i, field, val) => {
    const next = [...lines];
    next[i][field] = val;
    setLines(next);
  };

  const canSave = photos.length > 0 && lines.some((l) => l.name) && (so || driverName);

  const handleSave = () => {
    const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0);
    const code = `OUT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    onCreate({
      code,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      customer: so ? so.customer : 'Customer Umum',
      soId: soId || null,
      driver: driverName || '-',
      staffName: 'Sari Wulandari',
      items: lines.filter((l) => l.name).length,
      totalQty,
      photos,
      notes: notes.trim() || null,
      lines: lines.filter((l) => l.name),
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Sales Order (opsional)
          </label>
          <select
            value={soId}
            onChange={(e) => setSoId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">-- Tanpa SO --</option>
            {SALES_ORDERS.map((s) => (
              <option key={s.id} value={s.id}>{s.id} - {s.customer}</option>
            ))}
          </select>
          {so && (
            <p className="text-[10px] text-slate-500 mt-1">Customer: {so.customer}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Driver <span className="text-red-500">*</span>
          </label>
          <select
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">-- Pilih driver --</option>
            {DRIVERS.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-700">Barang Dikirim</label>
          <Button size="sm" variant="secondary" icon={Plus} onClick={addLine}>Tambah</Button>
        </div>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">SKU</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Nama</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-20">Qty</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">
                    <input value={l.sku} onChange={(e) => updateLine(i, 'sku', e.target.value)}
                      placeholder="SKU-..." className="w-full text-xs font-mono border-0 focus:outline-none" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={l.name} onChange={(e) => updateLine(i, 'name', e.target.value)}
                      placeholder="Nama produk..." className="w-full text-sm border-0 focus:outline-none" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={l.qty} onChange={(e) => updateLine(i, 'qty', +e.target.value)}
                      className="w-full text-sm text-right border-0 focus:outline-none tabular-nums" />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button onClick={() => removeLine(i)} className="w-6 h-6 rounded hover:bg-red-50 inline-flex items-center justify-center">
                      <X className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PhotoUploader
        photos={photos}
        onChange={setPhotos}
        label="Foto Barang Sebelum Kirim"
        required
        maxPhotos={6}
        helpText="Foto barang sebelum packing sebagai bukti"
      />

      <div>
        <label className="text-xs font-semibold text-slate-700 mb-2 block">Catatan (opsional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Contoh: Barang sudah dicek, packing aman"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>Batal</Button>
        <Button icon={CheckCircle2} onClick={handleSave} disabled={!canSave || loading}>
          {loading ? 'Menyimpan...' : 'Simpan Outbound'}
        </Button>
      </div>
    </div>
  );
}

// ============ DETAIL ============

function OutboundDetail({ outbound, onShip, loading }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-slate-500 font-medium mb-1">Customer</p>
          <p className="text-slate-900 font-semibold">{outbound.customer}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-slate-500 font-medium mb-1">Tanggal Kirim</p>
          <p className="text-slate-900 font-semibold">{formatDate(outbound.date)} · {outbound.time}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-slate-500 font-medium mb-1">Driver</p>
          <p className="text-slate-900 font-semibold">{outbound.driver}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-slate-500 font-medium mb-1">Staff Packing</p>
          <p className="text-slate-900 font-semibold">{outbound.staffName}</p>
        </div>
        {outbound.soId && (
          <div className="bg-slate-50 rounded-lg p-3 col-span-2">
            <p className="text-slate-500 font-medium mb-1">Terkait Sales Order</p>
            <p className="text-slate-900 font-mono font-semibold">{outbound.soId}</p>
          </div>
        )}
      </div>

      {outbound.photos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" /> Foto Barang ({outbound.photos.length})
          </p>
          <div className="grid grid-cols-4 gap-2">
            {outbound.photos.map((url, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                {url ? (
                  <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-slate-700 mb-2">Daftar Barang</p>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2 font-semibold text-slate-600">SKU</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-600">Produk</th>
                <th className="text-right px-4 py-2 font-semibold text-slate-600">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {outbound.lines.map((line, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 font-mono text-slate-600">{line.sku}</td>
                  <td className="px-4 py-2 text-slate-900">{line.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-700">{line.qty} {line.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {outbound.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-900 mb-1">Catatan</p>
          <p className="text-xs text-amber-800">{outbound.notes}</p>
        </div>
      )}

      {outbound.status === 'Pending' && (
        <>
          <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 flex items-start gap-2">
            <Send className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-brand-900 mb-0.5">Siap dikirim</p>
              <p className="text-[11px] text-brand-700">
                Klik "Konfirmasi Kirim" untuk mengurangi {outbound.totalQty} unit dari inventory.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="success" icon={Send} onClick={onShip} disabled={loading}>
              {loading ? 'Memproses...' : 'Konfirmasi Kirim & Update Stok'}
            </Button>
          </div>
        </>
      )}

      {outbound.status === 'Shipped' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-emerald-900 mb-0.5">Sudah dikirim</p>
            <p className="text-[11px] text-emerald-700">Stok inventory sudah dikurangi otomatis.</p>
          </div>
        </div>
      )}
    </div>
  );
}