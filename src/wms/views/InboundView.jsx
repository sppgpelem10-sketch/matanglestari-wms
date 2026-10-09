// src/wms/views/InboundView.jsx
import React, { useState, useEffect, useMemo, Fragment } from 'react';
import {
  Search, Plus, X, ChevronDown, ChevronUp, Camera, CheckCircle2,
  PackageCheck, Image as ImageIcon, Eye, Package, Clock, Loader,
  Link as LinkIcon, AlertTriangle, Info,
} from 'lucide-react';
import { cn, Badge, Button, Modal } from '../../components/shared';
import PhotoUploader from './PhotoUploader';
import { addStockFromInbound } from '../../lib/inventoryStore';
import { useInbound } from '../../hooks/useInbound';
import { uploadPhotos } from '../../lib/storageHelpers';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { kirimLaporan, formatInbound } from '../../lib/telegram';

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

export default function InboundView() {
  const { inbounds, loading, error, refetch } = useInbound();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [detailTarget, setDetailTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const filtered = useMemo(() => {
    return inbounds.filter((i) => {
      const matchQ =
        i.id.toLowerCase().includes(q.toLowerCase()) ||
        i.supplier.toLowerCase().includes(q.toLowerCase());
      if (filter === 'all') return matchQ;
      return matchQ && i.status.toLowerCase() === filter;
    });
  }, [inbounds, q, filter]);

  // ============ CREATE ============

  const handleCreate = async (data) => {
    if (!isSupabaseEnabled()) {
      alert('Supabase tidak aktif');
      return;
    }

    setActionLoading(true);
    try {
      // 1. Upload foto ke Storage
      console.log('[inbound] uploading photos...');
      const photoUrls = await uploadPhotos('inbound-photos', data.photos);

      // 2. Insert header
      const { data: header, error: hErr } = await supabase
        .from('inbound')
        .insert({
          code: data.code,
          date: data.date,
          time: data.time,
          supplier_id: data.supplierId,
          supplier_name: data.supplier,
          po_id: data.poId || null,
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
        inbound_id: header.id,
        sku: l.sku,
        name: l.name,
        qty: l.qty,
        unit: l.unit || 'dus',
      }));

      const { error: lErr } = await supabase
        .from('inbound_lines')
        .insert(linesPayload);

      if (lErr) throw lErr;

      // 4. Kalau terkait PO → update status PO jadi "Dikirim" (kalau masih Draft)
      if (data.poId) {
        await supabase
          .from('purchase_orders')
          .update({ status: 'Dikirim', updated_at: new Date().toISOString() })
          .eq('id', data.poId)
          .eq('status', 'Draft');
      }

      // 🔔 Kirim notif Telegram
      await kirimLaporan(formatInbound(header, linesPayload));

      await refetch();
      setShowForm(false);
      alert('✅ Inbound berhasil disimpan');
    } catch (err) {
      console.error('[inbound] create error:', err);
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ============ VERIFY ============

  const handleVerify = async (id) => {
    const inbound = inbounds.find((i) => i.id === id);
    if (!inbound) return;

    setActionLoading(true);
    try {
      // 1. Update stok inventory (auto-create SKU kalau belum ada)
      const stockUpdate = await addStockFromInbound(inbound.lines, {
        inboundId: inbound.id,
        date: inbound.date,
      });

      // 2. Update status di DB
      const { error } = await supabase
        .from('inbound')
        .update({
          status: 'Verified',
          verified_at: new Date().toISOString(),
        })
        .eq('id', inbound.uuid);

      if (error) throw error;

      // 3. Auto-update status PO (kalau inbound terkait PO)
      let poStatusMsg = '';
      if (inbound.poId) {
        const poStatus = await updatePoStatusFromInbound(inbound.poId);
        poStatusMsg = `\n\n📋 Status PO diupdate: ${poStatus}`;
      }

      await refetch();
      setDetailTarget(null);

      const lines = stockUpdate
        .map((u) => {
          if (u.isNew) return `• ${u.sku}: BARU (+${u.added})`;
          return `• ${u.sku}: ${u.before} → ${u.after} (+${u.added})`;
        })
        .join('\n');
      alert(`✅ Verifikasi berhasil!\n\nStok inventory bertambah:\n${lines}${poStatusMsg}`);
    } catch (err) {
      console.error('[inbound] verify error:', err);
      alert('Gagal verifikasi: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ============ UPDATE PO STATUS ============

  async function updatePoStatusFromInbound(poId) {
    try {
      // Ambil semua po_lines
      const { data: poLines } = await supabase
        .from('po_lines')
        .select('sku, qty')
        .eq('po_id', poId);

      if (!poLines || poLines.length === 0) return 'Tidak ada item PO';

      // Ambil semua inbound terkait PO ini yang sudah Verified
      const { data: inboundList } = await supabase
        .from('inbound')
        .select('id')
        .eq('po_id', poId)
        .eq('status', 'Verified');

      const inboundIds = (inboundList || []).map((i) => i.id);

      let inboundLines = [];
      if (inboundIds.length > 0) {
        const { data } = await supabase
          .from('inbound_lines')
          .select('sku, qty')
          .in('inbound_id', inboundIds);
        inboundLines = data || [];
      }

      // Hitung qty diterima per SKU
      const receivedBySku = {};
      inboundLines.forEach((l) => {
        receivedBySku[l.sku] = (receivedBySku[l.sku] || 0) + l.qty;
      });

      // Cek apakah semua SKU sudah terpenuhi
      const allFull = poLines.every(
        (pl) => (receivedBySku[pl.sku] || 0) >= pl.qty
      );
      const anyReceived = Object.keys(receivedBySku).length > 0;

      const newStatus = allFull ? 'Diterima' : anyReceived ? 'Dikirim' : 'Draft';

      await supabase
        .from('purchase_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', poId);

      return newStatus;
    } catch (err) {
      console.error('[inbound] update PO status error:', err);
      return 'Gagal update';
    }
  }

  // ============ LOADING ============

  if (loading && inbounds.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memuat data inbound...</p>
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
            placeholder="Cari nomor inbound atau supplier..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'pending', label: 'Pending' },
            { id: 'verified', label: 'Verified' },
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
            Barang Masuk
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
          <p className="text-xs text-slate-500 font-medium">Total Inbound</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            {inbounds.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Verified</p>
          <p className="text-xl font-bold text-emerald-600 mt-1 tabular-nums">
            {inbounds.filter((i) => i.status === 'Verified').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Pending</p>
          <p className="text-xl font-bold text-amber-600 mt-1 tabular-nums">
            {inbounds.filter((i) => i.status === 'Pending').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-2">
            <Package className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Total Qty</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            {inbounds.reduce((s, i) => s + (i.totalQty || 0), 0)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase w-8"></th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Inbound ID</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Supplier</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Terkait PO</th>
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
                  {inbounds.length === 0
                    ? 'Belum ada data inbound. Klik "Barang Masuk" untuk mulai.'
                    : 'Tidak ada inbound yang cocok dengan filter'}
                </td>
              </tr>
            )}
            {filtered.map((inb) => (
              <Fragment key={inb.id}>
                <tr className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setExpanded(expanded === inb.id ? null : inb.id)}
                      className="w-6 h-6 rounded hover:bg-slate-100 inline-flex items-center justify-center"
                    >
                      {expanded === inb.id
                        ? <ChevronUp className="w-4 h-4 text-slate-500" />
                        : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </button>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{inb.id}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{inb.supplier}</td>
                  <td className="px-5 py-3">
                    {inb.poId ? (
                      <span className="inline-flex items-center gap-1 text-xs font-mono text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                        <LinkIcon className="w-3 h-3" />
                        {inb.poId.slice(0, 8)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-slate-700">{formatDate(inb.date)}</p>
                    <p className="text-[10px] text-slate-500">{inb.time}</p>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900">
                    {inb.totalQty}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {inb.photos.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                        <Camera className="w-3.5 h-3.5" /> {inb.photos.length}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={inb.status === 'Verified' ? 'success' : 'warning'}>
                      {inb.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      size="sm"
                      variant={inb.status === 'Pending' ? 'success' : 'secondary'}
                      icon={inb.status === 'Pending' ? CheckCircle2 : Eye}
                      onClick={() => setDetailTarget(inb)}
                    >
                      {inb.status === 'Pending' ? 'Verifikasi' : 'Detail'}
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
        title="Barang Masuk (Inbound)"
        subtitle="Catat penerimaan barang dari supplier"
        size="lg"
      >
        <InboundForm
          onCreate={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={actionLoading}
        />
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title="Detail Inbound"
        subtitle={detailTarget ? detailTarget.id : ''}
        size="lg"
      >
        {detailTarget && (
          <InboundDetail
            inbound={detailTarget}
            onVerify={() => handleVerify(detailTarget.id)}
            loading={actionLoading}
          />
        )}
      </Modal>
    </div>
  );
}

// ============ FORM ============

function InboundForm({ onCreate, onCancel, loading }) {
  const [suppliers, setSuppliers] = useState([]);
  const [poList, setPoList] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [supplierId, setSupplierId] = useState('');
  const [poId, setPoId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ sku: '', name: '', qty: 1, unit: 'dus' }]);
  const [photos, setPhotos] = useState([]);

  // Load suppliers & PO dari Supabase
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSupabaseEnabled()) {
        setLoadingData(false);
        return;
      }
      try {
        const [supRes, poRes] = await Promise.all([
          supabase.from('suppliers').select('id, name').order('name'),
          supabase
            .from('purchase_orders')
            .select('id, code, supplier_id, supplier_name, status, date, expected_date, total, po_lines(sku, name, qty, unit, price)')
            .in('status', ['Draft', 'Dikirim'])
            .order('created_at', { ascending: false }),
        ]);
        if (!cancelled) {
          setSuppliers(supRes.data || []);
          setPoList(poRes.data || []);
        }
      } catch (err) {
        console.error('[inbound] load suppliers/PO error:', err);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const supplier = suppliers.find((s) => s.id === supplierId);
  const availablePOs = poList.filter((po) => po.supplier_id === supplierId);
  const selectedPO = poList.find((po) => po.id === poId);

  // Hitung sisa qty per SKU (kalau PO sudah pernah diterima sebagian)
  const [receivedBySku, setReceivedBySku] = useState({});
  useEffect(() => {
    let cancelled = false;
    async function loadReceived() {
      if (!poId || !isSupabaseEnabled()) {
        setReceivedBySku({});
        return;
      }
      try {
        const { data: inboundList } = await supabase
          .from('inbound')
          .select('id')
          .eq('po_id', poId)
          .eq('status', 'Verified');

        const ids = (inboundList || []).map((i) => i.id);
        if (ids.length === 0) {
          if (!cancelled) setReceivedBySku({});
          return;
        }

        const { data: linesData } = await supabase
          .from('inbound_lines')
          .select('sku, qty')
          .in('inbound_id', ids);

        const map = {};
        (linesData || []).forEach((l) => {
          map[l.sku] = (map[l.sku] || 0) + l.qty;
        });
        if (!cancelled) setReceivedBySku(map);
      } catch (err) {
        console.error('[inbound] load received error:', err);
        if (!cancelled) setReceivedBySku({});
      }
    }
    loadReceived();
    return () => { cancelled = true; };
  }, [poId]);

  // Saat PO dipilih → auto-load lines dari po_lines
  const handlePoChange = (newPoId) => {
    setPoId(newPoId);
    const po = poList.find((p) => p.id === newPoId);
    if (po?.po_lines && po.po_lines.length > 0) {
      const mapped = po.po_lines.map((pl) => {
        const received = receivedBySku[pl.sku] || 0;
        const remaining = Math.max(0, pl.qty - received);
        return {
          sku: pl.sku,
          name: pl.name,
          qty: remaining || pl.qty,
          unit: pl.unit || 'dus',
          _ordered: pl.qty,
          _received: received,
          _remaining: remaining,
        };
      });
      setLines(mapped);
    }
  };

  const addLine = () => setLines([...lines, { sku: '', name: '', qty: 1, unit: 'dus' }]);
  const removeLine = (i) => setLines(lines.filter((_, x) => x !== i));
  const updateLine = (i, field, val) => {
    const next = [...lines];
    next[i][field] = val;
    setLines(next);
  };

  const canSave = supplierId && photos.length > 0 && lines.some((l) => l.name);

  const handleSave = () => {
    const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0);
    const code = `INB-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    onCreate({
      code,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      supplier: supplier.name,
      supplierId: supplier.id,
      poId: poId || null,
      staffName: 'Sari Wulandari',
      items: lines.filter((l) => l.name).length,
      totalQty,
      photos,
      notes: notes.trim() || null,
      lines: lines
        .filter((l) => l.name)
        .map(({ sku, name, qty, unit }) => ({ sku, name, qty, unit })),
    });
  };

  return (
    <div className="space-y-5">
      {loadingData && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex items-center gap-2">
          <Loader className="w-3.5 h-3.5 animate-spin" />
          Memuat supplier & PO...
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Supplier <span className="text-red-500">*</span>
          </label>
          <select
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setPoId('');
              setLines([{ sku: '', name: '', qty: 1, unit: 'dus' }]);
            }}
            disabled={loadingData}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50"
          >
            <option value="">-- Pilih supplier --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Terkait PO (opsional)
          </label>
          <select
            value={poId}
            onChange={(e) => handlePoChange(e.target.value)}
            disabled={!supplierId || loadingData}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50"
          >
            <option value="">-- Tanpa PO --</option>
            {availablePOs.map((po) => (
              <option key={po.id} value={po.id}>
                {po.code} · {po.po_lines?.length || 0} item · {po.status}
              </option>
            ))}
          </select>
          {availablePOs.length === 0 && supplierId && !loadingData && (
            <p className="text-[10px] text-slate-500 mt-1">
              Tidak ada PO status Draft/Dikirim untuk supplier ini
            </p>
          )}
        </div>
      </div>

      {selectedPO && (
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
          <div className="text-[11px] text-brand-900">
            <p className="font-semibold mb-0.5">PO {selectedPO.code}</p>
            <p>
              Tanggal PO: {formatDate(selectedPO.date)} · Total: {formatRupiah(selectedPO.total)} · Status: {selectedPO.status}
            </p>
            <p className="mt-1">
              Item sudah di-load otomatis dari PO. Qty yang tampil = <b>sisa yang belum diterima</b>.
            </p>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-700">Barang Diterima</label>
          <Button size="sm" variant="secondary" icon={Plus} onClick={addLine}>Tambah</Button>
        </div>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">SKU</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Nama</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-24">Qty</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-slate-600 w-20">Sisa</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((l, i) => {
                const remaining = l._remaining ?? null;
                const overOrder = remaining !== null && l.qty > remaining;
                return (
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
                        className={cn(
                          'w-full text-sm text-right border-0 focus:outline-none tabular-nums',
                          overOrder && 'text-red-600 font-semibold'
                        )} />
                    </td>
                    <td className="px-3 py-2 text-center text-[10px] text-slate-500">
                      {remaining !== null ? (
                        <span className={cn(overOrder && 'text-red-600 font-semibold')}>
                          {remaining}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button onClick={() => removeLine(i)} className="w-6 h-6 rounded hover:bg-red-50 inline-flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PhotoUploader
        photos={photos}
        onChange={setPhotos}
        label="Foto Barang Diterima"
        required
        maxPhotos={6}
        helpText="Foto barang saat diterima sebagai bukti kondisi"
      />

      <div>
        <label className="text-xs font-semibold text-slate-700 mb-2 block">Catatan (opsional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Contoh: 2 dus rusak, sudah dicatat"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>Batal</Button>
        <Button icon={CheckCircle2} onClick={handleSave} disabled={!canSave || loading}>
          {loading ? 'Menyimpan...' : 'Simpan Inbound'}
        </Button>
      </div>
    </div>
  );
}

// ============ DETAIL ============

function InboundDetail({ inbound, onVerify, loading }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-slate-500 font-medium mb-1">Supplier</p>
          <p className="text-slate-900 font-semibold">{inbound.supplier}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-slate-500 font-medium mb-1">Tanggal Terima</p>
          <p className="text-slate-900 font-semibold">{formatDate(inbound.date)} · {inbound.time}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-slate-500 font-medium mb-1">Staff Penerima</p>
          <p className="text-slate-900 font-semibold">{inbound.staffName}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-slate-500 font-medium mb-1">Terkait PO</p>
          <p className="text-slate-900 font-mono font-semibold">{inbound.poId || '—'}</p>
        </div>
      </div>

      {inbound.photos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" /> Foto Barang ({inbound.photos.length})
          </p>
          <div className="grid grid-cols-4 gap-2">
            {inbound.photos.map((url, i) => (
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
              {inbound.lines.map((line, i) => (
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

      {inbound.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-900 mb-1">Catatan</p>
          <p className="text-xs text-amber-800">{inbound.notes}</p>
        </div>
      )}

      {inbound.status === 'Pending' && (
        <>
          <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 flex items-start gap-2">
            <PackageCheck className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-brand-900 mb-0.5">Siap diverifikasi</p>
              <p className="text-[11px] text-brand-700">
                Klik "Verifikasi" untuk menambahkan {inbound.totalQty} unit ke inventory
                {inbound.poId && ' + auto-update status PO'}.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="success" icon={CheckCircle2} onClick={onVerify} disabled={loading}>
              {loading ? 'Memproses...' : 'Verifikasi & Update Stok'}
            </Button>
          </div>
        </>
      )}

      {inbound.status === 'Verified' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-emerald-900 mb-0.5">Sudah diverifikasi</p>
            <p className="text-[11px] text-emerald-700">Stok inventory sudah ditambahkan otomatis.</p>
          </div>
        </div>
      )}
    </div>
  );
}