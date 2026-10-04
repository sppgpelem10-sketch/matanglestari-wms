// src/hooks/useInventory.js
import { useState, useEffect } from 'react';
import { fetchInventory, getInventory, subscribe } from '../lib/inventoryStore';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

export function useInventory() {
  const [items, setItems] = useState(() => getInventory());

  useEffect(() => {
    // Fetch dari Supabase saat mount
    fetchInventory().catch((err) => console.error('[useInventory] fetch error:', err));

    // Subscribe ke store (biar re-render saat ada update)
    const unsubscribe = subscribe((newItems) => {
      setItems([...newItems]);
    });

    // Realtime subscription
    let channel = null;
    if (isSupabaseEnabled()) {
      channel = supabase
        .channel('inventory-realtime')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'inventory' },
          () => { fetchInventory().catch(() => {}); }
        )
        .subscribe();
    }

    return () => {
      unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return items;
}