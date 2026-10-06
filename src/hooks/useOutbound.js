// src/hooks/useOutbound.js
import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

export function useOutbound() {
  const [outbounds, setOutbounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOutbounds = useCallback(async () => {
    if (!isSupabaseEnabled()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: headers, error: hErr } = await supabase
        .from('outbound')
        .select('*')
        .order('created_at', { ascending: false });

      if (hErr) throw hErr;

      const outboundIds = (headers || []).map((h) => h.id);
      let lines = [];
      if (outboundIds.length > 0) {
        const { data: linesData, error: lErr } = await supabase
          .from('outbound_lines')
          .select('*')
          .in('outbound_id', outboundIds);
        if (lErr) throw lErr;
        lines = linesData || [];
      }

      const normalized = (headers || []).map((h) => {
        const hLines = lines.filter((l) => l.outbound_id === h.id);
        return {
          id: h.code,
          uuid: h.id,
          date: h.date,
          time: h.time,
          customer: h.customer,
          customerAddress: h.customer_address || null,
          customerPhone: h.customer_phone || null,
          customerContact: h.customer_contact || null,
          soId: h.so_id,
          driver: h.driver,
          driverId: h.driver_id,
          staffName: h.staff_name,
          items: h.items,
          totalQty: h.total_qty,
          subtotal: Number(h.subtotal) || 0,
          photos: h.photos || [],
          notes: h.notes,
          status: h.status,
          lines: hLines.map((l) => ({
            sku: l.sku,
            name: l.name,
            qty: l.qty,
            unit: l.unit,
            price: Number(l.price) || 0,
            subtotal: Number(l.subtotal) || 0,
          })),
        };
      });

      setOutbounds(normalized);
      setError(null);
    } catch (err) {
      console.error('[outbound] fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOutbounds();

    if (!isSupabaseEnabled()) return;

    const channel = supabase
      .channel('outbound-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'outbound' },
        () => fetchOutbounds()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOutbounds]);

  return { outbounds, loading, error, refetch: fetchOutbounds, setOutbounds };
}