// src/admin/views/FinanceView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Target, Plus, Download,
  X, FileText, Wallet, Users, Loader, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { cn, Badge, Button, Input, Modal } from '../../components/shared';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { CHART_COLORS } from './ChartColors';

function formatRupiah(n) {
  if (!n && n !== 0) return 'Rp 0';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

function formatShortRupiah(n) {
  if (!n && n !== 0) return 'Rp 0';
  const num = Number(n);
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)}M`;
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(0)}jt`;
  if (num >= 1_000) return `Rp ${(num / 1_000).toFixed(0)}rb`;
  return `Rp ${num}`;
}

function getMonthRange(monthTs) {
  const ref = new Date(monthTs);
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    monthKey: `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`,
    monthLabel: ref.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
  };
}

export default function FinanceView() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showOpsForm, setShowOpsForm] = useState(false);

  // Data dari DB
  const [revenue, setRevenue] = useState(0);
  const [purchaseCost, setPurchaseCost] = useState(0);
  const [payrollCost, setPayrollCost] = useState(0);
  const [opsCost, setOpsCost] = useState(0);
  const [opsList, setOpsList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [history, setHistory] = useState([]);

  // Month yang lagi dilihat
  const currentMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return getMonthRange(d.getTime());
  }, [monthOffset]);

  // Load data dari Supabase
  const loadData = async () => {
    if (!isSupabaseEnabled()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { start, end, monthKey } = currentMonth;

      // 1. Revenue dari sales_orders
      const { data: soData } = await supabase
        .from('sales_orders')
        .select('code, customer_name, date, total, status')
        .in('status', ['Selesai', 'Dikirim'])
        .gte('date', start)
        .lte('date', end);

      const totalRevenue = (soData || []).reduce((s, so) => s + Number(so.total || 0), 0);
      setRevenue(totalRevenue);

      // 2. Purchase cost dari purchase_orders
      const { data: poData } = await supabase
        .from('purchase_orders')
        .select('code, supplier_name, date, total, status')
        .in('status', ['Diterima', 'Selesai'])
        .gte('date', start)
        .lte('date', end);

      const totalPurchase = (poData || []).reduce((s, po) => s + Number(po.total || 0), 0);
      setPurchaseCost(totalPurchase);

      // 3. Payroll cost dari payroll_approvals (yang approved)
      const { data: payrollData } = await supabase
        .from('payroll_approvals')
        .select('total_payroll, status')
        .eq('month_key', monthKey)
        .eq('status', 'approved')
        .maybeSingle();

      setPayrollCost(Number(payrollData?.total_payroll || 0));

      // 4. Ops cost dari tabel operational_costs (kalau ada)
      // Kalau belum ada tabelnya, skip — nanti bisa ditambah
      const { data: opsData } = await supabase
        .from('operational_costs')
        .select('*')
        .eq('month_key', monthKey);
      
      const totalOps = (opsData || []).reduce((s, o) => s + Number(o.amount || 0), 0);
      setOpsCost(totalOps);
      setOpsList(opsData || []);

      // 5. Transactions (gabungan semua)
      const txs = [];

      (soData || []).forEach((so) => {
        txs.push({
          date: new Date(so.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          type: 'in',
          category: 'Penjualan',
          description: `${so.code} - ${so.customer_name}`,
          amount: Number(so.total),
          source: 'SO',
        });
      });

      (poData || []).forEach((po) => {
        txs.push({
          date: new Date(po.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          type: 'out',
          category: 'Pembelian',
          description: `${po.code} - ${po.supplier_name}`,
          amount: Number(po.total),
          source: 'PO',
        });
      });

      if (payrollData?.total_payroll) {
        txs.push({
          date: 'Akhir bulan',
          type: 'out',
          category: 'Payroll',
          description: 'Gaji karyawan bulan ini',
          amount: Number(payrollData.total_payroll),
          source: 'Payroll',
        });
      }

      (opsData || []).forEach((o) => {
        txs.push({
          date: o.date || '-',
          type: 'out',
          category: o.category || 'Operational',
          description: o.description || '-',
          amount: Number(o.amount),
          source: 'Ops',
        });
      });

      setTransactions(txs);

      // 6. History 6 bulan (untuk chart)
      const historyData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const hRange = getMonthRange(d.getTime());
        
        // Fetch SO bulan itu
        const { data: hSO } = await supabase
          .from('sales_orders')
          .select('total')
          .in('status', ['Selesai', 'Dikirim'])
          .gte('date', hRange.start)
          .lte('date', hRange.end);

        const { data: hPO } = await supabase
          .from('purchase_orders')
          .select('total')
          .in('status', ['Diterima', 'Selesai'])
          .gte('date', hRange.start)
          .lte('date', hRange.end);

        const { data: hPayroll } = await supabase
          .from('payroll_approvals')
          .select('total_payroll')
          .eq('month_key', hRange.monthKey)
          .eq('status', 'approved')
          .maybeSingle();

        const { data: hOps } = await supabase
          .from('operational_costs')
          .select('amount')
          .eq('month_key', hRange.monthKey);

        const hRev = (hSO || []).reduce((s, x) => s + Number(x.total || 0), 0);
        const hPur = (hPO || []).reduce((s, x) => s + Number(x.total || 0), 0);
        const hPay = Number(hPayroll?.total_payroll || 0);
        const hOpsTotal = (hOps || []).reduce((s, x) => s + Number(x.amount || 0), 0);
        const hCost = hPur + hPay + hOpsTotal;

        historyData.push({
          month: hRange.monthKey,
          label: d.toLocaleDateString('id-ID', { month: 'short' }),
          revenue: hRev,
          cost: hCost,
          profit: hRev - hCost,
        });
      }
      setHistory(historyData);
    } catch (err) {
      console.error('[finance] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [monthOffset]);

  // Total cost & profit
  const totalCost = purchaseCost + payrollCost + opsCost;
  const netProfit = revenue - totalCost;
  const margin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0.0';

  // Kategori pie chart
  const categoryData = [
    { name: 'Payroll', value: payrollCost, color: CHART_COLORS.categories.payroll },
    { name: 'Purchase', value: purchaseCost, color: CHART_COLORS.categories.purchase },
    { name: 'Operational', value: opsCost, color: CHART_COLORS.categories.operational },
  ].filter((c) => c.value > 0);

  // Handle tambah ops cost
  const handleAddOpsCost = async (data) => {
    if (!isSupabaseEnabled()) return;
    try {
      const { error } = await supabase
        .from('operational_costs')
        .insert({
          month_key: currentMonth.monthKey,
          category: data.category,
          description: data.description,
          amount: data.amount,
          date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        });

      if (error) {
        // Tabel belum ada — kasih tau user
        if (error.code === '42P01') {
          alert('Tabel operational_costs belum ada. Bikin dulu via SQL Editor.');
          return;
        }
        throw error;
      }

      await loadData();
      setShowOpsForm(false);
      alert('✅ Biaya operasional berhasil ditambahkan');
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memuat data keuangan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthOffset(monthOffset - 1)}
            className="w-8 h-8 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center"
          >
            ←
          </button>
          <div className="px-4 py-2 bg-white border border-slate-300 rounded-lg min-w-[200px] text-center">
            <p className="text-sm font-bold text-slate-900 capitalize">{currentMonth.monthLabel}</p>
          </div>
          <button
            onClick={() => setMonthOffset(Math.min(0, monthOffset + 1))}
            disabled={monthOffset >= 0}
            className="w-8 h-8 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center disabled:opacity-40"
          >
            →
          </button>
          <button
            onClick={loadData}
            className="w-8 h-8 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <Button icon={Plus} onClick={() => setShowOpsForm(true)}>
          Input Biaya Operasional
        </Button>
      </div>

      {/* 4 Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center mb-3">
            <DollarSign className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Revenue</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            {formatRupiah(revenue)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Dari SO selesai/dikirim</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center mb-3">
            <Wallet className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Total Cost</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            {formatRupiah(totalCost)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">PO + Payroll + Ops</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Net Profit</p>
          <p className={cn(
            'text-xl font-bold mt-1 tabular-nums',
            netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
          )}>
            {formatRupiah(netProfit)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Revenue − Cost</p>
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
          <p className="text-[10px] text-slate-400 mt-0.5">Profit / Revenue</p>
        </div>
      </div>

      {/* Grafik + Pie */}
      <div className="grid grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Trend Revenue vs Cost</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">6 bulan terakhir</p>
          </div>
          {history.some((h) => h.revenue > 0 || h.cost > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="label" stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} />
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
          ) : (
            <div className="h-[280px] flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Belum ada data transaksi</p>
              </div>
            </div>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Kategori Pengeluaran</h3>
          {categoryData.length > 0 ? (
            <>
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
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: c.color }} />
                      <span className="text-slate-600">{c.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatShortRupiah(c.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-xs text-slate-500">Belum ada pengeluaran</p>
            </div>
          )}
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
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-slate-500 text-xs">
                  Belum ada transaksi bulan ini
                </td>
              </tr>
            )}
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
        monthLabel={currentMonth.monthLabel}
      />
    </div>
  );
}

// ============ FORM OPS COST ============

function OpsCostModal({ open, onClose, onSave, monthLabel }) {
  const [category, setCategory] = useState('Listrik & Air');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  const categories = [
    'Listrik & Air',
    'Sewa Gudang',
    'BBM & Transport',
    'Maintenance',
    'Konsumsi',
    'Lainnya',
  ];

  const canSave = description && amount > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ category, description, amount });
      setDescription('');
      setAmount(0);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Input Biaya Operasional"
      subtitle={monthLabel} size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kategori</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 tabular-nums"
          />
          {amount > 0 && (
            <p className="text-[11px] text-slate-500 mt-1.5">= {formatRupiah(amount)}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Batal</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}