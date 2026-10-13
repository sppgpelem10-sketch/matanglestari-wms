// src/admin/views/rentals/RentalsWrapper.jsx
import React, { useState } from 'react';
import { cn, Badge } from '../../../components/shared';
import RentalsView from './RentalsView';
import RentInvoicesView from './RentInvoicesView';

export default function RentalsWrapper() {
  const [tab, setTab] = useState('tenants');

  return (
    <div className="space-y-4">
      {/* TAB SWITCHER */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          <button
            onClick={() => setTab('tenants')}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2',
              tab === 'tenants'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            Data Penyewa
          </button>
          <button
            onClick={() => setTab('invoices')}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2',
              tab === 'invoices'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            Kwitansi Bulanan
          </button>
        </div>
      </div>

      {/* CONTENT */}
      {tab === 'tenants' && <RentalsView />}
      {tab === 'invoices' && <RentInvoicesView />}
    </div>
  );
}