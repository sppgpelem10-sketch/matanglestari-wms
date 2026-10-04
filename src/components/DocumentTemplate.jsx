// src/components/DocumentTemplate.jsx
// ============================================
// Template dokumen formal
// - PurchaseOrderDoc  → A4 portrait
// - DeliveryNoteDoc   → ½ F4 landscape (Surat Jalan)
// ============================================

import React from 'react';
import { COMPANY, WAREHOUSE, DEFAULT_COURIER } from '../lib/companyConfig';
import './PrintStyles.css';

// ============ HELPERS ============

function formatRupiah(n) {
  if (!n && n !== 0) return '0';
  return n.toLocaleString('id-ID');
}

function todayLong() {
  return new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function timeNow() {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============ SHARED BLOCKS ============

function DocHeader({ compact = false }) {
  return (
    <div className="doc-header">
      <div className="doc-logo">
        {COMPANY.logoUrl ? (
          <img src={COMPANY.logoUrl} alt="Logo" />
        ) : (
          <div className="doc-logo-placeholder">
            LOGO
            <br />
            {compact ? '38×38' : '60×60'}
          </div>
        )}
      </div>
      <div className="doc-company-info">
        <h1 className="doc-company-name">{COMPANY.name}</h1>
        <p className="doc-company-tagline">{COMPANY.tagline}</p>
        <p className="doc-company-detail">
          {COMPANY.address}
          <br />
          Telp: {COMPANY.phone} · {COMPANY.email} · {COMPANY.website}
          {COMPANY.npwp && <> · NPWP: {COMPANY.npwp}</>}
        </p>
      </div>
    </div>
  );
}

function DocMeta({ title, subtitle, metaRows }) {
  return (
    <>
      <div className="doc-title-block">
        <h2 className="doc-title">{title}</h2>
        {subtitle && <p className="doc-subtitle">{subtitle}</p>}
      </div>

      <div className="doc-meta">
        <div>
          <div className="doc-meta-label">Informasi Dokumen</div>
          {metaRows.map((r, i) => (
            <div key={i} className="doc-meta-row">
              <span className="doc-meta-key">{r.key}</span>
              <span className="doc-meta-value">{r.value}</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="doc-meta-label">Dicetak</div>
          <div className="doc-meta-row" style={{ justifyContent: 'flex-end' }}>
            <span className="doc-meta-value">{todayLong()}</span>
          </div>
          <div className="doc-meta-row" style={{ justifyContent: 'flex-end' }}>
            <span className="doc-meta-value">{timeNow()} WIB</span>
          </div>
        </div>
      </div>
    </>
  );
}

function DocRecipient({ label, name, details }) {
  return (
    <div className="doc-recipient">
      <div className="doc-recipient-label">{label}</div>
      <div className="doc-recipient-name">{name}</div>
      <div className="doc-recipient-detail">{details}</div>
    </div>
  );
}

function DocSignatures({ signatures }) {
  return (
    <div className="doc-signatures">
      {signatures.map((s, i) => (
        <div key={i} className="doc-sign-box">
          <div className="doc-sign-label">{s.label}</div>
          <div className="doc-sign-line">{s.name}</div>
          {s.role && <div className="doc-sign-role">{s.role}</div>}
        </div>
      ))}
    </div>
  );
}

function DocFooter({ docId, copyLabel }) {
  return (
    <div className="doc-footer">
      <span>
        {docId} · Dicetak oleh {COMPANY.printedBy.name} ({COMPANY.printedBy.role})
      </span>
      <span>{copyLabel}</span>
    </div>
  );
}

// ============================================
// PURCHASE ORDER — A4 PORTRAIT
// ============================================

export function PurchaseOrderDoc({
  po,
  copyLabel = 'ARSIP GUDANG',
  isOriginal = false,
}) {
  const watermark =
    po.status === 'Draft' ? 'DRAFT' : po.status === 'Cancelled' ? 'VOID' : null;

  const total = po.lines.reduce((s, l) => s + l.qty * l.price, 0);

  return (
    <div className="doc-page doc-a4">
      {watermark && (
        <div className={`doc-watermark ${watermark.toLowerCase()}`}>{watermark}</div>
      )}
      <div className={`doc-copy-label ${isOriginal ? 'original' : ''}`}>{copyLabel}</div>

      <DocHeader />

      <DocMeta
        title="Purchase Order"
        subtitle="Surat Pesanan Pembelian Barang"
        metaRows={[
          { key: 'No. PO', value: po.id },
          { key: 'Tanggal', value: po.date },
          { key: 'Estimasi Kirim', value: po.expectedDate || '-' },
          { key: 'Status', value: po.status },
        ]}
      />

      <DocRecipient
        label="Kepada Supplier"
        name={po.supplier}
        details={
          <>
            {po.supplierAddress || 'Alamat supplier'}
            <br />
            Attn: {po.supplierContact || 'Bagian Penjualan'} ·{' '}
            {po.supplierPhone || '-'}
          </>
        }
      />

      {/* Items table */}
      <table className="doc-table">
        <thead>
          <tr>
            <th style={{ width: '6%' }} className="text-center">No</th>
            <th style={{ width: '15%' }}>SKU</th>
            <th style={{ width: '27%' }}>Nama Produk</th>
            <th style={{ width: '8%' }} className="text-right">Qty</th>
            <th style={{ width: '8%' }} className="text-center">Satuan</th>
            <th style={{ width: '15%' }} className="text-right">Harga</th>
            <th style={{ width: '21%' }} className="text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {po.lines.map((l, i) => (
            <tr key={i}>
              <td className="text-center">{i + 1}</td>
              <td className="mono">{l.sku}</td>
              <td>{l.name}</td>
              <td className="text-right">{l.qty}</td>
              <td className="text-center">{l.unit || 'dus'}</td>
              <td className="text-right">Rp {formatRupiah(l.price)}</td>
              <td className="text-right">Rp {formatRupiah(l.qty * l.price)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="grand-total">
            <td colSpan={6} className="text-right">TOTAL</td>
            <td className="text-right">Rp {formatRupiah(total)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="doc-notes">
        <div className="doc-notes-title">Syarat & Ketentuan</div>
        <ul>
          <li>Barang dikirim maksimal 3 (tiga) hari kerja setelah PO diterima.</li>
          <li>Pembayaran dilakukan 30 (tiga puluh) hari setelah invoice diterima.</li>
          <li>Barang reject/cacat dapat diretur maksimal 7 hari setelah penerimaan.</li>
          <li>Mohon sertakan surat jalan dan faktur pajak pada saat pengiriman.</li>
          <li>
            Pengiriman ditujukan ke: {WAREHOUSE.name} — {WAREHOUSE.address}
          </li>
        </ul>
      </div>

      <DocSignatures
        signatures={[
          { label: 'Disetujui Oleh,', name: 'Admin Sari', role: 'WMS Manager' },
          { label: 'Diperiksa Oleh,', name: 'Finance Dept', role: 'Keuangan' },
          { label: 'Hormat Kami,', name: po.supplier, role: 'Supplier' },
        ]}
      />

      <DocFooter docId={po.id} copyLabel={copyLabel} />
    </div>
  );
}

// ============================================
// SURAT JALAN / FAKTUR JALAN — ½ F4 LANDSCAPE
// Tanpa harga
// ============================================

export function DeliveryNoteDoc({
  so,
  copyLabel = 'ARSIP GUDANG',
  isOriginal = false,
}) {
  const watermark =
    so.status === 'Draft' ? 'DRAFT' : so.status === 'Cancelled' ? 'VOID' : null;

  const totalQty = (so.lines || []).reduce((s, l) => s + l.qty, 0);

  return (
    <div className="doc-page doc-half-f4">
      {watermark && (
        <div className={`doc-watermark ${watermark.toLowerCase()}`}>{watermark}</div>
      )}
      <div className={`doc-copy-label ${isOriginal ? 'original' : ''}`}>{copyLabel}</div>

      <DocHeader compact />

      <DocMeta
        title="Surat Jalan"
        subtitle="Bukti Pengiriman Barang"
        metaRows={[
          { key: 'No. SO', value: so.id },
          { key: 'Tanggal', value: so.date },
          { key: 'Ekspedisi', value: so.courier || DEFAULT_COURIER.name },
          { key: 'Kendaraan', value: so.vehicle || 'B 1234 XYZ' },
        ]}
      />

      <DocRecipient
        label="Kepada Pelanggan"
        name={so.customer}
        details={
          <>
            {so.customerAddress || 'Alamat pengiriman pelanggan'}
            {' · '}
            Attn: {so.customerContact || 'Penerima'} · {so.customerPhone || '-'}
          </>
        }
      />

      {/* Items table — TANPA HARGA */}
      <table className="doc-table">
        <thead>
          <tr>
            <th style={{ width: '5%' }} className="text-center">No</th>
            <th style={{ width: '15%' }}>SKU</th>
            <th style={{ width: '45%' }}>Nama Produk</th>
            <th style={{ width: '10%' }} className="text-right">Qty</th>
            <th style={{ width: '10%' }} className="text-center">Satuan</th>
            <th style={{ width: '15%' }}>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {(so.lines || []).map((l, i) => (
            <tr key={i}>
              <td className="text-center">{i + 1}</td>
              <td className="mono">{l.sku}</td>
              <td>{l.name}</td>
              <td className="text-right">{l.qty}</td>
              <td className="text-center">{l.unit || 'dus'}</td>
              <td>Baik</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="grand-total">
            <td colSpan={3} className="text-right">TOTAL QTY</td>
            <td className="text-right">{totalQty}</td>
            <td colSpan={2} className="text-center">
              {so.lines?.length || 0} item
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="doc-notes">
        <div className="doc-notes-title">Catatan</div>
        <ul>
          <li>Barang telah diperiksa & dalam kondisi baik saat diserahkan.</li>
          <li>Mohon periksa barang sebelum menandatangani surat jalan ini.</li>
          <li>Klaim kerusakan/kekurangan maksimal 2×24 jam setelah penerimaan.</li>
        </ul>
      </div>

      <DocSignatures
        signatures={[
          { label: 'Pengirim,', name: 'Admin Sari', role: 'WMS Operator' },
          {
            label: 'Ekspedisi,',
            name: so.courierContact || DEFAULT_COURIER.contact,
            role: so.courier || DEFAULT_COURIER.name,
          },
          { label: 'Diterima Oleh,', name: so.customer, role: 'Penerima' },
        ]}
      />

      <DocFooter docId={so.id} copyLabel={copyLabel} />
    </div>
  );
}

// ============================================
// WRAPPER CETAK 2/3 RANGKAP
// ============================================

export function PrintPurchaseOrder({ po }) {
  return (
    <div className="doc-print-root">
      <PurchaseOrderDoc po={po} copyLabel="ARSIP GUDANG" isOriginal />
      <PurchaseOrderDoc po={po} copyLabel="UNTUK SUPPLIER" />
    </div>
  );
}

export function PrintDeliveryNote({ so }) {
  return (
    <div className="doc-print-root">
      <DeliveryNoteDoc so={so} copyLabel="ARSIP GUDANG" isOriginal />
      <DeliveryNoteDoc so={so} copyLabel="UNTUK PELANGGAN" />
      <DeliveryNoteDoc so={so} copyLabel="UNTUK EKSPEDISI" />
    </div>
  );
}