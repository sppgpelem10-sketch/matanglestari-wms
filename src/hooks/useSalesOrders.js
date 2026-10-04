// src/hooks/useSalesOrders.js
import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

export function useSalesOrders() {
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
        .from('sales_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (hErr) throw hErr;

      const soIds = (headers || []).map((h) => h.id);
      let lines = [];
      if (soIds.length > 0) {
        const { data: linesData, error: lErr } = await supabase
          .from('so_lines')
          .select('*')
          .in('so_id', soIds);
        if (lErr) throw lErr;
        lines = linesData || [];
      }

      const normalized = (headers || []).map((h) => {
        const hLines = lines.filter((l) => l.so_id === h.id);
        return {
          id: h.code,
          uuid: h.id,
          customer: h.customer_name,
          customerAddress: h.customer_address,
          customerContact: h.customer_contact,
          customerPhone: h.customer_phone,
          date: h.date ? new Date(h.date).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric',
          }) : '-',
          items: hLines.length || 0,
          total: Number(h.total) || 0,
          status: h.status,
          courier: h.courier,
          vehicle: h.vehicle,
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
      console.error('[so] fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    if (!isSupabaseEnabled()) return;

    const channel = supabase
      .channel('so-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sales_orders' },
        () => fetchOrders()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  return { orders, loading, error, refetch: fetchOrders };
}