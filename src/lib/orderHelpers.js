// src/lib/orderHelpers.js
// ============================================
// Helper create PO, SO, Task, Inbound, Outbound
// ============================================

import { supabase } from './supabase';

// ============ GENERATE CODES ============

function genCode(prefix) {
  return `${prefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export function generatePOCode() { return genCode('PO'); }
export function generateSOCode() { return genCode('SO'); }
export function generateOUTCode() { return genCode('OUT'); }
export function generateINBCode() { return genCode('INB'); }
export function generateTaskCode() { return genCode('TSK'); }
export function generateSupplierCode() {
  return `SUP-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`;
}

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
// Setelah SO dibuat → auto-create Outbound Pending
// Outbound sudah include: customer_address, customer_phone, subtotal, price di lines

export async function createSalesOrder(data) {
  const total = data.lines.reduce((s, l) => s + (l.qty * l.price), 0);

  // 1. Insert SO header
  const { data: soHeader, error: soErr } = await supabase
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

  if (soErr) throw soErr;

  // 2. Insert SO lines
  const soLinesPayload = data.lines.map((l) => ({
    so_id: soHeader.id,
    sku: l.sku,
    name: l.name,
    qty: l.qty,
    unit: l.unit || 'dus',
    price: l.price,
    subtotal: l.qty * l.price,
  }));

  const { error: soLinesErr } = await supabase
    .from('so_lines')
    .insert(soLinesPayload);

  if (soLinesErr) throw soLinesErr;

  // 3. AUTO-CREATE OUTBOUND (include customer_address, phone, subtotal, price di lines)
  let outboundHeader = null;
  try {
    const totalPrice = data.lines.reduce((s, l) => s + (l.qty * l.price), 0);

    const { data: outHeader, error: outErr } = await supabase
      .from('outbound')
      .insert({
        code: generateOUTCode(),
        date: data.date || new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        customer: data.customerName,
        customer_address: data.customerAddress || null,
        customer_phone: data.customerPhone || null,
        customer_contact: data.customerContact || null,
        so_id: soHeader.id,
        driver: null,
        driver_id: null,
        staff_name: null,
        items: data.lines.length,
        total_qty: data.lines.reduce((s, l) => s + (l.qty || 0), 0),
        subtotal: totalPrice,
        photos: [],
        notes: data.notes || null,
        status: 'Pending',
      })
      .select()
      .single();

    if (outErr) throw outErr;
    outboundHeader = outHeader;

    const outLinesPayload = data.lines.map((l) => ({
      outbound_id: outHeader.id,
      sku: l.sku,
      name: l.name,
      qty: l.qty,
      unit: l.unit || 'dus',
      price: l.price || 0,
      subtotal: (l.qty || 0) * (l.price || 0),
    }));

    const { error: outLinesErr } = await supabase
      .from('outbound_lines')
      .insert(outLinesPayload);

    if (outLinesErr) throw outLinesErr;

    console.log('[SO] ✅ Auto-created outbound:', outHeader.code);
  } catch (autoErr) {
    console.error('[SO] ❌ Auto-create outbound failed:', autoErr);
  }

  return { header: soHeader, outboundHeader };
}

export async function updateSOStatus(uuid, status) {
  const { error } = await supabase
    .from('sales_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', uuid);
  if (error) throw error;
}

// ============ CREATE TASK FROM OUTBOUND ============
// Dipanggil saat outbound di-Ship → auto-create Task Dispatch

export async function createTaskFromOutbound(outbound) {
  try {
    const { data: lines } = await supabase
      .from('outbound_lines')
      .select('qty')
      .eq('outbound_id', outbound.id);

    const totalItems = (lines || []).reduce((s, l) => s + (l.qty || 0), 0);

    // Cegah duplikat
    if (outbound.soId) {
      const { data: existing } = await supabase
        .from('tasks')
        .select('id, code')
        .eq('so_id', outbound.soId)
        .maybeSingle();

      if (existing) {
        console.log('[Task] sudah ada untuk SO ini:', existing.code);
        return existing;
      }
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        code: generateTaskCode(),
        so_id: outbound.soId || null,
        customer: outbound.customer,
        address: outbound.customerAddress || outbound.address || null,
        phone: outbound.customerPhone || null,
        items: totalItems,
        status: 'Pending',
        assigned_to: null,
        assigned_to_name: null,
        started_at: null,
        completed_at: null,
      })
      .select()
      .single();

    if (error) throw error;

    console.log('[Outbound] ✅ Auto-created task:', task.code);
    return task;
  } catch (err) {
    console.error('[Outbound] ❌ Auto-create task failed:', err);
    return null;
  }
}

// ============ CREATE INBOUND FROM PO ============

export async function createInboundFromPO(po) {
  try {
    const { data: existing } = await supabase
      .from('inbound')
      .select('id, code')
      .eq('po_id', po.id)
      .maybeSingle();

    if (existing) {
      console.log('[Inbound] sudah ada untuk PO ini:', existing.code);
      return existing;
    }

    const { data: poLines } = await supabase
      .from('po_lines')
      .select('sku, name, qty, unit')
      .eq('po_id', po.id);

    const lines = poLines || [];
    const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0);

    const { data: inbound, error } = await supabase
      .from('inbound')
      .insert({
        code: generateINBCode(),
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        supplier_id: po.supplierId,
        supplier_name: po.supplierName,
        po_id: po.id,
        staff_id: null,
        staff_name: null,
        items: lines.length,
        total_qty: totalQty,
        photos: [],
        notes: null,
        status: 'Pending',
      })
      .select()
      .single();

    if (error) throw error;

    if (lines.length > 0) {
      const inboundLines = lines.map((l) => ({
        inbound_id: inbound.id,
        sku: l.sku,
        name: l.name,
        qty: l.qty,
        unit: l.unit || 'dus',
      }));

      const { error: linesErr } = await supabase
        .from('inbound_lines')
        .insert(inboundLines);

      if (linesErr) throw linesErr;
    }

    console.log('[PO] ✅ Auto-created inbound:', inbound.code);
    return inbound;
  } catch (err) {
    console.error('[PO] ❌ Auto-create inbound failed:', err);
    return null;
  }
}

// ============ SUPPLIER ============

export async function createSupplier(data) {
  const code = data.code || generateSupplierCode();

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