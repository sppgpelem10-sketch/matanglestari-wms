// src/mobile/PODSheet.jsx
import React, { useState } from 'react';
import {
  X, PenTool, Camera, CheckCircle2,
} from 'lucide-react';
import { cn, Badge, Button } from '../components/shared';

export default function PODSheet({ task, onClose }) {
  const [sig, setSig] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [notes, setNotes] = useState('');

  const canSubmit = sig && photo;

  const handleSubmit = () => {
    if (!canSubmit) return;
    // TODO: kirim ke backend nanti
    console.log('POD submitted:', { task, sig, photo, notes });
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 z-40 rounded-[1.5rem]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[85%] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-4 flex items-start justify-between border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Bukti Pengiriman</h2>
            <p className="text-xs text-slate-500 mt-0.5">{task?.customer}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Signature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5" /> Tanda Tangan Digital
              </label>
              {sig && <Badge variant="success">Terisi</Badge>}
            </div>
            <div
              onClick={() => setSig(true)}
              className={cn(
                'h-32 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors',
                sig
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-slate-300 bg-slate-50 hover:border-slate-400'
              )}
            >
              {sig ? (
                <div className="text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
                  <p className="text-xs font-medium text-emerald-700">
                    Tanda tangan tersimpan
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <PenTool className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-medium text-slate-500">
                    Tap untuk tanda tangan
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Photo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" /> Foto Barang
              </label>
              {photo && <Badge variant="success">Terisi</Badge>}
            </div>
            <button
              onClick={() => setPhoto(true)}
              className={cn(
                'w-full h-24 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors',
                photo
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-slate-300 bg-slate-50 hover:border-slate-400'
              )}
            >
              {photo ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">
                    1 foto diambil
                  </span>
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">
                    Ambil Foto Barang
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block">
              Catatan (opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Contoh: Barang diterima lengkap"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Submit */}
          <Button
            variant="success"
            size="lg"
            className="w-full"
            icon={CheckCircle2}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {canSubmit ? 'Konfirmasi Selesai' : 'Lengkapi tanda tangan & foto dulu'}
          </Button>
        </div>
      </div>
    </>
  );
}