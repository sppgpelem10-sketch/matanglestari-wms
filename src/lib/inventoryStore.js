// src/lib/inventoryStore.js
// ============================================
// Inventory Store — Supabase
// Semua operasi baca/tulis ke tabel `inventory`
// ============================================

import { supabase, isSupabaseEnabled } from './supabase';

let listeners = new Set();
let cache = [];

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn(cache);
    } catch (e) {
      console.error('[inventory] listener error:', e);
    }
  });
}

// ============ READ ============

export async function fetchInventory() {
  if (!isSupabaseEnabled()) {
    console.warn('[inventory] Supabase tidak aktif');
    return [];
  }

  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[inventory] fetch error:', error);
    throw error;
  }

  cache = data || [];
  notifyListeners();
  console.log('[inventory] fetched:', cache.length, 'items');
  return cache;
}

export function getInventory() {
  return cache;
}

// ============ ADJUST ============

export async function adjustStock(sku, amount, type = 'add') {
  if (!isSupabaseEnabled()) throw new Error('Supabase tidak aktif');

  const { data: current, error: fetchErr } = await supabase
    .from('inventory')
    .select('stock')
    .eq('sku', sku)
    .single();

  if (fetchErr) throw fetchErr;

  const delta = type === 'add' ? amount : -amount;
  const newStock = Math.max(0, (current?.stock || 0) + delta);

  const { data, error } = await supabase
    .from('inventory')
    .update({ stock: newStock, updated_at: new Date().toISOString() })
    .eq('sku', sku)
    .select()
    .single();

  if (error) throw error;

  const idx = cache.findIndex((i) => i.sku === sku);
  if (idx >= 0) {
    cache[idx] = data;
    notifyListeners();
  }

  return { sku, before: current.stock, after: newStock };
}

// ============ INBOUND ============

export async function addStockFromInbound(lines, meta = {}) {
  if (!isSupabaseEnabled()) throw new Error('Supabase tidak aktif');
  const updated = [];

  for (const line of lines) {
    const qty = line.qty || 0;
    if (qty <= 0) continue;

    const { data: current, error: fetchErr } = await supabase
      .from('inventory')
      .select('stock, name')
      .eq('sku', line.sku)
      .single();

    if (fetchErr && fetchErr.code === 'PGRST116') {
      const { data: inserted, error: insertErr } = await supabase
        .from('inventory')
        .insert({
          sku: line.sku,
          name: line.name || 'Produk Baru',
          stock: qty,
          unit: line.unit || 'dus',
        })
        .select()
        .single();

      if (!insertErr) {
        updated.push({ sku: line.sku, name: inserted.name, before: 0, after: qty, added: qty, isNew: true });
      }
      continue;
    }

    if (fetchErr) continue;

    const before = current.stock;
    const after = before + qty;

    const { data: updatedRow, error: updateErr } = await supabase
      .from('inventory')
      .update({ stock: after, updated_at: new Date().toISOString() })
      .eq('sku', line.sku)
      .select()
      .single();

    if (!updateErr) {
      updated.push({ sku: line.sku, name: updatedRow.name, before, after, added: qty });
    }
  }

  await fetchInventory();
  return updated;
}

// ============ OUTBOUND ============

export async function reduceStockFromOutbound(lines, meta = {}) {
  if (!isSupabaseEnabled()) throw new Error('Supabase tidak aktif');
  const updated = [];

  for (const line of lines) {
    const qty = line.qty || 0;
    if (qty <= 0) continue;

    const { data: current, error: fetchErr } = await supabase
      .from('inventory')
      .select('stock, name')
      .eq('sku', line.sku)
      .single();

    if (fetchErr) {
      updated.push({ sku: line.sku, name: line.name, before: 0, after: 0, reduced: 0, notFound: true });
      continue;
    }

    const before = current.stock;
    const after = Math.max(0, before - qty);
    const shortfall = before < qty ? (qty - before) : 0;

    const { data: updatedRow, error: updateErr } = await supabase
      .from('inventory')
      .update({ stock: after, updated_at: new Date().toISOString() })
      .eq('sku', line.sku)
      .select()
      .single();

    if (!updateErr) {
      updated.push({ sku: line.sku, name: updatedRow.name, before, after, reduced: qty, shortfall });
    }
  }

  await fetchInventory();
  return updated;
}

// ============ VALIDATE ============

export async function validateStock(lines) {
  if (!isSupabaseEnabled()) return [];
  const issues = [];

  for (const line of lines) {
    const { data: item } = await supabase
      .from('inventory')
      .select('stock, name')
      .eq('sku', line.sku)
      .single();

    if (!item) {
      issues.push({ sku: line.sku, name: line.name, issue: 'SKU tidak ditemukan', available: 0, needed: line.qty });
      continue;
    }

    if (item.stock < line.qty) {
      issues.push({ sku: line.sku, name: item.name, issue: 'Stok kurang', available: item.stock, needed: line.qty });
    }
  }

  return issues;
}

// ============ FIND ============

export function findBySku(sku) {
  return cache.find((i) => i.sku === sku) || null;
}

// ============ RESET ============

export async function resetInventory() {
  if (!isSupabaseEnabled()) return;

  const { data } = await supabase.from('inventory').select('id');
  if (data && data.length > 0) {
    const ids = data.map((d) => d.id);
    await supabase.from('inventory').delete().in('id', ids);
  }

  await supabase.from('inventory').insert([
    { sku: 'SKU-AM-001', name: 'Minyak Goreng Sania 2L', stock: 248, unit: 'dus' },
    { sku: 'SKU-BR-014', name: 'Beras Pandan Wangi 5kg', stock: 89, unit: 'karung' },
    { sku: 'SKU-GL-007', name: 'Gula Pasir Gulaku 1kg', stock: 512, unit: 'dus' },
    { sku: 'SKU-TP-023', name: 'Tepung Segitiga Biru 1kg', stock: 34, unit: 'dus' },
    { sku: 'SKU-MI-045', name: 'Mie Instan Indomie Goreng', stock: 1240, unit: 'dus' },
    { sku: 'SKU-KP-102', name: 'Kecap Manis Bango 520ml', stock: 23, unit: 'dus' },
  ]);

  await fetchInventory();
}

// ============ SUBSCRIBE ============

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}