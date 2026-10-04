// src/mobile/PODSheet.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  X, PenTool, Camera, CheckCircle2, Trash2, RotateCcw,
  Video, VideoOff, Zap,
} from 'lucide-react';
import { cn, Badge, Button } from '../components/shared';

export default function PODSheet({ task, onClose, onComplete }) {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const isDrawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });

  const [hasSignature, setHasSignature] = useState(false);
  const [notes, setNotes] = useState('');

  // Photo state
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [photoFileName, setPhotoFileName] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);

  const canSubmit = hasSignature && photoDataUrl;

  // ============ SIGNATURE CANVAS ============

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const point = getPoint(e);
    lastPointRef.current = point;

    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();

    const point = getPoint(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;

    if (!hasSignature) setHasSignature(true);
  };

  const endDraw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // ============ CAMERA ============

  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError(null);

    try {
      // Cek dukungan
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser tidak mendukung akses kamera');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // prefer kamera belakang
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);

      // Tunggu DOM render dulu, baru attach stream ke video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((e) => {
            console.error('Video play error:', e);
          });
        }
      }, 100);
    } catch (err) {
      console.error('Camera error:', err);
      const msg =
        err.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Cek setting browser.'
          : err.name === 'NotFoundError'
            ? 'Kamera tidak ditemukan di device ini.'
            : err.message || 'Gagal membuka kamera';

      setCameraError(msg);
      setCameraActive(false);

      // Fallback ke file picker
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }, 800);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      console.error('Video not ready');
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    // Convert ke JPEG quality 0.85 biar gak terlalu gede
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setPhotoDataUrl(dataUrl);
    setPhotoFileName(`pod-${Date.now()}.jpg`);

    stopCamera();
  };

  const retakePhoto = () => {
    setPhotoDataUrl(null);
    setPhotoFileName(null);
    // Langsung buka kamera lagi
    setTimeout(() => startCamera(), 100);
  };

  const clearPhoto = () => {
    setPhotoDataUrl(null);
    setPhotoFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Cleanup kamera pas unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // ============ FILE INPUT FALLBACK ============

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Foto terlalu besar. Maksimal 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoDataUrl(ev.target.result);
      setPhotoFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  // ============ SUBMIT ============

  const handleSubmit = () => {
    if (!canSubmit) return;

    // Stop camera kalau masih aktif
    stopCamera();

    const signatureDataUrl = canvasRef.current?.toDataURL('image/png') || null;

    if (onComplete) {
      onComplete(task.id, {
        signature: signatureDataUrl,
        photo: photoDataUrl,
        photoFileName,
        notes: notes.trim() || null,
        submittedAt: Date.now(),
      });
    } else if (onClose) {
      onClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 z-40 rounded-[1.5rem]"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[90%] overflow-y-auto">
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
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* ============ SIGNATURE ============ */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5" /> Tanda Tangan Penerima
              </label>
              <div className="flex items-center gap-2">
                {hasSignature && <Badge variant="success">Terisi</Badge>}
                {hasSignature && (
                  <button
                    onClick={clearSignature}
                    className="text-[10px] text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Hapus
                  </button>
                )}
              </div>
            </div>

            <div className="relative rounded-xl border-2 border-slate-300 bg-white overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-40 touch-none cursor-crosshair block"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />

              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <PenTool className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                    <p className="text-xs font-medium text-slate-400">
                      Tanda tangan di sini
                    </p>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      Pakai jari atau mouse
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute bottom-4 left-8 right-8 border-b border-dashed border-slate-200 pointer-events-none" />
            </div>
          </div>

          {/* ============ PHOTO ============ */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" /> Foto Barang
              </label>
              <div className="flex items-center gap-2">
                {photoDataUrl && <Badge variant="success">Terisi</Badge>}
                {photoDataUrl && (
                  <button
                    onClick={clearPhoto}
                    className="text-[10px] text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Hapus
                  </button>
                )}
              </div>
            </div>

            {/* Hidden file input — fallback kalau kamera gak bisa dibuka */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* STATE 1: Foto udah ke-capture */}
            {photoDataUrl && !cameraActive && (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden border-2 border-emerald-300">
                  <img
                    src={photoDataUrl}
                    alt="Foto barang"
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Terjepret
                  </div>
                </div>
                <button
                  onClick={retakePhoto}
                  className="w-full py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Ambil Ulang
                </button>
              </div>
            )}

            {/* STATE 2: Kamera aktif */}
            {cameraActive && !photoDataUrl && (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={stopCamera}
                    className="py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center justify-center gap-2"
                  >
                    <VideoOff className="w-3.5 h-3.5" /> Batal
                  </button>
                  <button
                    onClick={capturePhoto}
                    className="py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" /> JEPRET
                  </button>
                </div>
              </div>
            )}

            {/* STATE 3: Belum ada foto, kamera belum aktif */}
            {!photoDataUrl && !cameraActive && (
              <>
                <button
                  onClick={startCamera}
                  disabled={cameraLoading}
                  className={cn(
                    'w-full h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors',
                    cameraError
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50'
                  )}
                >
                  {cameraLoading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium text-indigo-600">
                        Membuka kamera...
                      </span>
                    </>
                  ) : (
                    <>
                      <Video className="w-7 h-7 text-slate-400" />
                      <span className="text-xs font-medium text-slate-600">
                        Buka Kamera
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Foto langsung dari kamera HP/laptop
                      </span>
                    </>
                  )}
                </button>

                {cameraError && (
                  <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <VideoOff className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-[10px] text-amber-800 font-medium">
                        {cameraError}
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] text-amber-700 underline mt-1"
                      >
                        Atau pilih foto dari galeri/file
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ============ NOTES ============ */}
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

          {/* ============ SUBMIT ============ */}
          <Button
            variant="success"
            size="lg"
            className="w-full"
            icon={CheckCircle2}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {canSubmit
              ? 'Konfirmasi Selesai'
              : !hasSignature && !photoDataUrl
                ? 'Lengkapi tanda tangan & foto dulu'
                : !hasSignature
                  ? 'Tanda tangan dulu'
                  : 'Ambil foto barang dulu'}
          </Button>
        </div>
      </div>
    </>
  );
}