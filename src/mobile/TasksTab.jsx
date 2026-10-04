// src/mobile/TasksTab.jsx
import React, { useState, useEffect } from 'react';
import {
  MapPin, Phone, Boxes, Timer, CheckCircle2, Navigation,
} from 'lucide-react';
import { cn, Badge, Button, StatusBadge } from '../components/shared';
import { TASKS } from '../lib/mockData';

const TASKS_STORAGE_KEY = 'gudangku_tasks_v1';

function loadTasks() {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const initial = TASKS.map((t) =>
    t.status === 'In Progress'
      ? { ...t, startedAt: Date.now() - 23 * 60 * 1000 }
      : t
  );
  return initial;
}

function saveTasks(tasks) {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch {}
}

export default function TasksTab({ onFinish }) {
  const [tasks, setTasks] = useState(() => loadTasks());
  const [filter, setFilter] = useState('Semua');
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState(null);
  const [finishTarget, setFinishTarget] = useState(null);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

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
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleStart = (taskId) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: 'In Progress', startedAt: Date.now() }
          : t
      )
    );
    showToast('Pengiriman dimulai');
  };

  // Ketika klik SELESAIKAN → buka POD sheet (JANGAN langsung complete)
  const handleFinishClick = (task) => {
    setFinishTarget(task);
  };

  // Callback dari POD sheet setelah submit berhasil
  const handlePODComplete = (taskId, podData) => {
    const now = new Date();
    const completedAt = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'Completed',
              completedAt,
              pod: podData, // simpan ttd + foto + catatan
            }
          : t
      )
    );

    setFinishTarget(null);
    showToast('Tugas berhasil diselesaikan!');
  };

  const handlePODCancel = () => {
    setFinishTarget(null);
  };

  return (
    <div className="p-5 space-y-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-slate-900">Tugas Pengiriman</h1>
        <p className="text-xs text-slate-500 mt-1">
          {tasks.length} tugas · {tasks.filter((t) => t.status === 'Pending').length} pending ·{' '}
          {tasks.filter((t) => t.status === 'Completed').length} selesai
        </p>
      </div>

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
            <p className="text-xs text-slate-500">Tidak ada tugas di kategori ini</p>
          </div>
        ) : (
          filtered.map((task) => {
            const elapsedMs = task.startedAt ? Date.now() - task.startedAt : 0;

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
                      <span className="text-[10px] font-mono font-semibold text-slate-400">
                        {task.id}
                      </span>
                      <StatusBadge status={task.status} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {task.customer}
                    </h3>
                  </div>
                </div>

                <div className="flex items-start gap-2 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-600 leading-relaxed">{task.address}</p>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Boxes className="w-3 h-3" /> {task.items} item
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {task.phone}
                  </span>
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
                    onClick={() => handleStart(task.id)}
                  >
                    Mulai Pengiriman
                  </Button>
                )}

                {task.status === 'Completed' && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-medium">
                        Selesai pukul {task.completedAt || '—'}
                      </span>
                    </div>
                    {task.pod && (
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        {task.pod.signature && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="w-3 h-3" /> TTD
                          </span>
                        )}
                        {task.pod.photo && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="w-3 h-3" /> Foto
                          </span>
                        )}
                        {task.pod.notes && (
                          <span className="truncate">Catatan: {task.pod.notes}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Debug reset */}
      {import.meta.env.DEV && (
        <div className="pt-2 flex justify-center">
          <button
            onClick={() => {
              if (confirm('Reset semua task ke kondisi awal?')) {
                localStorage.removeItem(TASKS_STORAGE_KEY);
                window.location.reload();
              }
            }}
            className="text-[10px] text-slate-400 hover:text-red-500 underline"
          >
            Reset data tugas (debug)
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

      {/* POD Sheet - hanya render kalau ada finishTarget */}
      {finishTarget && (
        <PODSheetWrapper
          task={finishTarget}
          onComplete={handlePODComplete}
          onCancel={handlePODCancel}
        />
      )}
    </div>
  );
}

// Wrapper biar TasksTab gak perlu import PODSheet langsung
import PODSheet from './PODSheet';

function PODSheetWrapper({ task, onComplete, onCancel }) {
  return (
    <PODSheet
      task={task}
      onClose={onCancel}
      onComplete={onComplete}
    />
  );
}