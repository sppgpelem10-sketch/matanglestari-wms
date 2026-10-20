// src/components/DocumentTemplate.jsx
import React from 'react';
import { COMPANY, WAREHOUSE, DEFAULT_COURIER } from '../lib/companyConfig';
import './PrintStyles.css';

// ============ PRINT HANDLER ============
export function printDocument() {
  const printWindow = window.open('', '_blank', 'width=900,height=1200');
  if (!printWindow) {
    alert('⚠️ Popup diblokir browser. Izinkan popup untuk print.');
    return;
  }

  const docRoot =
    document.querySelector('.doc-print-root') ||
    document.querySelector('.payslip-print-root');

  if (!docRoot) {
    alert('⚠️ Dokumen belum ke-render. Coba ulangi.');
    printWindow.close();
    return;
  }

  let stylesHtml = '';
  try {
    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          if (sheet.href) return `<link rel="stylesheet" href="${sheet.href}">`;
          const rules = Array.from(sheet.cssRules || []).map((r) => r.cssText).join('\n');
          return `<style>${rules}</style>`;
        } catch (e) { return ''; }
      }).join('\n');
    stylesHtml = styles;
  } catch (e) { console.error('Error ambil styles:', e); }

  const htmlContent = docRoot.outerHTML;
  const printHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Cetak Dokumen</title>
        ${stylesHtml}
        <style>
          html, body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .doc-print-root, .payslip-print-root { transform: none !important; }
          @media print { @page { margin: 8mm; } }
        </style>
      </head>
      <body>${htmlContent}</body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();

  const doPrint = () => {
    try { printWindow.focus(); printWindow.print(); } catch (e) { console.error('Print error:', e); }
  };

  if (printWindow.document.readyState === 'complete') {
    setTimeout(doPrint, 300);
  } else {
    printWindow.onload = () => setTimeout(doPrint, 300);
  }
}

// ============ HELPERS ============
function formatRupiah(n) {
  if (!n && n !== 0) return '0';
  return Number(n).toLocaleString('id-ID');
}

function todayLong() {
  return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function timeNow() {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// FUNGSI FORMAT TANGGAL YANG AMAN
function formatTanggalIndo(dateStr) {
  if (!dateStr || dateStr === 'Invalid Date') return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // Kalau gagal convert, balikin teks aslinya
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

// ============ SHARED BLOCKS ============
function DocHeader({ compact = false }) {
  return (
    <div className="doc-header">
      <div className="doc-logo">
        {COMPANY.logoFull ? (
          <img src={COMPANY.logoFull} alt={COMPANY.name} onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="doc-logo-placeholder">LOGO</div>
        )}
      </div>
      <div className="doc-company-info">
        <h1 className="doc-company-name">{COMPANY.name}</h1>
        <p className="doc-company-tagline">{COMPANY.tagline}</p>
        <p className="doc-company-detail">
          {COMPANY.address}<br />
          Telp/WA: {COMPANY.phone} {COMPANY.email && <> · {COMPANY.email}</>}
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
      <span>{docId} · Dicetak oleh {COMPANY.printedBy.name}</span>
      <span>{copyLabel}</span>
    </div>
  );
}

// ============================================
// SURAT JALAN
// ============================================
export function DeliveryNoteDoc({ so, copyLabel = 'ARSIP GUDANG', isOriginal = false }) {
  const totalQty = (so.lines || []).reduce((s, l) => s + (l.qty || 0), 0);
  
  // Ngilangin teks "SO" dobel (misal: SO-SO-2026 jadi SO-2026)
  const soId = so.id ? (so.id.startsWith('SO-SO-') ? so.id.replace('SO-SO-', 'SO-') : so.id) : '-';

  return (
    <div className="doc-page doc-half-f4">
      <div className={`doc-copy-label ${isOriginal ? 'original' : ''}`}>{copyLabel}</div>
      <DocHeader compact />
      
      <DocMeta
        title="Surat Jalan"
        subtitle="Bukti Pengiriman Barang"
        metaRows={[
          { key: 'No. SO', value: soId },
          { key: 'Tanggal', value: formatTanggalIndo(so.date) },
          { key: 'Ekspedisi', value: so.courier || DEFAULT_COURIER.name },
          { key: 'Kendaraan', value: so.vehicle || '-' },
        ]}
      />

      <DocRecipient
        label="Kepada Pelanggan"
        name={so.customer}
        details={
          <>
            {so.customerAddress || 'Alamat pengiriman pelanggan'} · Attn: {so.customerContact || 'Penerima'}
            {so.wadah && (
              <div style={{ marginTop: '6px', padding: '4px 8px', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', fontSize: '9pt', fontWeight: 'bold', display: 'inline-block' }}>
                Wadah/Krat: {so.wadah}
              </div>
            )}
          </>
        }
      />

      <table className="doc-table" style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: '6%' }} className="text-center">No</th>
            <th style={{ width: '18%' }}>SKU</th>
            <th style={{ width: '36%' }}>Nama Produk</th>
            <th style={{ width: '15%' }} className="text-right">Qty</th>
            <th style={{ width: '10%' }} className="text-center">Satuan</th>
            <th style={{ width: '15%' }} className="text-center">Ket.</th>
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
              <td className="text-center">Baik</td>
            </tr>
          ))}
          {(!so.lines || so.lines.length === 0) && (
            <tr><td colSpan={6} className="text-center" style={{ padding: '12px' }}>(Tidak ada item)</td></tr>
          )}
        </tbody>
        <tfoot>
          <tr className="grand-total">
            <td colSpan={3} className="text-right">TOTAL QTY</td>
            <td className="text-right">{totalQty}</td>
            <td colSpan={2} className="text-center">{so.lines?.length || 0} item</td>
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
          { label: 'Ekspedisi,', name: so.courierContact || DEFAULT_COURIER.contact, role: so.courier || DEFAULT_COURIER.name },
          { label: 'Diterima Oleh,', name: so.customer, role: 'Penerima' },
        ]}
      />
      <DocFooter docId={soId} copyLabel={copyLabel} />
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
