// src/hooks/useInbound.js
import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

export function useInbound() {
  const [inbounds, setInbounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInbounds = useCallback(async () => {
    if (!isSupabaseEnabled()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch inbound + lines
      const { data: headers, error: hErr } = await supabase
        .from('inbound')
        .select('*')
        .order('created_at', { ascending: false });

      if (hErr) throw hErr;

      // Fetch lines untuk semua inbound
      const inboundIds = (headers || []).map((h) => h.id);
      let lines = [];
      if (inboundIds.length > 0) {
        const { data: linesData, error: lErr } = await supabase
          .from('inbound_lines')
          .select('*')
          .in('inbound_id', inboundIds);
        if (lErr) throw lErr;
        lines = linesData || [];
      }

      // Gabungin
      const normalized = (headers || []).map((h) => {
        const hLines = lines.filter((l) => l.inbound_id === h.id);
        const date = h.date;
        return {
          id: h.code, // pakai code sebagai ID display
          uuid: h.id,
          date: date,
          time: h.time,
          supplier: h.supplier_name,
          supplierId: h.supplier_id,
          poId: h.po_id,
          staffName: h.staff_name,
          items: h.items,
          totalQty: h.total_qty,
          photos: h.photos || [],
          notes: h.notes,
          status: h.status,
          lines: hLines.map((l) => ({
            sku: l.sku,
            name: l.name,
            qty: l.qty,
            unit: l.unit,
          })),
        };
      });

      setInbounds(normalized);
      setError(null);
    } catch (err) {
      console.error('[inbound] fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInbounds();

    if (!isSupabaseEnabled()) return;

    const channel = supabase
      .channel('inbound-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'inbound' },
        () => fetchInbounds()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchInbounds]);

  return { inbounds, loading, error, refetch: fetchInbounds, setInbounds };
}