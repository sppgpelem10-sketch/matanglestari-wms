// src/admin/views/FinanceView.jsx
import React, { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Target, Plus, Download,
  X, Calendar, FileText, Building2, Users, Wallet,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { cn, Badge, Button, Input, Modal } from '../../components/shared';
import { FINANCIAL_HISTORY, OPERATIONAL_COSTS, SALES_ORDERS, PURCHASE_ORDERS } from '../../lib/mockData';
import { CHART_COLORS } from './ChartColors';

function formatRupiah(n) {
  if (!n && n !== 0) return 'Rp 0';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatShortRupiah(n) {
  if (!n) return 'Rp 0';
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n}`;
}

export default function FinanceView() {
  const [showOpsForm, setShowOpsForm] = useState(false);
  const [opsCosts, setOpsCosts] = useState(OPERATIONAL_COSTS);
  const [monthOffset, setMonthOffset] = useState(0);

  // Bulan yang lagi dilihat
  const currentMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      shortLabel: d.toLocaleDateString('id-ID', { month: 'short' }),
    };
  }, [monthOffset]);

  // Ambil data finansial bulan ini dari mock history
  const monthData = useMemo(() => {
    const found = FINANCIAL_HISTORY.find((h) => h.month === currentMonth.key);
    if (found) return found;

    // Fallback: hitung dari SO + PO + Ops
    const revenue = SALES_ORDERS
      .filter((so) => so.status === 'Selesai' || so.status === 'Dikirim')
      .reduce((s, so) => s + so.total, 0);
    const purchaseCost = PURCHASE_ORDERS
      .filter((po) => po.status === 'Diterima' || po.status === 'Selesai')
      .reduce((s, po) => s + po.total, 0);
    const payrollCost = 0; // mock total payroll
    const opsCost = opsCosts
      .filter((o) => o.month === currentMonth.key)
      .reduce((s, o) => s + o.amount, 0);
    const cost = purchaseCost + payrollCost + opsCost;
    return {
      month: currentMonth.key,
      label: currentMonth.shortLabel,
      revenue,
      cost,
      profit: revenue - cost,
    };
  }, [currentMonth, opsCosts]);

  const margin = monthData.revenue > 0
    ? ((monthData.profit / monthData.revenue) * 100).toFixed(1)
    : '0.0';

  const prevMonth = useMemo(() => {
    const idx = FINANCIAL_HISTORY.findIndex((h) => h.month === currentMonth.key);
    if (idx > 0) return FINANCIAL_HISTORY[idx - 1];
    return null;
  }, [currentMonth]);

  const revenueDelta = prevMonth
    ? (((monthData.revenue - prevMonth.revenue) / prevMonth.revenue) * 100).toFixed(1)
    : null;
  const profitDelta = prevMonth
    ? (((monthData.profit - prevMonth.profit) / prevMonth.profit) * 100).toFixed(1)
    : null;

  // Pie chart kategori
  const categoryData = useMemo(() => {
    const opsCost = opsCosts
      .filter((o) => o.month === currentMonth.key)
      .reduce((s, o) => s + o.amount, 0);
    const purchaseCost = PURCHASE_ORDERS
      .filter((po) => po.status === 'Diterima' || po.status === 'Selesai')
      .reduce((s, po) => s + po.total, 0);
    const payrollCost = 0;

    return [
      { name: 'Payroll', value: payrollCost, color: CHART_COLORS.categories.payroll },
      { name: 'Purchase', value: purchaseCost, color: CHART_COLORS.categories.purchase },
      { name: 'Operational', value: opsCost, color: CHART_COLORS.categories.operational },
    ];
  }, [currentMonth, opsCosts]);

  const handleAddOpsCost = (data) => {
    const newCost = {
      id: `OPS-${Date.now()}`,
      month: currentMonth.key,
      category: data.category,
      description: data.description,
      amount: data.amount,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    };
    setOpsCosts((prev) => [...prev, newCost]);
    setShowOpsForm(false);
  };

  // Tabel transaksi bulan ini
  const transactions = useMemo(() => {
    const rows = [];

    SALES_ORDERS.forEach((so) => {
      if (so.status === 'Selesai' || so.status === 'Dikirim') {
        rows.push({
          date: so.date,
          type: 'in',
          category: 'Penjualan',
          description: `${so.id} — ${so.customer}`,
          amount: so.total,
          source: 'SO',
        });
      }
    });

    PURCHASE_ORDERS.forEach((po) => {
      if (po.status === 'Diterima' || po.status === 'Selesai') {
        rows.push({
          date: po.date,
          type: 'out',
          category: 'Pembelian',
          description: `${po.id} — ${po.supplier}`,
          amount: po.total,
          source: 'PO',
        });
      }
    });

    rows.push({
      date: 'Akhir bulan',
      type: 'out',
      category: 'Payroll',
      description: 'Gaji karyawan bulan ini',
      amount: 0,
      source: 'Payroll',
    });

    opsCosts
      .filter((o) => o.month === currentMonth.key)
      .forEach((o) => {
        rows.push({
          date: o.date,
          type: 'out',
          category: o.category,
          description: o.description,
          amount: o.amount,
          source: 'Ops',
        });
      });

    return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [currentMonth, opsCosts]);

  return (
    <div className="space-y-6">
      {/* Header: filter bulan */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthOffset(monthOffset - 1)}
            className="w-8 h-8 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center"
          >
            ←
          </button>
          <div className="px-4 py-2 bg-white border border-slate-300 rounded-lg min-w-[200px] text-center">
            <p className="text-sm font-bold text-slate-900 capitalize">{currentMonth.label}</p>
          </div>
          <button
            onClick={() => setMonthOffset(Math.min(0, monthOffset + 1))}
            disabled={monthOffset >= 0}
            className="w-8 h-8 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center disabled:opacity-40"
          >
            →
          </button>
        </div>
        <Button icon={Plus} onClick={() => setShowOpsForm(true)}>
          Input Biaya Operasional
        </Button>
      </div>

      {/* 4 Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-indigo-600" />
            </div>
            {revenueDelta && (
              <div className={cn(
                'flex items-center gap-1 text-xs font-semibold',
                Number(revenueDelta) >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {Number(revenueDelta) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(Number(revenueDelta))}%
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">Revenue</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            {formatRupiah(monthData.revenue)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center mb-3">
            <Wallet className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Total Cost</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            {formatRupiah(monthData.cost)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            {profitDelta && (
              <div className={cn(
                'flex items-center gap-1 text-xs font-semibold',
                Number(profitDelta) >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {Number(profitDelta) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(Number(profitDelta))}%
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">Net Profit</p>
          <p className={cn(
            'text-xl font-bold mt-1 tabular-nums',
            monthData.profit >= 0 ? 'text-emerald-600' : 'text-red-600'
          )}>
            {formatRupiah(monthData.profit)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
            <Target className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Margin</p>
          <p className={cn(
            'text-xl font-bold mt-1 tabular-nums',
            Number(margin) >= 20 ? 'text-emerald-600' :
            Number(margin) >= 10 ? 'text-amber-600' : 'text-red-600'
          )}>
            {margin}%
          </p>
        </div>
      </div>

      {/* Grafik trend */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Trend Revenue vs Cost</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">6 bulan terakhir</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={FINANCIAL_HISTORY}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="label"
                stroke={CHART_COLORS.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={CHART_COLORS.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatShortRupiah(v).replace('Rp ', '')}
              />
              <Tooltip
                formatter={(value) => formatRupiah(value)}
                contentStyle={{
                  background: CHART_COLORS.tooltip.bg,
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 11,
                  color: CHART_COLORS.tooltip.text,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="revenue" name="Revenue" fill={CHART_COLORS.revenue} radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" name="Cost" fill={CHART_COLORS.cost} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Kategori Pengeluaran</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {categoryData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatRupiah(value)}
                contentStyle={{
                  background: CHART_COLORS.tooltip.bg,
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 11,
                  color: CHART_COLORS.tooltip.text,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-3">
            {categoryData.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ background: c.color }}
                  />
                  <span className="text-slate-600">{c.name}</span>
                </div>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {formatShortRupiah(c.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabel transaksi */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Transaksi Bulan Ini</h3>
          <Badge variant="neutral">{transactions.length} transaksi</Badge>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-600 uppercase">Tanggal</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-600 uppercase">Kategori</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-600 uppercase">Deskripsi</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-600 uppercase">Sumber</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-600 uppercase">Jumlah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((t, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-5 py-2.5 text-slate-600 text-xs">{t.date}</td>
                <td className="px-5 py-2.5">
                  <Badge variant={
                    t.type === 'in' ? 'success' :
                    t.category === 'Payroll' ? 'info' : 'warning'
                  }>
                    {t.category}
                  </Badge>
                </td>
                <td className="px-5 py-2.5 text-slate-900">{t.description}</td>
                <td className="px-5 py-2.5">
                  <span className="text-[10px] font-mono text-slate-500">{t.source}</span>
                </td>
                <td className={cn(
                  'px-5 py-2.5 text-right tabular-nums font-semibold',
                  t.type === 'in' ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {t.type === 'in' ? '+' : '−'} {formatRupiah(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal input ops cost */}
      <OpsCostModal
        open={showOpsForm}
        onClose={() => setShowOpsForm(false)}
        onSave={handleAddOpsCost}
        monthLabel={currentMonth.label}
      />
    </div>
  );
}

// ============ FORM OPS COST ============

function OpsCostModal({ open, onClose, onSave, monthLabel }) {
  const [category, setCategory] = useState('Listrik & Air');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);

  const categories = [
    'Listrik & Air',
    'Sewa Gudang',
    'BBM & Transport',
    'Maintenance',
    'Konsumsi',
    'Lainnya',
  ];

  const canSave = description && amount > 0;

  const handleSave = () => {
    onSave({ category, description, amount });
    setDescription('');
    setAmount(0);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Input Biaya Operasional"
      subtitle={monthLabel}
      size="sm"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kategori</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <Input
          label="Deskripsi"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Contoh: Bayar listrik gudang"
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jumlah (Rp)</label>
          <input
            type="number"
            value={amount || ''}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="0"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums"
          />
          {amount > 0 && (
            <p className="text-[11px] text-slate-500 mt-1.5">
              = {formatRupiah(amount)}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            Simpan
          </Button>
        </div>
      </div>
    </Modal>
  );
}