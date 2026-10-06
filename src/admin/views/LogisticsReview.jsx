// src/admin/views/LogisticsReview.jsx
// ============================================
// Review Logistik — read-only view dari WMS
// Inbound + Outbound + Pengiriman (REALTIME + FOTO)
// ============================================

import React, { useState, useEffect, useMemo, Fragment } from 'react';
import {
  Search, ChevronDown, ChevronUp, Camera, CheckCircle2, PackageCheck,
  Truck, User, Calendar, Image as ImageIcon, Eye, AlertTriangle,
  Package, Clock, PackagePlus, PackageMinus, Send, Activity,
  ArrowDownToLine, ArrowUpFromLine, Loader,
} from 'lucide-react';
import { cn, Badge, Button, Modal } from '../../components/shared';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';

// ============ HELPERS ============

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTime(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit',
  });
}

function formatRupiah(n) {
  if (!n && n !== 0) return 'Rp 0';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

// Helper: ekstrak URL dari berbagai format photo
function getPhotoUrl(photo) {
  if (!photo) return null;
  if (typeof photo === 'string') return photo;
  if (photo?.url) return photo.url;
  if (photo?.publicUrl) return photo.publicUrl;
  if (photo?.src) return photo.src;
  return null;
}

// ============ MAIN COMPONENT ============

export default function LogisticsReview() {
  const [tab, setTab] = useState('inbound');
  const [q, setQ] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  const [inboundData, setInboundData] = useState([]);
  const [outboundData, setOutboundData] = useState([]);

  // ============ FETCH ============
  const fetchLogistics = async () => {
    if (!isSupabaseEnabled()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [inbRes, outRes] = await Promise.all([
        supabase
          .from('inbound')
          .select('*, inbound_lines(*)')
          .order('created_at', { ascending: false }),
        supabase
          .from('outbound')
          .select('*, outbound_lines(*)')
          .order('created_at', { ascending: false }),
      ]);

      if (inbRes.error) console.error('[logistics] inbound error:', inbRes.error);
      if (outRes.error) console.error('[logistics] outbound error:', outRes.error);

      setInboundData((inbRes.data || []).map((i) => ({
        id: i.code || i.id,
        supplier: i.supplier_name || i.supplier || '-',
        date: i.date,
        time: formatTime(i.created_at),
        items: i.inbound_lines?.length || 0,
        totalQty: (i.inbound_lines || []).reduce((s, l) => s + Number(l.qty || 0), 0),
        photos: i.photos || [],
        status: i.status || 'Pending',
        staffName: i.staff_name || i.received_by || '-',
        poId: i.po_id || i.po_code || null,
        notes: i.notes,
        lines: (i.inbound_lines || []).map((l) => ({
          sku: l.sku,
          name: l.name || l.product_name,
          qty: l.qty,
          unit: l.unit,
        })),
      })));

      setOutboundData((outRes.data || []).map((o) => ({
        id: o.code || o.id,
        customer: o.customer_name || o.customer || '-',
        driver: o.driver_name || o.driver || '-',
        date: o.date,
        time: formatTime(o.created_at),
        totalQty: (o.outbound_lines || []).reduce((s, l) => s + Number(l.qty || 0), 0),
        photos: o.photos || [],
        status: o.status || 'Pending',
        staffName: o.staff_name || o.packed_by || '-',
        soId: o.so_id || o.so_code || null,
        notes: o.notes,
        lines: (o.outbound_lines || []).map((l) => ({
          sku: l.sku,
          name: l.name || l.product_name,
          qty: l.qty,
          unit: l.unit,
        })),
      })));
    } catch (err) {
      console.error('[logistics] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============ FETCH + REALTIME ============
  useEffect(() => {
    fetchLogistics();

    if (!isSupabaseEnabled()) return;

    const channel = supabase
      .channel('logistics-review-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inbound' },
        () => fetchLogistics()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'outbound' },
        () => fetchLogistics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ============ SUMMARY ============
  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const inboundToday = inboundData.filter((i) => i.date === today);
    const outboundToday = outboundData.filter((o) => o.date === today);

    return {
      inboundTotal: inboundData.length,
      inboundToday: inboundToday.length,
      inboundQty: inboundData.reduce((s, i) => s + i.totalQty, 0),
      outboundTotal: outboundData.length,
      outboundToday: outboundToday.length,
      outboundQty: outboundData.reduce((s, o) => s + o.totalQty, 0),
      pendingInbound: inboundData.filter((i) => i.status === 'Pending').length,
      pendingOutbound: outboundData.filter((o) => o.status === 'Pending').length,
    };
  }, [inboundData, outboundData]);

  // ============ FILTER ============
  const filteredInbound = useMemo(() => {
    return inboundData.filter((i) => {
      const matchQ =
        i.id.toLowerCase().includes(q.toLowerCase()) ||
        i.supplier.toLowerCase().includes(q.toLowerCase());
      if (dateFilter === 'today') return matchQ && i.date === new Date().toISOString().slice(0, 10);
      if (dateFilter === 'week') {
        const d = new Date(i.date);
        const now = new Date();
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        return matchQ && diff <= 7;
      }
      return matchQ;
    });
  }, [q, dateFilter, inboundData]);

  const filteredOutbound = useMemo(() => {
    return outboundData.filter((o) => {
      const matchQ =
        o.id.toLowerCase().includes(q.toLowerCase()) ||
        o.customer.toLowerCase().includes(q.toLowerCase());
      if (dateFilter === 'today') return matchQ && o.date === new Date().toISOString().slice(0, 10);
      if (dateFilter === 'week') {
        const d = new Date(o.date);
        const now = new Date();
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        return matchQ && diff <= 7;
      }
      return matchQ;
    });
  }, [q, dateFilter, outboundData]);

  if (loading && inboundData.length === 0 && outboundData.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memuat data logistik...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
              <ArrowDownToLine className="w-4 h-4 text-indigo-600" />
            </div>
            <Badge variant="info">Inbound</Badge>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {summary.inboundToday}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary.inboundTotal} total · {summary.inboundQty.toLocaleString('id-ID')} qty
          </p>
          {summary.pendingInbound > 0 && (
            <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-amber-600">
              <Clock className="w-3 h-3" />
              {summary.pendingInbound} pending verifikasi
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ArrowUpFromLine className="w-4 h-4 text-emerald-600" />
            </div>
            <Badge variant="success">Outbound</Badge>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {summary.outboundToday}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary.outboundTotal} total · {summary.outboundQty.toLocaleString('id-ID')} qty
          </p>
          {summary.pendingOutbound > 0 && (
            <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-amber-600">
              <Clock className="w-3 h-3" />
              {summary.pendingOutbound} pending kirim
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <Activity className="w-4 h-4 text-slate-600" />
            </div>
            <Badge variant="neutral">Rasio</Badge>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {summary.inboundTotal + summary.outboundTotal}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Total transaksi logistik</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <Badge variant="danger">Pending</Badge>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-1 tabular-nums">
            {summary.pendingInbound + summary.pendingOutbound}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Perlu tindakan</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          <button
            onClick={() => { setTab('inbound'); setExpanded(null); }}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2',
              tab === 'inbound'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <PackagePlus className="w-4 h-4" />
            Barang Masuk
            <Badge variant="neutral">{inboundData.length}</Badge>
          </button>
          <button
            onClick={() => { setTab('outbound'); setExpanded(null); }}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2',
              tab === 'outbound'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <PackageMinus className="w-4 h-4" />
            Barang Keluar
            <Badge variant="neutral">{outboundData.length}</Badge>
          </button>
          <button
            onClick={() => { setTab('shipping'); setExpanded(null); }}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2',
              tab === 'shipping'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <Send className="w-4 h-4" />
            Pengiriman
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              tab === 'inbound' ? 'Cari nomor inbound atau supplier...' :
              tab === 'outbound' ? 'Cari nomor outbound atau customer...' :
              'Cari driver atau customer...'
            }
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'today', label: 'Hari Ini' },
            { id: 'week', label: '7 Hari' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                dateFilter === f.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === 'inbound' && (
        <InboundTable
          data={filteredInbound}
          expanded={expanded}
          setExpanded={setExpanded}
          onDetail={setDetailTarget}
        />
      )}
      {tab === 'outbound' && (
        <OutboundTable
          data={filteredOutbound}
          expanded={expanded}
          setExpanded={setExpanded}
          onDetail={setDetailTarget}
        />
      )}
      {tab === 'shipping' && (
        <ShippingTable
          data={filteredOutbound}
          onDetail={setDetailTarget}
        />
      )}

      {/* Detail Modal */}
      <Modal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title={
          detailTarget?.type === 'inbound' ? 'Detail Barang Masuk' :
          detailTarget?.type === 'shipping' ? 'Detail Pengiriman' :
          'Detail Barang Keluar'
        }
        subtitle={detailTarget?.data?.id || ''}
        size="lg"
      >
        {detailTarget && <DetailPanel target={detailTarget} />}
      </Modal>
    </div>
  );
}

// ============ INBOUND TABLE ============

function InboundTable({ data, expanded, setExpanded, onDetail }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase w-8"></th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Inbound ID</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Supplier</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Tanggal</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Items</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Qty</th>
            <th className="text-center px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Foto</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.length === 0 && (
            <tr>
              <td colSpan={9} className="px-5 py-12 text-center text-slate-500 text-xs">
                Tidak ada data
              </td>
            </tr>
          )}
          {data.map((inb) => (
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
                  <p className="text-slate-700">{formatDate(inb.date)}</p>
                  <p className="text-[10px] text-slate-500">{inb.time}</p>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-700">{inb.items}</td>
                <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900">
                  {inb.totalQty}
                </td>
                <td className="px-5 py-3">
                  {inb.photos.length > 0 ? (
                    <div className="flex items-center justify-center gap-1">
                      {inb.photos.slice(0, 3).map((photo, idx) => {
                        const url = getPhotoUrl(photo);
                        if (!url) return null;
                        return (
                          <img
                            key={idx}
                            src={url}
                            alt={`Foto ${idx + 1}`}
                            className="w-8 h-8 rounded object-cover border border-slate-200 cursor-pointer hover:scale-110 transition-transform"
                            onClick={() => window.open(url, '_blank')}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        );
                      })}
                      {inb.photos.length > 3 && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          +{inb.photos.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 text-center block">—</span>
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
                    variant="secondary"
                    icon={Eye}
                    onClick={() => onDetail({ type: 'inbound', data: inb })}
                  >
                    Detail
                  </Button>
                </td>
              </tr>
              {expanded === inb.id && (
                <tr className="bg-slate-50">
                  <td colSpan={9} className="px-5 py-4">
                    <div className="grid grid-cols-3 gap-4 text-xs mb-3">
                      <div className="bg-white rounded-lg border border-slate-200 p-3">
                        <p className="text-slate-500 font-medium mb-1">Staff Penerima</p>
                        <p className="text-slate-900 font-semibold">{inb.staffName}</p>
                      </div>
                      <div className="bg-white rounded-lg border border-slate-200 p-3">
                        <p className="text-slate-500 font-medium mb-1">Terkait PO</p>
                        <p className="text-slate-900 font-mono text-xs font-semibold">
                          {inb.poId || '—'}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border border-slate-200 p-3">
                        <p className="text-slate-500 font-medium mb-1">Catatan</p>
                        <p className="text-slate-900">{inb.notes || '—'}</p>
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
  );
}

// ============ OUTBOUND TABLE ============

function OutboundTable({ data, expanded, setExpanded, onDetail }) {
  return (
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
          {data.length === 0 && (
            <tr>
              <td colSpan={9} className="px-5 py-12 text-center text-slate-500 text-xs">
                Tidak ada data
              </td>
            </tr>
          )}
          {data.map((out) => (
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
                <td className="px-5 py-3">
                  {out.photos.length > 0 ? (
                    <div className="flex items-center justify-center gap-1">
                      {out.photos.slice(0, 3).map((photo, idx) => {
                        const url = getPhotoUrl(photo);
                        if (!url) return null;
                        return (
                          <img
                            key={idx}
                            src={url}
                            alt={`Foto ${idx + 1}`}
                            className="w-8 h-8 rounded object-cover border border-slate-200 cursor-pointer hover:scale-110 transition-transform"
                            onClick={() => window.open(url, '_blank')}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        );
                      })}
                      {out.photos.length > 3 && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          +{out.photos.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 text-center block">—</span>
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
                    variant="secondary"
                    icon={Eye}
                    onClick={() => onDetail({ type: 'outbound', data: out })}
                  >
                    Detail
                  </Button>
                </td>
              </tr>
              {expanded === out.id && (
                <tr className="bg-slate-50">
                  <td colSpan={9} className="px-5 py-4">
                    <div className="grid grid-cols-3 gap-4 text-xs mb-3">
                      <div className="bg-white rounded-lg border border-slate-200 p-3">
                        <p className="text-slate-500 font-medium mb-1">Staff Packing</p>
                        <p className="text-slate-900 font-semibold">{out.staffName}</p>
                      </div>
                      <div className="bg-white rounded-lg border border-slate-200 p-3">
                        <p className="text-slate-500 font-medium mb-1">Terkait SO</p>
                        <p className="text-slate-900 font-mono text-xs font-semibold">
                          {out.soId || '—'}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border border-slate-200 p-3">
                        <p className="text-slate-500 font-medium mb-1">Catatan</p>
                        <p className="text-slate-900">{out.notes || '—'}</p>
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
  );
}

// ============ SHIPPING TABLE ============

function ShippingTable({ data, onDetail }) {
  const drivers = useMemo(() => {
    const byDriver = {};
    data.forEach((o) => {
      if (!byDriver[o.driver]) {
        byDriver[o.driver] = {
          name: o.driver,
          shipments: [],
          totalQty: 0,
          shipped: 0,
          pending: 0,
        };
      }
      byDriver[o.driver].shipments.push(o);
      byDriver[o.driver].totalQty += o.totalQty;
      if (o.status === 'Shipped') byDriver[o.driver].shipped++;
      if (o.status === 'Pending') byDriver[o.driver].pending++;
    });
    return Object.values(byDriver);
  }, [data]);

  return (
    <div className="grid grid-cols-2 gap-4">
      {drivers.length === 0 && (
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
          Tidak ada data pengiriman
        </div>
      )}
      {drivers.map((d) => (
        <div key={d.name} className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">
              {d.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">{d.name}</p>
              <p className="text-[10px] text-slate-500">{d.shipments.length} pengiriman</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-medium uppercase">Total Qty</p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">{d.totalQty}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-emerald-600 font-medium uppercase">Shipped</p>
              <p className="text-lg font-bold text-emerald-600 tabular-nums">{d.shipped}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-amber-600 font-medium uppercase">Pending</p>
              <p className="text-lg font-bold text-amber-600 tabular-nums">{d.pending}</p>
            </div>
          </div>

          <div className="space-y-2">
            {d.shipments.slice(0, 3).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer"
                onClick={() => onDetail({ type: 'shipping', data: s })}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">{s.customer}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{s.id}</p>
                </div>
                <Badge variant={s.status === 'Shipped' ? 'success' : 'warning'}>
                  {s.status}
                </Badge>
              </div>
            ))}
            {d.shipments.length > 3 && (
              <p className="text-[10px] text-slate-500 text-center pt-1">
                +{d.shipments.length - 3} pengiriman lainnya
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ DETAIL PANEL ============

function DetailPanel({ target }) {
  const { type, data } = target;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-xs">
        {type === 'inbound' && (
          <>
            <InfoBox label="Supplier" value={data.supplier} />
            <InfoBox label="Tanggal" value={`${formatDate(data.date)} · ${data.time}`} />
            <InfoBox label="Staff Penerima" value={data.staffName} />
            <InfoBox label="Terkait PO" value={data.poId || '—'} mono />
          </>
        )}
        {type === 'outbound' && (
          <>
            <InfoBox label="Customer" value={data.customer} />
            <InfoBox label="Tanggal" value={`${formatDate(data.date)} · ${data.time}`} />
            <InfoBox label="Driver" value={data.driver} />
            <InfoBox label="Staff Packing" value={data.staffName} />
            <InfoBox label="Terkait SO" value={data.soId || '—'} mono />
            <InfoBox label="Status" value={data.status} />
          </>
        )}
        {type === 'shipping' && (
          <>
            <InfoBox label="Customer" value={data.customer} />
            <InfoBox label="Driver" value={data.driver} />
            <InfoBox label="Tanggal Kirim" value={`${formatDate(data.date)} · ${data.time}`} />
            <InfoBox label="Terkait SO" value={data.soId || '—'} mono />
            <InfoBox label="Staff Packing" value={data.staffName} />
            <InfoBox label="Status" value={data.status} />
          </>
        )}
      </div>

      {/* FOTO BARANG */}
      {data.photos && data.photos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" /> Foto Barang ({data.photos.length})
          </p>
          <div className="grid grid-cols-3 gap-3">
            {data.photos.map((photo, i) => {
              const url = getPhotoUrl(photo);
              if (!url) return null;

              return (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100 block hover:ring-2 hover:ring-indigo-500 transition-all"
                >
                  <img
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.parentElement.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center bg-slate-100">
                          <span class="text-[10px] text-slate-400">Gagal load</span>
                        </div>
                      `;
                    }}
                  />
                  <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                    {i + 1}/{data.photos.length}
                  </div>
                </a>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            💡 Klik foto untuk lihat ukuran penuh
          </p>
        </div>
      )}

      {data.lines && data.lines.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-2">Daftar Barang</p>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2 font-semibold text-slate-600">SKU</th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-600">Produk</th>
                  <th className="text-right px-4 py-2 font-semibold text-slate-600">Qty</th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-600">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.lines.map((line, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-mono text-slate-600">{line.sku}</td>
                    <td className="px-4 py-2 text-slate-900">{line.name}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-700">{line.qty}</td>
                    <td className="px-4 py-2 text-slate-600">{line.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-900 mb-1">Catatan</p>
          <p className="text-xs text-amber-800">{data.notes}</p>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-2">
        <Eye className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-slate-600">
          View ini <strong>read-only</strong>. Untuk mengubah data, gunakan aplikasi WMS.
        </p>
      </div>
    </div>
  );
}

function InfoBox({ label, value, mono = false }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-slate-500 font-medium mb-1">{label}</p>
      <p className={cn('text-slate-900 font-semibold', mono && 'font-mono')}>{value}</p>
    </div>
  );
}