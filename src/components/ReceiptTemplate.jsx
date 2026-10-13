// src/components/ReceiptTemplate.jsx
import React from 'react';
import { COMPANY } from '../lib/companyConfig';
import { terbilangRupiah } from '../lib/terbilang';
import { BULAN_ID } from '../lib/rentStore';
import './PrintStyles.css';

function formatRupiah(n) {
  if (!n && n !== 0) return '0';
  return Number(n).toLocaleString('id-ID');
}

function formatTanggalIndo(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function ReceiptDoc({ invoice, rental }) {
  const isLunas = invoice.status === 'Lunas';
  const periode = `${BULAN_ID[(invoice.period_month || 1) - 1]} ${invoice.period_year}`;

  return (
    <div className="receipt-page doc-print-root">
      {/* HEADER */}
      <div className="receipt-header">
        <div className="receipt-logo">
          {COMPANY.logoFull ? (
            <img
              src={COMPANY.logoFull}
              alt={COMPANY.name}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1B4332' }}>
              {COMPANY.initials}
            </div>
          )}
        </div>
        <div>
          <h1 className="receipt-company-name">{COMPANY.name}</h1>
          <p className="receipt-company-tagline">{COMPANY.tagline}</p>
          <p className="receipt-company-detail">
            {COMPANY.address}<br />
            Telp/WA: {COMPANY.phone} · {COMPANY.email}
          </p>
        </div>
      </div>

      {/* TITLE */}
      <h2 className="receipt-title">KWITANSI PEMBAYARAN</h2>
      <div className="receipt-title-underline" />

      {/* META */}
      <div className="receipt-meta">
        <div>
          <div className="receipt-meta-row">
            <span className="receipt-meta-key">No. Kwitansi</span>
            <span className="receipt-meta-value">: {invoice.code}</span>
          </div>
          <div className="receipt-meta-row">
            <span className="receipt-meta-key">Tanggal</span>
            <span className="receipt-meta-value">: {formatTanggalIndo(invoice.payment_date || invoice.created_at)}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className={`receipt-status ${isLunas ? 'lunas' : 'belum'}`}>
            {invoice.status?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* BODY */}
      <div className="receipt-body">
        <div className="receipt-body-row">
          <span className="receipt-body-label">Telah terima dari</span>
          <span className="receipt-body-value">: {rental?.tenant_name || '-'}</span>
        </div>
        <div className="receipt-body-row">
          <span className="receipt-body-label">Untuk pembayaran</span>
          <span className="receipt-body-value">
            : Sewa {rental?.unit_name || '-'} periode {periode}
          </span>
        </div>
        <div className="receipt-body-row">
          <span className="receipt-body-label">Metode</span>
          <span className="receipt-body-value">: {invoice.payment_method || 'Cash'}</span>
        </div>
      </div>

      {/* AMOUNT */}
      <div className="receipt-amount-box">
        <div className="receipt-amount-label">Jumlah Pembayaran</div>
        <div className="receipt-amount-value">
          Rp {formatRupiah(invoice.amount)}
        </div>
      </div>

      <div className="receipt-terbilang">
        Terbilang: <b>{terbilangRupiah(invoice.amount)}</b>
      </div>

      {invoice.notes && (
        <div style={{ fontSize: '10pt', color: '#475569', marginBottom: 16 }}>
          <b>Catatan:</b> {invoice.notes}
        </div>
      )}

      {/* SIGNATURES */}
      <div className="receipt-signatures">
        <div className="receipt-sign-box">
          <div className="receipt-sign-label">Penyewa,</div>
          <div className="receipt-sign-name">{rental?.tenant_name || '____________'}</div>
        </div>
        <div className="receipt-sign-box">
          <div className="receipt-sign-label">Penerima,</div>
          <div className="receipt-sign-name">{COMPANY.printedBy.name}</div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="receipt-footer">
        Kwitansi ini sah sebagai bukti pembayaran · Dicetak {new Date().toLocaleString('id-ID')}
      </div>
    </div>
  );
}