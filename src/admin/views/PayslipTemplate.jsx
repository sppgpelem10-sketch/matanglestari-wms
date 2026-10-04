// src/admin/views/PayslipTemplate.jsx
// ============================================
// Template slip gaji — F4 vertikal, 5 slip per lembar
// ============================================

import React from 'react';
import { COMPANY } from '../../lib/companyConfig';

function formatRupiah(n) {
  if (!n && n !== 0) return '0';
  return n.toLocaleString('id-ID');
}

function formatOT(minutes) {
  if (!minutes) return '0j 0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}j ${m}m`;
}

// ============ SINGLE SLIP ============

function Payslip({ row, monthLabel, index }) {
  return (
    <div className="payslip">
      {/* Header */}
      <div className="payslip-header">
        <div className="payslip-header-left">
          <p className="payslip-company">{COMPANY.name}</p>
          <p className="payslip-company-detail">{COMPANY.address}</p>
        </div>
        <div className="payslip-header-right">
          <p className="payslip-title">SLIP GAJI</p>
          <p className="payslip-period">{monthLabel}</p>
        </div>
      </div>

      {/* Employee info */}
      <div className="payslip-info">
        <div className="payslip-info-col">
          <div className="payslip-info-row">
            <span className="payslip-info-key">Nama</span>
            <span className="payslip-info-val">: {row.workerName}</span>
          </div>
          <div className="payslip-info-row">
            <span className="payslip-info-key">ID Karyawan</span>
            <span className="payslip-info-val">: {row.workerId}</span>
          </div>
          <div className="payslip-info-row">
            <span className="payslip-info-key">Posisi</span>
            <span className="payslip-info-val">: {row.workerPosition}</span>
          </div>
        </div>
        <div className="payslip-info-col">
          <div className="payslip-info-row">
            <span className="payslip-info-key">Divisi</span>
            <span className="payslip-info-val">: {row.workerDivision}</span>
          </div>
          <div className="payslip-info-row">
            <span className="payslip-info-key">Hari Hadir</span>
            <span className="payslip-info-val">: {row.daysPresent} / {row.workingDays} hari</span>
          </div>
          <div className="payslip-info-row">
            <span className="payslip-info-key">Hari Telat</span>
            <span className="payslip-info-val">: {row.daysLate} hari</span>
          </div>
        </div>
      </div>

      {/* Earnings table */}
      <table className="payslip-table">
        <thead>
          <tr>
            <th>Komponen</th>
            <th className="text-center">Qty</th>
            <th className="text-right">Rate</th>
            <th className="text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Gaji Harian</td>
            <td className="text-center">{row.daysPresent} hari</td>
            <td className="text-right">Rp {formatRupiah(row.dailyRate)}</td>
            <td className="text-right">Rp {formatRupiah(row.basePay)}</td>
          </tr>
          <tr>
            <td>Uang Lembur (OT)</td>
            <td className="text-center">{formatOT(row.otMinutes)}</td>
            <td className="text-right">—</td>
            <td className="text-right">Rp {formatRupiah(row.otPay)}</td>
          </tr>
          <tr className="payslip-total">
            <td colSpan={3} className="text-right">TAKE HOME PAY</td>
            <td className="text-right">
              Rp {formatRupiah(row.takeHome)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signature */}
      <div className="payslip-signature">
        <div className="payslip-sign-box">
          <p className="payslip-sign-label">Diterima oleh,</p>
          <div className="payslip-sign-line" />
          <p className="payslip-sign-name">{row.workerName}</p>
        </div>
        <div className="payslip-sign-box">
          <p className="payslip-sign-label">Disetujui oleh,</p>
          <div className="payslip-sign-line" />
          <p className="payslip-sign-name">{COMPANY.printedBy.name}</p>
          <p className="payslip-sign-role">{COMPANY.printedBy.role}</p>
        </div>
      </div>

      {/* Footer note */}
      <p className="payslip-footer">
        Slip gaji ini bersifat rahasia · Dicetak otomatis oleh sistem · {COMPANY.website}
      </p>
    </div>
  );
}

// ============ PAGE: 5 SLIPS PER LEMBAR F4 ============

export default function PayslipPage({ rows, monthLabel }) {
  // Ambil 5 karyawan per halaman
  const pages = [];
  for (let i = 0; i < rows.length; i += 5) {
    pages.push(rows.slice(i, i + 5));
  }

  return (
    <div className="payslip-print-root">
      {pages.map((pageRows, pageIdx) => (
        <div key={pageIdx} className="payslip-page">
          {pageRows.map((row, i) => (
            <Payslip
              key={row.workerId}
              row={row}
              monthLabel={monthLabel}
              index={i}
            />
          ))}
          {/* Spacer kalau kurang dari 5 slip biar layout konsisten */}
          {pageRows.length < 5 &&
            Array.from({ length: 5 - pageRows.length }).map((_, i) => (
              <div key={`spacer-${i}`} className="payslip-spacer" />
            ))}
        </div>
      ))}
    </div>
  );
}