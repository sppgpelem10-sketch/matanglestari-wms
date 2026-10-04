// src/wms/views/PhotoUploader.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, X, Zap, Video, VideoOff, FolderOpen, Image as ImageIcon,
} from 'lucide-react';
import { cn, Button } from '../../components/shared';

export default function PhotoUploader({
  photos = [],
  onChange,
  label = 'Foto Barang',
  required = true,
  maxPhotos = 6,
  helpText = 'Di HP akan otomatis buka kamera. Di desktop, pilih file dari folder.',
}) {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);

  // ============ KAMERA ============

  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError(null);
    setShowCamera(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser tidak mendukung akses kamera');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      // Tunggu DOM render, baru attach stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((e) => console.error('Play error:', e));
        }
      }, 150);
    } catch (err) {
      console.error('Camera error:', err);
      const msg =
        err.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Cek setting browser.'
          : err.name === 'NotFoundError'
            ? 'Kamera tidak ditemukan di device ini.'
            : err.message || 'Gagal membuka kamera';

      setCameraError(msg);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    const w = video.videoWidth;
    const h = video.videoHeight;

    if (!w || !h) {
      console.error('Video not ready');
      return;
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    // Kalau udah maxPhotos, tolak
    if (photos.length >= maxPhotos) {
      alert(`Maksimal ${maxPhotos} foto`);
      return;
    }

    onChange([...photos, dataUrl]);
    stopCamera();
  };

  // Cleanup kamera saat unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ============ FOLDER / FILE ============

  const openFolder = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Cek max photos
    const remaining = maxPhotos - photos.length;
    const toProcess = files.slice(0, remaining);

    if (files.length > remaining) {
      alert(`Maksimal ${maxPhotos} foto. ${files.length - remaining} foto di-skip.`);
    }

    const readers = toProcess.map((file) => {
      return new Promise((resolve, reject) => {
        if (file.size > 5 * 1024 * 1024) {
          reject(new Error(`${file.name} terlalu besar (max 5MB)`));
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers)
      .then((urls) => {
        onChange([...photos, ...urls]);
      })
      .catch((err) => {
        alert('Gagal upload: ' + err.message);
      });

    // Reset input biar bisa pilih file yang sama lagi
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ============ REMOVE ============

  const removePhoto = (i) => {
    onChange(photos.filter((_, x) => x !== i));
  };

  return (
    <div>
      {/* Label */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
        <span className="text-[10px] text-slate-400 font-normal">
          {photos.length}/{maxPhotos} foto
        </span>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Grid foto */}
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {photos.map((url, i) => (
            <div
              key={i}
              className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group"
            >
              <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2 Tombol utama */}
      {photos.length < maxPhotos && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={startCamera}
            className={cn(
              'h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors',
              'border-indigo-300 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400'
            )}
          >
            <Video className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-700">Buka Kamera</span>
            <span className="text-[9px] text-indigo-500">Foto langsung</span>
          </button>

          <button
            onClick={openFolder}
            className={cn(
              'h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors',
              'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
            )}
          >
            <FolderOpen className="w-5 h-5 text-slate-600" />
            <span className="text-xs font-semibold text-slate-700">Pilih dari Folder</span>
            <span className="text-[9px] text-slate-500">Upload file</span>
          </button>
        </div>
      )}

      {/* Warning kalau required tapi belum ada foto */}
      {required && photos.length === 0 && (
        <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <ImageIcon className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-amber-800">
            Minimal 1 foto wajib diambil sebagai bukti
          </p>
        </div>
      )}

      {helpText && (
        <p className="text-[10px] text-slate-400 mt-1.5">💡 {helpText}</p>
      )}

      {/* ============ MODAL KAMERA ============ */}
      {showCamera && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80" onClick={stopCamera} />
          <div className="relative bg-white rounded-2xl w-full max-w-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Ambil Foto</p>
                  <p className="text-[10px] text-slate-500">
                    {photos.length}/{maxPhotos} foto
                  </p>
                </div>
              </div>
              <button
                onClick={stopCamera}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {cameraError ? (
                <div className="aspect-video bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center">
                  <div className="text-center p-6">
                    <VideoOff className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-amber-900 mb-1">
                      Kamera tidak bisa diakses
                    </p>
                    <p className="text-xs text-amber-700 mb-4">{cameraError}</p>
                    <Button
                      variant="secondary"
                      icon={FolderOpen}
                      onClick={() => {
                        stopCamera();
                        setTimeout(() => openFolder(), 100);
                      }}
                    >
                      Pilih dari Folder
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {cameraLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-xs text-white font-medium">
                            Membuka kamera...
                          </p>
                        </div>
                      </div>
                    )}
                    {!cameraLoading && (
                      <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-semibold px-2 py-1 rounded-md flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        LIVE
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-3 mt-4">
                    <Button variant="secondary" onClick={stopCamera}>
                      Batal
                    </Button>
                    <Button
                      icon={Zap}
                      onClick={capturePhoto}
                      disabled={cameraLoading}
                      className="px-8"
                    >
                      JEPRET
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}