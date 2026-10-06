// src/wms/WMSDashboard.jsx
import React, { useState, useMemo, Fragment, useEffect } from 'react';
import {
  LayoutDashboard, Boxes, ShoppingCart, Truck, Send, Search, Plus,
  X, AlertTriangle, TrendingUp, DollarSign, Users, Activity,
  Check, FileText, Building2, ArrowUpRight, ArrowDownRight,
  MoreHorizontal, BarChart3, PackageCheck, Inbox, ChevronDown, ChevronUp,
  Printer, PackagePlus, PackageMinus, CheckCircle2, UserCheck, Edit3,
} from 'lucide-react';
import {
  cn, Badge, Button, Input, Modal, Sidebar, TopBar,
} from '../components/shared';
import { useSuppliers } from '../hooks/useSuppliers';
import {
  PrintPurchaseOrder,
  PrintDeliveryNote,
  printDocument,
} from '../components/DocumentTemplate';
import InboundView from './views/InboundView';
import OutboundView from './views/OutboundView';
import { useInventory } from '../hooks/useInventory';
import {
  adjustStock,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from '../lib/inventoryStore';
import { usePurchaseOrders } from '../hooks/usePurchaseOrders';
import { useSalesOrders } from '../hooks/useSalesOrders';
import {
  createPurchaseOrder, updatePOStatus,
  createSalesOrder, updateSOStatus,
  generatePOCode, generateSOCode,
  createSupplier, generateSupplierCode,
  createInboundFromPO,
} from '../lib/orderHelpers';
import { useTasks } from '../hooks/useTasks';

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

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  const handleSaveItem = async (data) => {
    setSaving(true);
    try {
      if (editTarget) {
        await updateInventoryItem(editTarget.sku, data);
        alert('✅ Barang berhasil diupdate');
      } else {
        await createInventoryItem(data);
        alert('✅ Barang berhasil ditambahkan');
      }
      setShowForm(false);
      setEditTarget(null);
    } catch (err) {
      console.error('[inventory] save error:', err);
      alert('Gagal: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteInventoryItem(deleteTarget.sku);
      alert('✅ Barang berhasil dihapus');
      setDeleteTarget(null);
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

  const formatRupiah = (n) => {
    if (!n && n !== 0) return '-';
    return 'Rp ' + Number(n).toLocaleString('id-ID');
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
          <Button icon={Plus} onClick={() => { setEditTarget(null); setShowForm(true); }}>
            Tambah Barang
          </Button>
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
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Harga Jual</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Harga Beli</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-slate-500 text-xs">
                  {items.length === 0
                    ? 'Belum ada item di inventory. Klik "Tambah Barang" untuk mulai.'
                    : 'Tidak ada item yang cocok'}
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
                <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                  {it.selling_price > 0 ? formatRupiah(it.selling_price) : '-'}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                  {it.purchase_price > 0 ? formatRupiah(it.purchase_price) : '-'}
                </td>
                <td className="px-5 py-3">{getStockBadge(it.stock)}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="secondary" onClick={() => openAdjust(it)}>Restock</Button>
                    <button
                      onClick={() => { setEditTarget(it); setShowForm(true); }}
                      className="w-7 h-7 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(it)}
                      className="w-7 h-7 rounded-lg hover:bg-red-50 inline-flex items-center justify-center"
                      title="Hapus"
                    >
                      <X className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Adjust Modal */}
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

      {/* Form Tambah/Edit */}
      <InventoryFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditTarget(null); }}
        initial={editTarget}
        onSave={handleSaveItem}
        loading={saving}
      />

      {/* Delete Confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Barang"
        subtitle={deleteTarget ? `${deleteTarget.sku} — ${deleteTarget.name}` : ''}
        size="sm"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-800">
                Yakin mau hapus barang ini? Data akan hilang permanen.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
              <Button variant="danger" onClick={handleDelete} disabled={saving}>
                {saving ? 'Menghapus...' : 'Hapus'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============ FORM INVENTORY ============

function InventoryFormModal({ open, onClose, initial, onSave, loading }) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [stock, setStock] = useState(0);
  const [unit, setUnit] = useState('dus');
  const [minStock, setMinStock] = useState(50);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0);

  useEffect(() => {
    setSku(initial?.sku || '');
    setName(initial?.name || '');
    setStock(initial?.stock || 0);
    setUnit(initial?.unit || 'dus');
    setMinStock(initial?.min_stock || 50);
    setSellingPrice(initial?.selling_price || 0);
    setPurchasePrice(initial?.purchase_price || 0);
  }, [initial, open]);

  const canSave = sku && name;

  const handleSave = () => {
    if (!sku || !name) return;
    onSave({
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      stock: Number(stock) || 0,
      unit,
      min_stock: Number(minStock) || 50,
      selling_price: Number(sellingPrice) || 0,
      purchase_price: Number(purchasePrice) || 0,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit Barang' : 'Tambah Barang Baru'}
      subtitle="Isi data produk"
      size="md"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="SKU *"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Contoh: SKU-AM-001"
            disabled={!!initial}
          />
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Unit *</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="dus">dus</option>
              <option value="karung">karung</option>
              <option value="pcs">pcs</option>
              <option value="box">box</option>
              <option value="kg">kg</option>
            </select>
          </div>
        </div>

        <Input
          label="Nama Produk *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contoh: Minyak Goreng Sania 2L"
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Stock Awal</label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 tabular-nums"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Min Stock (alert)</label>
            <input
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 tabular-nums"
              placeholder="50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Harga Jual (Rp)</label>
            <input
              type="number"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 tabular-nums"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Harga Beli (Rp)</label>
            <input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 tabular-nums"
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Batal</Button>
          <Button icon={Check} onClick={handleSave} disabled={!canSave || loading}>
            {loading ? 'Menyimpan...' : initial ? 'Simpan Perubahan' : 'Tambah Barang'}
          </Button>
        </div>
      </div>
    </Modal>
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
      alert('✅ Sales Order berhasil dibuat + Outbound auto-created');
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
              <Button icon={Printer} onClick={printDocument}>Cetak Sekarang</Button>
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
  const inventory = useInventory();
  const [customer, setCustomer] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [items, setItems] = useState([
    { sku: '', name: '', qty: 1, price: 0, unit: 'dus' }
  ]);

  const addLine = () => setItems([...items, { sku: '', name: '', qty: 1, price: 0, unit: 'dus' }]);
  const removeLine = (i) => setItems(items.filter((_, x) => x !== i));

  const updateLineSku = (i, sku) => {
    const next = [...items];
    const product = inventory.find((inv) => inv.sku === sku);
    if (product) {
      next[i] = {
        ...next[i],
        sku: product.sku,
        name: product.name,
        unit: product.unit || 'dus',
        price: Number(product.selling_price) || next[i].price || 0,
      };
    } else {
      next[i] = { ...next[i], sku: '', name: '', unit: 'dus', price: 0 };
    }
    setItems(next);
  };

  const updateItem = (i, field, val) => {
    const next = [...items];
    next[i][field] = val;
    setItems(next);
  };

  const total = items.reduce((s, it) => s + (it.qty * it.price), 0);
  const canSave = customer && items.some((i) => i.sku && i.name && i.price > 0);

  const handleSave = () => {
    onCreate({
      code: generateSOCode(),
      customerName: customer,
      customerAddress: customerAddress.trim() || null,
      customerPhone: customerPhone.trim() || null,
      customerContact: customerContact.trim() || null,
      date: new Date().toISOString().slice(0, 10),
      status: 'Diproses',
      lines: items
        .filter((i) => i.sku && i.name)
        .map((i) => ({
          sku: i.sku,
          name: i.name,
          qty: Number(i.qty) || 0,
          unit: i.unit || 'dus',
          price: Number(i.price) || 0,
        })),
    });
    setCustomer('');
    setCustomerAddress('');
    setCustomerPhone('');
    setCustomerContact('');
    setItems([{ sku: '', name: '', qty: 1, price: 0, unit: 'dus' }]);
  };

  return (
    <Modal open={open} onClose={onClose} title="Buat Sales Order Baru"
      subtitle="Pilih produk dari inventory + isi data customer" size="lg">
      <div className="space-y-5">
        <Input label="Nama Customer" icon={Building2} value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder="Contoh: Toko Makmur Jaya" />

        <div className="grid grid-cols-2 gap-4">
          <Input label="Kontak Person" value={customerContact}
            onChange={(e) => setCustomerContact(e.target.value)}
            placeholder="Contoh: Pak Hendra" />
          <Input label="Nomor Telepon" value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="0812-xxxx-xxxx" />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Alamat Pengiriman</label>
          <textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)}
            rows={2} placeholder="Contoh: Jl. Raya Kediri No. 45"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700">
              Line Items <span className="text-slate-400 font-normal">(pilih SKU dari inventory)</span>
            </label>
            <Button size="sm" variant="secondary" icon={Plus} onClick={addLine}>Tambah</Button>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 min-w-[260px]">SKU / Produk</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-20">Qty</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-slate-600 w-20">Unit</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-32">Harga</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-32">Subtotal</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, i) => {
                  const selected = inventory.find((inv) => inv.sku === it.sku);
                  const stockWarning = selected && it.qty > selected.stock;
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <select value={it.sku} onChange={(e) => updateLineSku(i, e.target.value)}
                          className="w-full text-sm border-0 focus:outline-none bg-transparent">
                          <option value="">-- Pilih SKU dari inventory --</option>
                          {inventory.map((inv) => (
                            <option key={inv.sku} value={inv.sku}>
                              {inv.sku} — {inv.name} (stock: {inv.stock} {inv.unit})
                            </option>
                          ))}
                        </select>
                        {selected && (
                          <p className={cn(
                            'text-[10px] mt-0.5',
                            stockWarning ? 'text-red-500 font-semibold' : 'text-slate-500'
                          )}>
                            {stockWarning
                              ? `⚠️ Stock cuma ${selected.stock}, qty ${it.qty}`
                              : `Stock: ${selected.stock} ${selected.unit}`}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={it.qty}
                          onChange={(e) => updateItem(i, 'qty', +e.target.value)}
                          className="w-full text-sm text-right border-0 focus:outline-none tabular-nums" min="1" />
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-slate-600">{it.unit || 'dus'}</td>
                      <td className="px-3 py-2">
                        <input type="number" value={it.price}
                          onChange={(e) => updateItem(i, 'price', +e.target.value)}
                          placeholder="0"
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
                  );
                })}
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

          {inventory.length === 0 && (
            <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-800">
                Inventory kosong. Tambah barang dulu di menu Inventory.
              </p>
            </div>
          )}
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
    if (!confirm(
      `Terima ${po.id} dari ${po.supplier}?\n\n` +
      `Inbound akan dibuat dengan status Pending.\n` +
      `Stok akan bertambah setelah staff gudang verifikasi + upload foto.`
    )) return;

    try {
      await updatePOStatus(po.uuid, 'Diterima');
      const inbound = await createInboundFromPO({
        id: po.uuid,
        code: po.id,
        supplierId: po.supplierId,
        supplierName: po.supplier,
      });
      await refetch();

      let alertMsg = `✅ PO ditandai "Diterima"`;
      if (inbound) {
        alertMsg += `\n\n📦 Inbound otomatis dibuat: ${inbound.code}\n` +
                    `Buka menu "Barang Masuk" untuk verifikasi + foto.`;
      }
      alert(alertMsg);
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
              <Button icon={Printer} onClick={printDocument}>Cetak Sekarang</Button>
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
  const inventory = useInventory();
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [lines, setLines] = useState([{ sku: '', name: '', qty: 1, price: 0, unit: 'dus' }]);
  const { suppliers, loading: suppliersLoading, refetch: refetchSuppliers } = useSuppliers();

  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', contactName: '', phone: '', email: '', address: '' });
  const [savingSupplier, setSavingSupplier] = useState(false);

  const supplier = suppliers.find((s) => s.id === supplierId);

  const addLine = () => setLines([...lines, { sku: '', name: '', qty: 1, price: 0, unit: 'dus' }]);
  const removeLine = (i) => setLines(lines.filter((_, x) => x !== i));

  const updateLineSku = (i, sku) => {
    const next = [...lines];
    const product = inventory.find((inv) => inv.sku === sku);
    if (product) {
      next[i] = {
        ...next[i],
        sku: product.sku,
        name: product.name,
        unit: product.unit || 'dus',
        price: Number(product.purchase_price) || next[i].price || 0,
      };
    } else {
      next[i] = { ...next[i], sku: '', name: '', unit: 'dus', price: 0 };
    }
    setLines(next);
  };

  const updateLine = (i, field, val) => {
    const next = [...lines];
    next[i][field] = val;
    setLines(next);
  };

  const total = lines.reduce((s, l) => s + (l.qty * l.price), 0);
  const canSave = supplierId && lines.some((l) => l.sku && l.name);

  const handleSave = () => {
    if (!supplierId || !supplier) return;
    onCreate({
      code: generatePOCode(),
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: new Date().toISOString().slice(0, 10),
      expectedDate: expectedDate || null,
      status: 'Draft',
      lines: lines
        .filter((l) => l.sku && l.name)
        .map((l) => ({
          sku: l.sku,
          name: l.name,
          qty: Number(l.qty) || 0,
          unit: l.unit || 'dus',
          price: Number(l.price) || 0,
        })),
    });
  };

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
      await refetchSuppliers();
      setSupplierId(created.id);
      setNewSupplier({ name: '', contactName: '', phone: '', email: '', address: '' });
      setShowAddSupplier(false);
      alert(`✅ Supplier "${created.name}" berhasil ditambahkan`);
    } catch (err) {
      alert('Gagal menambah supplier: ' + err.message);
    } finally {
      setSavingSupplier(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Buat Purchase Order"
        subtitle="Pilih supplier + produk dari inventory" size="lg">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">Supplier</label>
                <button type="button" onClick={() => setShowAddSupplier(true)}
                  className="text-[11px] font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Tambah Supplier
                </button>
              </div>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                disabled={suppliersLoading}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50">
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
              <label className="text-xs font-semibold text-slate-700">
                Line Items <span className="text-slate-400 font-normal">(pilih SKU dari inventory)</span>
              </label>
              <Button size="sm" variant="secondary" icon={Plus} onClick={addLine}>Tambah</Button>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 min-w-[260px]">SKU / Produk</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-20">Qty</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-slate-600 w-20">Unit</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-32">Harga Beli</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-32">Subtotal</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((l, i) => {
                    const selected = inventory.find((inv) => inv.sku === l.sku);
                    return (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <select value={l.sku} onChange={(e) => updateLineSku(i, e.target.value)}
                            className="w-full text-sm border-0 focus:outline-none bg-transparent">
                            <option value="">-- Pilih SKU dari inventory --</option>
                            {inventory.map((inv) => (
                              <option key={inv.sku} value={inv.sku}>
                                {inv.sku} — {inv.name} (stock: {inv.stock} {inv.unit})
                              </option>
                            ))}
                          </select>
                          {selected && (
                            <p className="text-[10px] mt-0.5 text-slate-500">
                              Stock saat ini: {selected.stock} {selected.unit}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" value={l.qty} onChange={(e) => updateLine(i, 'qty', +e.target.value)}
                            className="w-full text-sm text-right border-0 focus:outline-none tabular-nums" min="1" />
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-slate-600">{l.unit || 'dus'}</td>
                        <td className="px-3 py-2">
                          <input type="number" value={l.price} onChange={(e) => updateLine(i, 'price', +e.target.value)}
                            placeholder="0"
                            className="w-full text-sm text-right border-0 focus:outline-none tabular-nums" />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">
                          Rp {(l.qty * l.price).toLocaleString('id-ID')}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button onClick={() => removeLine(i)}
                            className="w-6 h-6 rounded hover:bg-red-50 inline-flex items-center justify-center">
                            <X className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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

      <Modal open={showAddSupplier} onClose={() => setShowAddSupplier(false)}
        title="Tambah Supplier Baru" subtitle="Isi data supplier" size="md">
        <div className="space-y-4">
          <Input label="Nama Supplier *" value={newSupplier.name}
            onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
            placeholder="Contoh: PT Sumber Makmur" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Kontak Person" value={newSupplier.contactName}
              onChange={(e) => setNewSupplier({ ...newSupplier, contactName: e.target.value })}
              placeholder="Nama PIC" />
            <Input label="Telepon" value={newSupplier.phone}
              onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
              placeholder="021-xxxxxxx" />
          </div>
          <Input label="Email" type="email" value={newSupplier.email}
            onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
            placeholder="supplier@example.com" />
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alamat</label>
            <textarea value={newSupplier.address}
              onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
              rows={2} placeholder="Alamat lengkap supplier"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setShowAddSupplier(false)} disabled={savingSupplier}>Batal</Button>
            <Button icon={Check} onClick={handleAddSupplier} disabled={savingSupplier || !newSupplier.name}>
              {savingSupplier ? 'Menyimpan...' : 'Simpan Supplier'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ============ TASK DISPATCH VIEW ============

function TaskDispatchView() {
  const { tasks, drivers, loading, error, refetch, assignTask, unassignTask } = useTasks();
  const [assignTarget, setAssignTarget] = useState(null);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === 'all') return true;
      if (filter === 'pending') return t.status === 'Pending';
      if (filter === 'in-progress') return t.status === 'In Progress';
      if (filter === 'completed') return t.status === 'Completed';
      if (filter === 'unassigned') return !t.assignedTo;
      return true;
    });
  }, [tasks, filter]);

  const handleAssign = async (driver) => {
    if (!assignTarget) return;
    setSaving(true);
    try {
      await assignTask(assignTarget.uuid, driver.id, driver.full_name);
      setAssignTarget(null);
      alert(`✅ Task ${assignTarget.id} di-assign ke ${driver.full_name}`);
    } catch (err) {
      alert('Gagal: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async (task) => {
    if (!confirm(`Unassign task ${task.id} dari ${task.assignedToName}?`)) return;
    try {
      await unassignTask(task.uuid);
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memuat task...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'Pending').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
    unassigned: tasks.filter((t) => !t.assignedTo && t.status !== 'Completed').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button onClick={refetch}
          className="w-9 h-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center">
          <Activity className="w-4 h-4 text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'unassigned', label: 'Belum Assign' },
            { id: 'pending', label: 'Pending' },
            { id: 'in-progress', label: 'In Progress' },
            { id: 'completed', label: 'Selesai' },
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
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
          ⚠️ Error: {error}
        </div>
      )}

      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-2">
            <FileText className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Total Task</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Belum Assign</p>
          <p className="text-xl font-bold text-amber-600 mt-1 tabular-nums">{stats.unassigned}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center mb-2">
            <Send className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Pending</p>
          <p className="text-xl font-bold text-brand-600 mt-1 tabular-nums">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mb-2">
            <Truck className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">In Progress</p>
          <p className="text-xl font-bold text-indigo-600 mt-1 tabular-nums">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Selesai</p>
          <p className="text-xl font-bold text-emerald-600 mt-1 tabular-nums">{stats.completed}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Daftar Task</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <div className="p-12 text-center">
                <PackageCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-900">Tidak ada task</p>
                <p className="text-xs text-slate-500 mt-1">
                  {tasks.length === 0
                    ? 'Task auto-dibuat saat Outbound di-ship.'
                    : 'Coba ubah filter'}
                </p>
              </div>
            )}
            {filtered.map((task) => (
              <div key={task.id} className="px-5 py-4 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-mono font-semibold text-slate-400">{task.id}</span>
                      <Badge variant={
                        task.status === 'Completed' ? 'success' :
                        task.status === 'In Progress' ? 'info' : 'warning'
                      }>{task.status}</Badge>
                      {task.assignedToName ? (
                        <Badge variant="info"><Users className="w-3 h-3" /> {task.assignedToName}</Badge>
                      ) : (
                        <Badge variant="danger"><AlertTriangle className="w-3 h-3" /> Belum assign</Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{task.customer}</p>
                    {task.address && <p className="text-xs text-slate-500 mt-1">{task.address}</p>}
                    {task.phone && <p className="text-[10px] text-slate-400 mt-0.5">Telp: {task.phone}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500 mb-2">{task.items} item</p>
                    {!task.assignedToName && task.status !== 'Completed' && (
                      <Button size="sm" icon={UserCheck} onClick={() => setAssignTarget(task)}>Assign</Button>
                    )}
                    {task.assignedToName && task.status !== 'Completed' && (
                      <button onClick={() => handleUnassign(task)}
                        className="text-[10px] text-red-500 hover:text-red-700 font-medium">Unassign</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Driver Tersedia</h3>
            <Badge variant="neutral">{drivers.length}</Badge>
          </div>
          <div className="divide-y divide-slate-100">
            {drivers.length === 0 && (
              <div className="p-8 text-center">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Belum ada driver</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Bikin di Manajemen Pekerja dengan role "worker"
                </p>
              </div>
            )}
            {drivers.map((d) => {
              const taskCount = tasks.filter((t) => t.assignedTo === d.id && t.status !== 'Completed').length;
              return (
                <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0">
                    {d.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{d.full_name}</p>
                    <p className="text-[10px] text-slate-500">{d.position || d.division || '-'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-slate-900 tabular-nums">{taskCount}</p>
                    <p className="text-[9px] text-slate-400">task</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal open={!!assignTarget} onClose={() => setAssignTarget(null)}
        title="Assign Task ke Driver"
        subtitle={assignTarget ? `${assignTarget.id} — ${assignTarget.customer}` : ''} size="md">
        {assignTarget && (
          <div className="space-y-3">
            {drivers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Belum ada driver tersedia</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 mb-2">Pilih driver:</p>
                {drivers.map((d) => {
                  const taskCount = tasks.filter((t) => t.assignedTo === d.id && t.status !== 'Completed').length;
                  return (
                    <button key={d.id} onClick={() => handleAssign(d)} disabled={saving}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition-colors text-left disabled:opacity-50">
                      <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700 flex-shrink-0">
                        {d.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{d.full_name}</p>
                        <p className="text-[10px] text-slate-500">{d.position || '-'} · {taskCount} task aktif</p>
                      </div>
                      <Send className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </Modal>
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
        <TopBar title={navItems.find((n) => n.id === view)?.label} subtitle="Gudang Utama · Kediri" />
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