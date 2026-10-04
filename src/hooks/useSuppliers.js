// src/hooks/useSuppliers.js
import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSuppliers = useCallback(async () => {
    if (!isSupabaseEnabled()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      // Normalize biar format sama kayak mock
      const normalized = (data || []).map((s) => ({
        id: s.id,           // UUID
        code: s.code,       // SUP-001
        name: s.name,
        contact: s.contact_name,
        phone: s.phone,
        email: s.email,
        address: s.address,
      }));

      setSuppliers(normalized);
      setError(null);
    } catch (err) {
      console.error('[suppliers] fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  return { suppliers, loading, error, refetch: fetchSuppliers };
}