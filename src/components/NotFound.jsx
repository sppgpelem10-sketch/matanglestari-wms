// src/components/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
          <Compass className="w-7 h-7 text-slate-400" />
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">404</h1>
        <p className="text-sm text-slate-600 mb-6">
          Halaman yang kamu cari tidak ditemukan.
        </p>

        <div className="space-y-2 text-left bg-slate-50 rounded-lg p-4 mb-6">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Halaman yang tersedia:
          </p>
          <Link
            to="/absen"
            className="flex items-center justify-between text-sm text-slate-700 hover:text-indigo-600 py-1.5 group"
          >
            <span>/absen</span>
            <span className="text-xs text-slate-400 group-hover:text-indigo-500">
              Aplikasi Absensi →
            </span>
          </Link>
          <Link
            to="/wms"
            className="flex items-center justify-between text-sm text-slate-700 hover:text-indigo-600 py-1.5 group"
          >
            <span>/wms</span>
            <span className="text-xs text-slate-400 group-hover:text-indigo-500">
              WMS Dashboard →
            </span>
          </Link>
          <Link
            to="/admin-pus"
            className="flex items-center justify-between text-sm text-slate-700 hover:text-indigo-600 py-1.5 group"
          >
            <span>/admin-pus</span>
            <span className="text-xs text-slate-400 group-hover:text-indigo-500">
              Central Admin →
            </span>
          </Link>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Home className="w-4 h-4" />
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}