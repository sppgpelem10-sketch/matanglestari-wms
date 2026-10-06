// src/mobile/TasksTab.jsx
import React, { useState, useEffect } from 'react';
import {
  MapPin, Phone, Boxes, Timer, CheckCircle2, Navigation, AlertTriangle,
} from 'lucide-react';
import { cn, Badge, Button, StatusBadge } from '../components/shared';
import { useDriverTasks } from '../hooks/useDriverTasks';
import PODSheet from './PODSheet';

export default function TasksTab() {
  const { tasks, loading, error, refetch, startTask, completeTask } = useDriverTasks();
  const [filter, setFilter] = useState('Semua');
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState(null);
  const [podTarget, setPodTarget] = useState(null);

  // Timer tick
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const filters = ['Semua', 'Pending', 'In Progress', 'Selesai'];

  const filtered = tasks.filter((t) => {
    if (filter === 'Semua') return true;
    if (filter === 'Selesai') return t.status === 'Completed';
    return t.status === filter;
  });

  const fmt = (ms) => {
    if (!ms || ms < 0) return '00:00:00';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleStart = async (task) => {
    try {
      await startTask(task.uuid);
      showToast('Pengiriman dimulai');
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  };

  const handleFinishClick = (task) => {
    setPodTarget(task);
  };

  const handlePODComplete = async (taskId, podData) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    try {
      await completeTask(task.uuid, podData);
      setPodTarget(null);
      showToast('Tugas berhasil diselesaikan!');
    } catch (err) {
      alert('Gagal menyelesaikan: ' + err.message);
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="p-5 space-y-4">
        <div className="pt-2">
          <h1 className="text-xl font-bold text-slate-900">Tugas Pengiriman</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Memuat tugas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-slate-900">Tugas Pengiriman</h1>
        <p className="text-xs text-slate-500 mt-1">
          {tasks.length} tugas · {tasks.filter((t) => t.status === 'Pending').length} pending ·{' '}
          {tasks.filter((t) => t.status === 'Completed').length} selesai
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
          ⚠️ Error: {error}
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors',
              filter === f
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-900">
              {tasks.length === 0 ? 'Belum ada tugas' : 'Tidak ada tugas di kategori ini'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {tasks.length === 0
                ? 'Tugas akan muncul setelah di-assign oleh admin.'
                : 'Coba ubah filter'}
            </p>
          </div>
        ) : (
          filtered.map((task) => {
            const elapsedMs = task.startedAt && task.status === 'In Progress'
              ? Date.now() - task.startedAt
              : 0;

            return (
              <div
                key={task.id}
                className={cn(
                  'bg-white rounded-xl border p-4',
                  task.status === 'In Progress'
                    ? 'border-indigo-300 ring-1 ring-indigo-100'
                    : task.status === 'Completed'
                      ? 'border-emerald-200'
                      : 'border-slate-200'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono font-semibold text-slate-400">{task.id}</span>
                      <StatusBadge status={task.status} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{task.customer}</h3>
                  </div>
                </div>

                {task.address && (
                  <div className="flex items-start gap-2 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-600 leading-relaxed">{task.address}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Boxes className="w-3 h-3" /> {task.items} item
                  </span>
                  {task.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {task.phone}
                    </span>
                  )}
                </div>

                {task.status === 'In Progress' && (
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-medium text-slate-600">Waktu berjalan</span>
                      </div>
                      <span className="text-sm font-bold text-indigo-600 tabular-nums font-mono">
                        {fmt(elapsedMs)}
                      </span>
                    </div>
                    <Button
                      variant="success"
                      size="lg"
                      className="w-full"
                      icon={CheckCircle2}
                      onClick={() => handleFinishClick(task)}
                    >
                      SELESAIKAN
                    </Button>
                  </div>
                )}

                {task.status === 'Pending' && (
                  <Button
                    variant="primary"
                    className="w-full mt-1"
                    icon={Navigation}
                    onClick={() => handleStart(task)}
                  >
                    Mulai Pengiriman
                  </Button>
                )}

                {task.status === 'Completed' && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-medium">
                        Selesai {task.completedAt ? `pukul ${new Date(task.completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </span>
                    </div>
                    {(task.podSignature || task.podPhoto) && (
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        {task.podSignature && <span className="text-emerald-600">✓ TTD</span>}
                        {task.podPhoto && <span className="text-emerald-600">✓ Foto</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Debug refresh (dev only) */}
      {import.meta.env.DEV && (
        <div className="pt-2 flex justify-center">
          <button onClick={refetch}
            className="text-[10px] text-slate-400 hover:text-slate-600 underline">
            Refresh (debug)
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 w-[340px]">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border bg-emerald-600 text-white border-emerald-700">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-medium flex-1">{toast}</span>
          </div>
        </div>
      )}

      {/* POD Sheet */}
      {podTarget && (
        <PODSheet
          task={podTarget}
          onClose={() => setPodTarget(null)}
          onComplete={handlePODComplete}
        />
      )}
    </div>
  );
}