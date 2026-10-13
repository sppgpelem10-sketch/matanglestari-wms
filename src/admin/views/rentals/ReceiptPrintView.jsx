// src/admin/views/rentals/ReceiptPrintView.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Loader } from 'lucide-react';
import { Button } from '../../../components/shared';
import { fetchRentInvoices } from '../../../lib/rentStore';
import { ReceiptDoc } from '../../../components/ReceiptTemplate';
import { printDocument } from '../../../components/DocumentTemplate';

export default function ReceiptPrintView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const all = await fetchRentInvoices();
        const found = all.find(x => x.id === id);
        setInvoice(found);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-6 h-6 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center text-slate-500">
        Kwitansi tidak ditemukan
        <div className="mt-4">
          <Button onClick={() => navigate('/admin-pus/rent-invoices')}>Kembali</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar — tidak ikut ke-print */}
      <div className="no-print bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        <Button icon={Printer} onClick={() => printDocument()}>Cetak Kwitansi</Button>
      </div>

      <div className="py-8">
        <ReceiptDoc invoice={invoice} rental={invoice.rentals} />
      </div>
    </div>
  );
}