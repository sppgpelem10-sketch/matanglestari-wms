// src/hooks/usePurchaseOrders.js
import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

export function usePurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!isSupabaseEnabled()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: headers, error: hErr } = await supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (hErr) throw hErr;

      const poIds = (headers || []).map((h) => h.id);
      let lines = [];
      if (poIds.length > 0) {
        const { data: linesData, error: lErr } = await supabase
          .from('po_lines')
          .select('*')
          .in('po_id', poIds);
        if (lErr) throw lErr;
        lines = linesData || [];
      }

      const normalized = (headers || []).map((h) => {
        const hLines = lines.filter((l) => l.po_id === h.id);
        return {
          id: h.code,
          uuid: h.id,
          supplier: h.supplier_name,
          supplierId: h.supplier_id,
          date: h.date ? new Date(h.date).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric',
          }) : '-',
          expectedDate: h.expected_date ? new Date(h.expected_date).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric',
          }) : '-',
          items: hLines.length || 0,
          total: Number(h.total) || 0,
          status: h.status,
          notes: h.notes,
          lines: hLines.map((l) => ({
            sku: l.sku,
            name: l.name,
            qty: l.qty,
            unit: l.unit || 'dus',
            price: Number(l.price) || 0,
            subtotal: Number(l.subtotal) || 0,
          })),
        };
      });

      setOrders(normalized);
      setError(null);
    } catch (err) {
      console.error('[po] fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    if (!isSupabaseEnabled()) return;

    const channel = supabase
      .channel('po-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_orders' },
        () => fetchOrders()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  return { orders, loading, error, refetch: fetchOrders };
}