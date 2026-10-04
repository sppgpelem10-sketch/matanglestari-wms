// src/lib/orderHelpers.js
// ============================================
// Helper create Purchase Order & Sales Order ke Supabase
// ============================================

import { supabase } from './supabase';

// ============ CREATE PO ============

export async function createPurchaseOrder(data) {
  const total = data.lines.reduce((s, l) => s + (l.qty * l.price), 0);

  const { data: header, error: hErr } = await supabase
    .from('purchase_orders')
    .insert({
      code: data.code,
      supplier_id: data.supplierId,
      supplier_name: data.supplierName,
      date: data.date || new Date().toISOString().slice(0, 10),
      expected_date: data.expectedDate || null,
      status: data.status || 'Draft',
      total,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (hErr) throw hErr;

  const linesPayload = data.lines.map((l) => ({
    po_id: header.id,
    sku: l.sku,
    name: l.name,
    qty: l.qty,
    unit: l.unit || 'dus',
    price: l.price,
    subtotal: l.qty * l.price,
  }));

  const { error: lErr } = await supabase.from('po_lines').insert(linesPayload);
  if (lErr) throw lErr;

  return header;
}

export async function updatePOStatus(uuid, status) {
  const { error } = await supabase
    .from('purchase_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', uuid);
  if (error) throw error;
}

// ============ CREATE SO ============

export async function createSalesOrder(data) {
  const total = data.lines.reduce((s, l) => s + (l.qty * l.price), 0);

  const { data: header, error: hErr } = await supabase
    .from('sales_orders')
    .insert({
      code: data.code,
      customer_name: data.customerName,
      customer_address: data.customerAddress || null,
      customer_contact: data.customerContact || null,
      customer_phone: data.customerPhone || null,
      date: data.date || new Date().toISOString().slice(0, 10),
      status: data.status || 'Diproses',
      total,
      courier: data.courier || null,
      courier_contact: data.courierContact || null,
      vehicle: data.vehicle || null,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (hErr) throw hErr;

  const linesPayload = data.lines.map((l) => ({
    so_id: header.id,
    sku: l.sku,
    name: l.name,
    qty: l.qty,
    unit: l.unit || 'dus',
    price: l.price,
    subtotal: l.qty * l.price,
  }));

  const { error: lErr } = await supabase.from('so_lines').insert(linesPayload);
  if (lErr) throw lErr;

  return header;
}

export async function updateSOStatus(uuid, status) {
  const { error } = await supabase
    .from('sales_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', uuid);
  if (error) throw error;
}

// ============ GENERATE CODES ============

export function generatePOCode() {
  return `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export function generateSOCode() {
  return `SO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

// ============ SUPPLIER ============

export async function createSupplier(data) {
  const code = data.code || `SUP-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`;

  const { data: supplier, error } = await supabase
    .from('suppliers')
    .insert({
      code,
      name: data.name,
      contact_name: data.contactName || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return supplier;
}

export function generateSupplierCode() {
  return `SUP-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`;
}