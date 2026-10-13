// src/lib/rentStore.js
// CRUD untuk sistem sewa bulanan

import { supabase, isSupabaseEnabled } from './supabase';

// ============ RENTALS (Penyewa) ============

export async function fetchRentals() {
  if (!isSupabaseEnabled()) return [];
  const { data, error } = await supabase
    .from('rentals')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createRental(input) {
  if (!isSupabaseEnabled()) throw new Error('Supabase tidak aktif');

  // Auto-generate code: SWA-YYYY-NNN
  const year = new Date().getFullYear();
  const { data: last } = await supabase
    .from('rentals')
    .select('code')
    .ilike('code', `SWA-${year}-%`)
    .order('code', { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (last && last[0]?.code) {
    const parts = last[0].code.split('-');
    nextNum = parseInt(parts[2] || '0', 10) + 1;
  }
  const code = `SWA-${year}-${String(nextNum).padStart(3, '0')}`;

  const { data, error } = await supabase
    .from('rentals')
    .insert({
      code,
      tenant_name: input.tenant_name,
      tenant_phone: input.tenant_phone || null,
      tenant_address: input.tenant_address || null,
      unit_name: input.unit_name,
      start_date: input.start_date,
      end_date: input.end_date || null,
      monthly_fee: Number(input.monthly_fee) || 0,
      status: input.status || 'Aktif',
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateRental(id, input) {
  if (!isSupabaseEnabled()) throw new Error('Supabase tidak aktif');
  const { data, error } = await supabase
    .from('rentals')
    .update({
      tenant_name: input.tenant_name,
      tenant_phone: input.tenant_phone || null,
      tenant_address: input.tenant_address || null,
      unit_name: input.unit_name,
      start_date: input.start_date,
      end_date: input.end_date || null,
      monthly_fee: Number(input.monthly_fee) || 0,
      status: input.status,
      notes: input.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRental(id) {
  if (!isSupabaseEnabled()) throw new Error('Supabase tidak aktif');
  const { error } = await supabase.from('rentals').delete().eq('id', id);
  if (error) throw error;
}

// ============ RENT INVOICES (Kwitansi) ============

export async function fetchRentInvoices() {
  if (!isSupabaseEnabled()) return [];
  const { data, error } = await supabase
    .from('rent_invoices')
    .select('*, rentals(id, code, tenant_name, unit_name, tenant_phone, tenant_address)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createRentInvoice(input) {
  if (!isSupabaseEnabled()) throw new Error('Supabase tidak aktif');

  // Auto-generate code: KWT-YYYY-NNN
  const year = new Date().getFullYear();
  const { data: last } = await supabase
    .from('rent_invoices')
    .select('code')
    .ilike('code', `KWT-${year}-%`)
    .order('code', { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (last && last[0]?.code) {
    const parts = last[0].code.split('-');
    nextNum = parseInt(parts[2] || '0', 10) + 1;
  }
  const code = `KWT-${year}-${String(nextNum).padStart(3, '0')}`;

  const { data, error } = await supabase
    .from('rent_invoices')
    .insert({
      code,
      rental_id: input.rental_id,
      period_month: Number(input.period_month),
      period_year: Number(input.period_year),
      amount: Number(input.amount) || 0,
      payment_date: input.payment_date || null,
      payment_method: input.payment_method || 'Cash',
      status: input.status || 'Belum Bayar',
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateRentInvoice(id, input) {
  if (!isSupabaseEnabled()) throw new Error('Supabase tidak aktif');
  const { data, error } = await supabase
    .from('rent_invoices')
    .update({
      rental_id: input.rental_id,
      period_month: Number(input.period_month),
      period_year: Number(input.period_year),
      amount: Number(input.amount) || 0,
      payment_date: input.payment_date || null,
      payment_method: input.payment_method,
      status: input.status,
      notes: input.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRentInvoice(id) {
  if (!isSupabaseEnabled()) throw new Error('Supabase tidak aktif');
  const { error } = await supabase.from('rent_invoices').delete().eq('id', id);
  if (error) throw error;
}

// ============ HELPERS ============

export const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];