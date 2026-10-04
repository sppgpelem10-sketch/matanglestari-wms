// src/wms/WMSDashboard.jsx
import React, { useState, useMemo, Fragment } from 'react';
import {
  LayoutDashboard, Boxes, ShoppingCart, Truck, Send, Search, Plus,
  X, AlertTriangle, TrendingUp, DollarSign, Users, Activity,
  Check, FileText, Building2, ArrowUpRight, ArrowDownRight,
  MoreHorizontal, BarChart3, PackageCheck, Inbox, ChevronDown, ChevronUp,
  Printer, PackagePlus, PackageMinus,
} from 'lucide-react';
import {
  cn, Badge, Button, Input, Modal, Sidebar, TopBar,
} from '../components/shared';
import { useSuppliers } from '../hooks/useSuppliers';
import {
  PrintPurchaseOrder,
  PrintDeliveryNote,
} from '../components/DocumentTemplate';
import InboundView from './views/InboundView';
import OutboundView from './views/OutboundView';
import { useInventory } from '../hooks/useInventory';
import { adjustStock } from '../lib/inventoryStore';
import { usePurchaseOrders } from '../hooks/usePurchaseOrders';
import { useSalesOrders } from '../hooks/useSalesOrders';
import {
  createPurchaseOrder, updatePOStatus,
  createSalesOrder, updateSOStatus,
  generatePOCode, generateSOCode,
  createSupplier, generateSupplierCode,
} from '../lib/orderHelpers';

// ============ DASHBOARD OVERVIEW ============

function DashboardOverview() {
  const inventory = useInventory();

  const cards = [
    { label: 'Total SKU Aktif', value: inventory.length, icon: Boxes },
    { label: 'PO Pending', value: 0, icon: ShoppingCart },
    { label: 'SO Hari Ini', value: 0, icon: Truck },
    {
      label: 'Low Stock Alert',
      value: inventory.filter((i) => i.stock < 50).length,
      icon: AlertTriangle,
      danger: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center mb-3',
                c.danger ? 'bg-red-50' : 'bg-slate-50'
              )}>
                <Icon className={cn('w-4 h-4', c.danger ? 'text-red-600' : 'text-slate-600')} />
              </div>
              <p className="text-xs text-slate-500 font-medium">{c.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Activity className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-sm font-semibold text-slate-900">Aktivitas</p>
          <p className="text-xs text-slate-500 mt-1">Belum ada aktivitas terbaru</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Top 5 Stock</h3>
          <div className="space-y-3">
            {inventory.slice(0, 5).map((it) => (
              <div key={it.sku}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-slate-700 truncate flex-1 mr-2">{it.name}</p>
                  <p className="text-xs font-bold text-slate-900 tabular-nums flex-shrink-0">{it.stock}</p>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      it.stock < 50 ? 'bg-red-500' :
                      it.stock < 200 ? 'bg-amber-500' : 'bg-emerald-500'
                    )}
                    style={{ width: `${Math.min(100, (it.stock / 500) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {inventory.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">Belum ada data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ INVENTORY VIEW ============

function InventoryView() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const items = useInventory();
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustType, setAdjustType] = useState('add');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const matchQ = it.name.toLowerCase().includes(q.toLowerCase()) ||
        it.sku.toLowerCase().includes(q.toLowerCase());
      if (filter === 'low') return matchQ && it.stock < 50;
      if (filter === 'medium') return matchQ && it.stock >= 50 && it.stock < 200;
      if (filter === 'healthy') return matchQ && it.stock >= 200;
      return matchQ;
    });
  }, [items, q, filter]);

  const openAdjust = (item) => {
    setAdjustItem(item);
    setAdjustAmount(0);
    setAdjustType('add');
  };

  const applyAdjust = async () => {
    if (!adjustItem || !adjustAmount) return;
    setSaving(true);
    try {
      await adjustStock(adjustItem.sku, adjustAmount, adjustType);
      setAdjustItem(null);
      setAdjustAmount(0);
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getStockBadge = (stock) => {
    if (stock < 50) return <Badge variant="danger">Low</Badge>;
    if (stock < 200) return <Badge variant="warning">Medium</Badge>;
    return <Badge variant="success">Healthy</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari SKU atau nama barang..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'low', label: 'Low' },
            { id: 'medium', label: 'Medium' },
            { id: 'healthy', label: 'Healthy' },
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

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">SKU</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Item Name</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Stock</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Unit</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-500 text-xs">
                  {items.length === 0 ? 'Belum ada item di inventory' : 'Tidak ada item yang cocok'}
                </td>
              </tr>
            )}
            {filtered.map((it) => (
              <tr key={it.sku} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{it.sku}</td>
                <td className="px-5 py-3 font-medium text-slate-900">{it.name}</td>
                <td className="px-5 py-3 text-right">
                  <span className={cn(
                    'font-bold tabular-nums',
                    it.stock < 50 ? 'text-red-600' :
                    it.stock < 200 ? 'text-amber-600' : 'text-slate-900'
                  )}>
                    {it.stock}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-600">{it.unit}</td>
                <td className="px-5 py-3">{getStockBadge(it.stock)}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openAdjust(it)}>Restock</Button>
                    <Button size="sm" variant="ghost" onClick={() => openAdjust(it)}>Adjust</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!adjustItem}
        onClose={() => setAdjustItem(null)}
        title="Adjust Stock"
        subtitle={adjustItem ? `${adjustItem.sku} — ${adjustItem.name}` : ''}
        size="sm"
      >
        {adjustItem && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Stock saat ini</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {adjustItem.stock} {adjustItem.unit}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Tipe</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setAdjustType('add')} className={cn(
                  'px-3 py-2 rounded-lg border text-sm font-medium',
                  adjustType === 'add' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-slate-600 border-slate-300'
                )}>+ Tambah</button>
                <button onClick={() => setAdjustType('subtract')} className={cn(
                  'px-3 py-2 rounded-lg border text-sm font-medium',
                  adjustType === 'subtract' ? 'bg-red-50 text-red-700 border-red-300' : 'bg-white text-slate-600 border-slate-300'
                )}>− Kurangi</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jumlah ({adjustItem.unit})</label>
              <input
                type="number"
                value={adjustAmount || ''}
                onChange={(e) => setAdjustAmount(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="0"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setAdjustItem(null)}>Batal</Button>
              <Button icon={Check} onClick={applyAdjust} disabled={!adjustAmount || saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============ SALES ORDERS VIEW ============

function SalesOrdersView() {
  const { orders, loading, error, refetch } = useSalesOrders();
  const [expanded, setExpanded] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [printTarget, setPrintTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = async (data) => {
    setSaving(true);
    try {
      await createSalesOrder(data);
      await refetch();
      setShowCreate(false);
      alert('✅ Sales Order berhasil dibuat');
    } catch (err) {
      console.error('[so] create error:', err);
      alert('Gagal: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button icon={Plus} onClick={() => setShowCreate(true)}>Buat SO Baru</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
          ⚠️ Error: {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">SO ID</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Customer</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Tanggal</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Items</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Total</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-xs">
                  {loading ? 'Memuat...' : 'Belum ada Sales Order'}
                </td>
              </tr>
            )}
            {orders.map((so) => (
              <Fragment key={so.id}>
                <tr className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{so.id}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{so.customer}</td>
                  <td className="px-5 py-3 text-slate-600">{so.date}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-700">{so.items}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-900 tabular-nums">
                    Rp {so.total.toLocaleString('id-ID')}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={
                      so.status === 'Selesai' ? 'success' :
                      so.status === 'Dikirim' ? 'warning' :
                      so.status === 'Diproses' ? 'info' : 'neutral'
                    }>
                      {so.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="secondary" icon={Printer}
                        onClick={() => setPrintTarget(so)}>
                        Print
                      </Button>
                      <button onClick={() => setExpanded(expanded === so.id ? null : so.id)}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center">
                        <MoreHorizontal className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded === so.id && (
                  <tr className="bg-slate-50">
                    <td colSpan={7} className="px-5 py-4">
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <p className="text-slate-500 font-medium mb-1">Alamat Pengiriman</p>
                          <p className="text-slate-900">{so.customerAddress || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-medium mb-1">Kontak</p>
                          <p className="text-slate-900">{so.customerContact || '-'} · {so.customerPhone || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-medium mb-1">Ekspedisi</p>
                          <p className="text-slate-900">{so.courier || '-'}</p>
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

      <CreateSOModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        loading={saving}
      />

      <Modal
        open={!!printTarget}
        onClose={() => setPrintTarget(null)}
        title="Preview Surat Jalan"
        subtitle={printTarget ? `${printTarget.id} — ${printTarget.customer}` : ''}
        size="lg"
      >
        {printTarget && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3 no-print">
              <div className="text-xs text-slate-600">
                <p className="font-semibold text-slate-900">3 rangkap akan dicetak:</p>
                <p>Arsip Gudang · Pelanggan · Ekspedisi</p>
              </div>
              <Button icon={Printer} onClick={() => window.print()}>Cetak Sekarang</Button>
            </div>
            <div className="bg-slate-100 rounded-lg p-4 overflow-auto" style={{ maxHeight: '600px' }}>
              <div style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '330mm' }}>
                <PrintDeliveryNote so={printTarget} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CreateSOModal({ open, onClose, onCreate, loading }) {
  const [customer, setCustomer] = useState('');
  const [items, setItems] = useState([{ sku: '', name: '', qty: 1, price: 0, unit: 'dus' }]);

  const addLine = () => setItems([...items, { sku: '', name: '', qty: 1, price: 0, unit: 'dus' }]);
  const removeLine = (i) => setItems(items.filter((_, x) => x !== i));
  const updateItem = (i, field, val) => {
    const next = [...items];
    next[i][field] = val;
    setItems(next);
  };

  const total = items.reduce((s, it) => s + (it.qty * it.price), 0);
  const canSave = customer && items.some((i) => i.name);

  const handleSave = () => {
    onCreate({
      code: generateSOCode(),
      customerName: customer,
      date: new Date().toISOString().slice(0, 10),
      status: 'Diproses',
      lines: items.filter((i) => i.name),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Buat Sales Order Baru"
      subtitle="Isi detail pesanan" size="lg">
      <div className="space-y-5">
        <Input
          label="Customer"
          icon={Building2}
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder="Nama customer"
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700">Line Items</label>
            <Button size="sm" variant="secondary" icon={Plus} onClick={addLine}>Tambah</Button>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">SKU</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Produk</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-20">Qty</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-28">Harga</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-28">Subtotal</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <input value={it.sku} onChange={(e) => updateItem(i, 'sku', e.target.value)}
                        placeholder="SKU-..." className="w-full text-xs font-mono border-0 focus:outline-none" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={it.name} onChange={(e) => updateItem(i, 'name', e.target.value)}
                        placeholder="Nama produk..." className="w-full text-sm border-0 focus:outline-none" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={it.qty} onChange={(e) => updateItem(i, 'qty', +e.target.value)}
                        className="w-full text-sm text-right border-0 focus:outline-none tabular-nums" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={it.price} onChange={(e) => updateItem(i, 'price', +e.target.value)}
                        className="w-full text-sm text-right border-0 focus:outline-none tabular-nums" />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">
                      Rp {(it.qty * it.price).toLocaleString('id-ID')}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button onClick={() => removeLine(i)}
                        className="w-6 h-6 rounded hover:bg-red-50 inline-flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={4} className="px-3 py-3 text-right text-xs font-semibold text-slate-600">Total</td>
                  <td className="px-3 py-3 text-right font-bold text-slate-900 tabular-nums">
                    Rp {total.toLocaleString('id-ID')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Batal</Button>
          <Button icon={Check} onClick={handleSave} disabled={!canSave || loading}>
            {loading ? 'Menyimpan...' : 'Simpan SO'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============ PURCHASE ORDERS VIEW ============

function PurchaseOrdersView() {
  const { orders, loading, error, refetch } = usePurchaseOrders();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [printTarget, setPrintTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchQ = o.supplier.toLowerCase().includes(q.toLowerCase()) ||
        o.id.toLowerCase().includes(q.toLowerCase());
      if (filter === 'all') return matchQ;
      return matchQ && o.status.toLowerCase() === filter;
    });
  }, [orders, q, filter]);

  const handleCreate = async (data) => {
    setSaving(true);
    try {
      await createPurchaseOrder(data);
      await refetch();
      setShowCreate(false);
      alert('✅ Purchase Order berhasil dibuat');
    } catch (err) {
      console.error('[po] create error:', err);
      alert('Gagal: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReceive = async (po) => {
    if (!confirm(`Terima ${po.id} dari ${po.supplier}?\n\nStok inventory akan bertambah otomatis.`)) return;

    try {
      // Update status
      await updatePOStatus(po.uuid, 'Diterima');

      // Tambah stok (import dari inventoryStore)
      const { addStockFromInbound } = await import('../lib/inventoryStore');
      await addStockFromInbound(po.lines, {
        inboundId: po.id,
        date: po.date,
      });

      await refetch();
      alert('✅ Barang diterima & stok ditambahkan');
    } catch (err) {
      console.error('[po] receive error:', err);
      alert('Gagal: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Cari PO atau supplier..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'draft', label: 'Draft' },
            { id: 'dikirim', label: 'Dikirim' },
            { id: 'diterima', label: 'Diterima' },
            { id: 'selesai', label: 'Selesai' },
          ].map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                filter === f.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              )}>
              {f.label}
            </button>
          ))}
          <Button icon={Plus} onClick={() => setShowCreate(true)}>Buat PO</Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
          ⚠️ Error: {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase w-8"></th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">PO ID</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Supplier</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Tanggal</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Total</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-xs">
                  {loading ? 'Memuat...' : orders.length === 0 ? 'Belum ada Purchase Order' : 'Tidak ada PO cocok'}
                </td>
              </tr>
            )}
            {filtered.map((po) => (
              <Fragment key={po.id}>
                <tr className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <button onClick={() => setExpanded(expanded === po.id ? null : po.id)}
                      className="w-6 h-6 rounded hover:bg-slate-100 inline-flex items-center justify-center">
                      {expanded === po.id
                        ? <ChevronUp className="w-4 h-4 text-slate-500" />
                        : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </button>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{po.id}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{po.supplier}</td>
                  <td className="px-5 py-3 text-slate-600">{po.date}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-900 tabular-nums">
                    Rp {po.total.toLocaleString('id-ID')}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={
                      po.status === 'Selesai' ? 'success' :
                      po.status === 'Diterima' ? 'success' :
                      po.status === 'Dikirim' ? 'warning' : 'neutral'
                    }>{po.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {po.status === 'Dikirim' && (
                        <Button size="sm" variant="success" icon={Check}
                          onClick={() => handleReceive(po)}>Terima</Button>
                      )}
                      <Button size="sm" variant="secondary" icon={Printer}
                        onClick={() => setPrintTarget(po)}>Print</Button>
                    </div>
                  </td>
                </tr>
                {expanded === po.id && (
                  <tr className="bg-slate-50">
                    <td colSpan={7} className="px-5 py-4">
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200">
                              <th className="text-left px-4 py-2 font-semibold text-slate-600">SKU</th>
                              <th className="text-left px-4 py-2 font-semibold text-slate-600">Produk</th>
                              <th className="text-right px-4 py-2 font-semibold text-slate-600">Qty</th>
                              <th className="text-right px-4 py-2 font-semibold text-slate-600">Harga</th>
                              <th className="text-right px-4 py-2 font-semibold text-slate-600">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {po.lines.map((line, i) => (
                              <tr key={i}>
                                <td className="px-4 py-2 font-mono text-slate-600">{line.sku}</td>
                                <td className="px-4 py-2 text-slate-900">{line.name}</td>
                                <td className="px-4 py-2 text-right tabular-nums text-slate-700">{line.qty}</td>
                                <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                                  Rp {line.price.toLocaleString('id-ID')}
                                </td>
                                <td className="px-4 py-2 text-right tabular-nums font-semibold text-slate-900">
                                  Rp {(line.qty * line.price).toLocaleString('id-ID')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <CreatePOModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        loading={saving}
      />

      <Modal open={!!printTarget} onClose={() => setPrintTarget(null)}
        title="Preview Purchase Order"
        subtitle={printTarget ? `${printTarget.id} — ${printTarget.supplier}` : ''} size="lg">
        {printTarget && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3 no-print">
              <div className="text-xs text-slate-600">
                <p className="font-semibold text-slate-900">2 rangkap akan dicetak:</p>
                <p>Arsip Gudang · Untuk Supplier</p>
              </div>
              <Button icon={Printer} onClick={() => window.print()}>Cetak Sekarang</Button>
            </div>
            <div className="bg-slate-100 rounded-lg p-4 overflow-auto" style={{ maxHeight: '600px' }}>
              <div style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '210mm' }}>
                <PrintPurchaseOrder po={printTarget} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CreatePOModal({ open, onClose, onCreate, loading }) {
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [lines, setLines] = useState([{ sku: '', name: '', qty: 1, price: 0, unit: 'dus' }]);
  const { suppliers, loading: suppliersLoading, refetch: refetchSuppliers } = useSuppliers();

  // State buat modal tambah supplier
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
  });
  const [savingSupplier, setSavingSupplier] = useState(false);

  const supplier = suppliers.find((s) => s.id === supplierId);

  const addLine = () => setLines([...lines, { sku: '', name: '', qty: 1, price: 0, unit: 'dus' }]);
  const removeLine = (i) => setLines(lines.filter((_, x) => x !== i));
  const updateLine = (i, field, val) => {
    const next = [...lines];
    next[i][field] = val;
    setLines(next);
  };

  const total = lines.reduce((s, l) => s + (l.qty * l.price), 0);
  const canSave = supplierId && lines.some((l) => l.name);

  const handleSave = () => {
    if (!supplierId || !supplier) return;
    onCreate({
      code: generatePOCode(),
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: new Date().toISOString().slice(0, 10),
      expectedDate: expectedDate || null,
      status: 'Draft',
      lines: lines.filter((l) => l.name),
    });
  };

  // Handle tambah supplier baru
  const handleAddSupplier = async () => {
    if (!newSupplier.name) {
      alert('Nama supplier wajib diisi');
      return;
    }

    setSavingSupplier(true);
    try {
      const created = await createSupplier({
        code: generateSupplierCode(),
        name: newSupplier.name,
        contactName: newSupplier.contactName,
        phone: newSupplier.phone,
        email: newSupplier.email,
        address: newSupplier.address,
      });

      // Refetch suppliers biar dropdown update
      await refetchSuppliers();

      // Auto-select supplier baru
      setSupplierId(created.id);

      // Reset form & tutup modal
      setNewSupplier({ name: '', contactName: '', phone: '', email: '', address: '' });
      setShowAddSupplier(false);
      alert(`✅ Supplier "${created.name}" berhasil ditambahkan`);
    } catch (err) {
      console.error('[supplier] create error:', err);
      alert('Gagal menambah supplier: ' + err.message);
    } finally {
      setSavingSupplier(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Buat Purchase Order"
        subtitle="Pilih supplier dan tambah line items" size="lg">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">Supplier</label>
                <button
                  type="button"
                  onClick={() => setShowAddSupplier(true)}
                  className="text-[11px] font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Tambah Supplier
                </button>
              </div>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                disabled={suppliersLoading}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50"
              >
                <option value="">
                  {suppliersLoading ? 'Memuat supplier...' : suppliers.length === 0 ? '-- Tidak ada supplier --' : '-- Pilih supplier --'}
                </option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tanggal Ekspektasi</label>
              <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">Line Items</label>
              <Button size="sm" variant="secondary" icon={Plus} onClick={addLine}>Tambah</Button>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">SKU</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Nama</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-20">Qty</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-28">Harga</th>
                    <th className="w-8"></th>
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
                      <td className="px-3 py-2">
                        <input type="number" value={l.price} onChange={(e) => updateLine(i, 'price', +e.target.value)}
                          className="w-full text-sm text-right border-0 focus:outline-none tabular-nums" />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button onClick={() => removeLine(i)}
                          className="w-6 h-6 rounded hover:bg-red-50 inline-flex items-center justify-center">
                          <X className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={4} className="px-3 py-3 text-right text-xs font-semibold text-slate-600">Total</td>
                    <td className="px-3 py-3 text-right font-bold text-slate-900 tabular-nums">
                      Rp {total.toLocaleString('id-ID')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="secondary" onClick={onClose} disabled={loading}>Batal</Button>
            <Button icon={Check} onClick={handleSave} disabled={!canSave || loading}>
              {loading ? 'Menyimpan...' : 'Simpan PO'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Tambah Supplier */}
      <Modal
        open={showAddSupplier}
        onClose={() => setShowAddSupplier(false)}
        title="Tambah Supplier Baru"
        subtitle="Isi data supplier"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Supplier <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newSupplier.name}
              onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
              placeholder="Contoh: PT Sumber Makmur"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kontak Person</label>
              <input
                type="text"
                value={newSupplier.contactName}
                onChange={(e) => setNewSupplier({ ...newSupplier, contactName: e.target.value })}
                placeholder="Nama PIC"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Telepon</label>
              <input
                type="text"
                value={newSupplier.phone}
                onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                placeholder="021-xxxxxxx"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={newSupplier.email}
              onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
              placeholder="supplier@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alamat</label>
            <textarea
              value={newSupplier.address}
              onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
              rows={2}
              placeholder="Alamat lengkap supplier"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setShowAddSupplier(false)} disabled={savingSupplier}>
              Batal
            </Button>
            <Button icon={Check} onClick={handleAddSupplier} disabled={savingSupplier || !newSupplier.name}>
              {savingSupplier ? 'Menyimpan...' : 'Simpan Supplier'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}// ============ TASK DISPATCH VIEW (placeholder) ============

function TaskDispatchView() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
        <Send className="w-5 h-5 text-slate-500" />
      </div>
      <p className="text-sm font-semibold text-slate-900">Task Dispatch</p>
      <p className="text-xs text-slate-500 mt-1">Belum ada task untuk di-dispatch</p>
    </div>
  );
}

// ============ MAIN ============

export default function WMSDashboard() {
  const [view, setView] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'inbound', label: 'Barang Masuk', icon: PackagePlus },
    { id: 'outbound', label: 'Barang Keluar', icon: PackageMinus },
    { id: 'po', label: 'Purchase Orders', icon: ShoppingCart },
    { id: 'so', label: 'Sales Orders', icon: Truck },
    { id: 'dispatch', label: 'Task Dispatch', icon: Send },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      <Sidebar items={navItems} active={view} setActive={setView} brand="Matang Lestari" />
      <div className="ml-60">
        <TopBar
          title={navItems.find((n) => n.id === view)?.label}
          subtitle="Gudang Utama · Kediri"
        />
        <main className="p-6">
          {view === 'dashboard' && <DashboardOverview />}
          {view === 'inventory' && <InventoryView />}
          {view === 'inbound' && <InboundView />}
          {view === 'outbound' && <OutboundView />}
          {view === 'po' && <PurchaseOrdersView />}
          {view === 'so' && <SalesOrdersView />}
          {view === 'dispatch' && <TaskDispatchView />}
        </main>
      </div>
    </div>
  );
}