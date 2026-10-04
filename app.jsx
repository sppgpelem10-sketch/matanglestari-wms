import React, { useState, useEffect } from 'react';
import {
  Home, ClipboardList, User, MapPin, CheckCircle2, Clock, Camera,
  PenTool, ChevronRight, Phone, Smartphone, Calendar, Package,
  LayoutDashboard, Boxes, ShoppingCart, Truck, Send, Search, Plus,
  Filter, X, AlertTriangle, TrendingUp, DollarSign, Users, Activity,
  Check, XCircle, ChevronDown, ChevronUp, FileText, Building2,
  RefreshCw, Wifi, ShieldCheck, Navigation, Timer, MapPinned,
  BadgeCheck, Fingerprint, PackageCheck, Inbox, LogOut,
  ArrowUpRight, ArrowDownRight, MoreHorizontal, BarChart3
} from 'lucide-react';

const cn = (...c) => c.filter(Boolean).join(' ');

/* ============ SHARED COMPONENTS ============ */

const Badge = ({ children, variant = 'default' }) => {
  const v = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border', v[variant])}>
      {children}
    </span>
  );
};

const Button = ({ children, variant = 'primary', size = 'md', icon: Icon, className, ...p }) => {
  const v = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 border-transparent shadow-sm',
    secondary: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 shadow-sm',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border-transparent',
    danger: 'bg-red-600 text-white hover:bg-red-700 border-transparent shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 border-transparent shadow-sm',
    outline: 'bg-transparent text-slate-700 hover:bg-slate-50 border-slate-300',
  };
  const s = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2',
  };
  return (
    <button className={cn('inline-flex items-center justify-center font-medium rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50', v[variant], s[size], className)} {...p}>
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

const StatusBadge = ({ status }) => {
  const m = {
    'Pending': 'warning', 'In Progress': 'info', 'Completed': 'success',
    'Diproses': 'info', 'Selesai': 'success', 'Dikirim': 'warning', 'Draft': 'neutral',
  };
  return <Badge variant={m[status] || 'default'}>{status}</Badge>;
};

const LiveDot = () => (
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
  </span>
);

const Input = ({ label, icon: Icon, className, ...p }) => (
  <div className={cn('space-y-1.5', className)}>
    {label && <label className="block text-xs font-medium text-slate-700">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
      <input className={cn('w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent', Icon ? 'pl-9 pr-3 py-2' : 'px-3 py-2')} {...p} />
    </div>
  </div>
);

const Modal = ({ open, onClose, title, subtitle, children, size = 'md' }) => {
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className={cn('relative bg-white rounded-xl w-full max-h-[90vh] flex flex-col', w[size])}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
};

/* ============ MOCK DATA ============ */

const tasks = [
  { id: 'TSK-0891', customer: 'Toko Makmur Jaya', address: 'Jl. Raya Bekasi No. 45, Cakung, Jakarta Timur', status: 'In Progress', items: 12, phone: '0812-3456-7890' },
  { id: 'TSK-0892', customer: 'CV Sinar Abadi', address: 'Jl. Industri Blok C No. 12, Pulogadung, Jakarta Timur', status: 'Pending', items: 8, phone: '0813-9876-5432' },
  { id: 'TSK-0893', customer: 'UD Berkah Sentosa', address: 'Jl. Pahlawan No. 88, Cikarang Barat, Bekasi', status: 'Pending', items: 24, phone: '0857-1122-3344' },
  { id: 'TSK-0889', customer: 'PT Anugerah Pangan', address: 'Jl. Gatot Subroto Km 7, Jatiasih, Bekasi', status: 'Completed', items: 15, phone: '0811-5566-7788' },
];

const inventory = [
  { sku: 'SKU-AM-001', name: 'Minyak Goreng Sania 2L', stock: 248, unit: 'dus', updated: '5 mnt lalu' },
  { sku: 'SKU-BR-014', name: 'Beras Pandan Wangi 5kg', stock: 89, unit: 'karung', updated: '12 mnt lalu' },
  { sku: 'SKU-GL-007', name: 'Gula Pasir Gulaku 1kg', stock: 512, unit: 'dus', updated: '1 jam lalu' },
  { sku: 'SKU-TP-023', name: 'Tepung Segitiga Biru 1kg', stock: 34, unit: 'dus', updated: '3 jam lalu' },
  { sku: 'SKU-MI-045', name: 'Mie Instan Indomie Goreng', stock: 1240, unit: 'dus', updated: '15 mnt lalu' },
  { sku: 'SKU-KP-102', name: 'Kecap Manis Bango 520ml', stock: 23, unit: 'dus', updated: '4 jam lalu' },
];

const salesOrders = [
  { id: 'SO-1201', customer: 'Toko Makmur Jaya', date: '15 Jun 2024', items: 12, total: 4850000, status: 'Diproses' },
  { id: 'SO-1200', customer: 'CV Sinar Abadi', date: '15 Jun 2024', items: 8, total: 2340000, status: 'Selesai' },
  { id: 'SO-1199', customer: 'UD Berkah Sentosa', date: '14 Jun 2024', items: 24, total: 8750000, status: 'Dikirim' },
  { id: 'SO-1198', customer: 'PT Anugerah Pangan', date: '14 Jun 2024', items: 15, total: 5620000, status: 'Selesai' },
];

const otApprovals = [
  { id: 'OT-056', date: '14 Jun 2024', worker: 'Budi Santoso', clockOut: '20:45', duration: '2j 45m', cost: 185000, gps: 'Gudang Cakung, Jakarta Timur', lastTask: 'TSK-0887 - PT Anugerah Pangan (Selesai 20:30)' },
  { id: 'OT-057', date: '14 Jun 2024', worker: 'Andi Wijaya', clockOut: '21:10', duration: '3j 10m', cost: 210000, gps: 'Gudang Pulogadung, Jakarta Timur', lastTask: 'TSK-0886 - Toko Makmur Jaya (Selesai 20:55)' },
  { id: 'OT-058', date: '13 Jun 2024', worker: 'Rudi Hartono', clockOut: '19:30', duration: '1j 30m', cost: 95000, gps: 'Gudang Cikarang, Bekasi', lastTask: 'TSK-0885 - UD Berkah Sentosa (Selesai 19:15)' },
];

const activityFeed = [
  { time: '10:15', text: 'Budi Santoso selesaikan Task #45', icon: PackageCheck, color: 'text-emerald-600 bg-emerald-50' },
  { time: '10:30', text: 'Admin Andi terima 100 unit SKU-AM-001', icon: Inbox, color: 'text-indigo-600 bg-indigo-50' },
  { time: '10:42', text: 'SO-1201 dibuat oleh Admin Sari', icon: FileText, color: 'text-slate-600 bg-slate-100' },
  { time: '10:55', text: 'Low stock alert: SKU-KP-102', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  { time: '11:02', text: 'Rudi Hartono clock in di Gudang Cikarang', icon: MapPinned, color: 'text-amber-600 bg-amber-50' },
  { time: '11:15', text: 'Task #46 didispatch ke Andi Wijaya', icon: Send, color: 'text-indigo-600 bg-indigo-50' },
  { time: '11:28', text: 'Stock adjustment SKU-TP-023 +50 dus', icon: RefreshCw, color: 'text-slate-600 bg-slate-100' },
];

/* ============ MOBILE APP ============ */

const MobileApp = () => {
  const [tab, setTab] = useState('home');
  const [clockedIn, setClockedIn] = useState(false);
  const [success, setSuccess] = useState(false);
  const [podTask, setPodTask] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleClock = () => {
    setSuccess(true);
    setTimeout(() => { setClockedIn(!clockedIn); setSuccess(false); }, 1200);
  };

  const tanggal = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[390px] bg-white rounded-[2rem] shadow-2xl overflow-hidden border-8 border-slate-900 relative">
        <div className="bg-white px-6 pt-3 pb-1 flex justify-between items-center text-xs font-semibold text-slate-900">
          <span>{now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5" />
            <div className="w-5 h-2.5 border border-slate-900 rounded-sm relative">
              <div className="absolute inset-0.5 bg-slate-900 rounded-sm" style={{ width: '70%' }} />
            </div>
          </div>
        </div>

        <div className="h-[700px] overflow-y-auto bg-[#F8FAFC] pb-20">
          {tab === 'home' && <MobileHome clockedIn={clockedIn} onClock={handleClock} success={success} now={now} tanggal={tanggal} />}
          {tab === 'tasks' && <MobileTasks onFinish={setPodTask} />}
          {tab === 'profile' && <MobileProfile />}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 pt-2 pb-5">
          <div className="flex justify-around">
            {[
              { id: 'home', icon: Home, label: 'Home' },
              { id: 'tasks', icon: ClipboardList, label: 'Tugas' },
              { id: 'profile', icon: User, label: 'Profil' },
            ].map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className={cn('flex flex-col items-center gap-1 px-4 py-1', active ? 'text-indigo-600' : 'text-slate-400')}>
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[10px] font-semibold">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {podTask && <PODSheet task={podTask} onClose={() => setPodTask(null)} />}
      </div>
    </div>
  );
};

const MobileHome = ({ clockedIn, onClock, success, now, tanggal }) => (
  <div className="p-5 space-y-5">
    <div className="flex items-start justify-between pt-2">
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{tanggal}</p>
        <h1 className="text-xl font-bold text-slate-900 mt-1">Selamat Pagi, Budi</h1>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span className="text-[10px] font-semibold text-emerald-700">Device Verified</span>
      </div>
    </div>

    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="text-center mb-6">
        <p className="text-4xl font-bold text-slate-900 tabular-nums tracking-tight">
          {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <p className="text-xs text-slate-500 font-medium mt-1">
          {clockedIn ? 'Shift aktif sejak 07:58' : 'Belum clock in hari ini'}
        </p>
      </div>

      <button
        onClick={onClock}
        className={cn(
          'w-full aspect-square max-w-[220px] mx-auto rounded-full flex flex-col items-center justify-center gap-2 transition-all',
          'focus:outline-none focus:ring-4 active:scale-95',
          clockedIn
            ? 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-300'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-200 shadow-lg shadow-indigo-600/20'
        )}
      >
        {success ? (
          <>
            <CheckCircle2 className="w-16 h-16 animate-bounce" />
            <span className="text-sm font-semibold">Berhasil!</span>
          </>
        ) : (
          <>
            <Fingerprint className="w-12 h-12 opacity-90" />
            <span className="text-lg font-bold tracking-wide">{clockedIn ? 'CLOCK OUT' : 'CLOCK IN'}</span>
            <span className="text-[10px] opacity-75 font-medium">
              {clockedIn ? 'Tekan untuk selesai' : 'Tekan untuk mulai'}
            </span>
          </>
        )}
      </button>

      <div className="mt-6 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-50">
        <MapPin className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-medium text-slate-600">Location: Office HQ (12m away)</span>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center mb-2">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
        </div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase">Jam Kerja</p>
        <p className="text-xl font-bold text-slate-900 mt-0.5">6j 24m</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center mb-2">
          <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase">Pengiriman</p>
        <p className="text-xl font-bold text-slate-900 mt-0.5">3/4</p>
      </div>
    </div>
  </div>
);

const MobileTasks = ({ onFinish }) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="p-5 space-y-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-slate-900">Tugas Pengiriman</h1>
        <p className="text-xs text-slate-500 mt-1">4 tugas hari ini</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['Semua', 'Pending', 'In Progress', 'Selesai'].map((f, i) => (
          <button key={f} className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border', i === 0 ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200')}>{f}</button>
        ))}
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className={cn('bg-white rounded-xl border p-4', task.status === 'In Progress' ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-slate-200')}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-semibold text-slate-400">{task.id}</span>
                  <StatusBadge status={task.status} />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 truncate">{task.customer}</h3>
              </div>
            </div>

            <div className="flex items-start gap-2 mb-3">
              <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-600 leading-relaxed">{task.address}</p>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-3">
              <span className="flex items-center gap-1"><Boxes className="w-3 h-3" /> {task.items} item</span>
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {task.phone}</span>
            </div>

            {task.status === 'In Progress' && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-medium text-slate-600">Waktu berjalan</span>
                  </div>
                  <span className="text-sm font-bold text-indigo-600 tabular-nums font-mono">{fmt(tick + 23 * 60)}</span>
                </div>
                <Button variant="success" size="lg" className="w-full" icon={CheckCircle2} onClick={() => onFinish(task)}>
                  SELESAIKAN
                </Button>
              </div>
            )}

            {task.status === 'Pending' && (
              <Button variant="primary" className="w-full mt-1" icon={Navigation}>Mulai Pengiriman</Button>
            )}

            {task.status === 'Completed' && (
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-medium">Selesai pukul 09:42</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const MobileProfile = () => {
  const items = [
    { icon: User, label: 'Nama', value: 'Budi Santoso' },
    { icon: Phone, label: 'Nomor HP', value: '0812-3456-7890' },
    { icon: Smartphone, label: 'Device ID', value: 'DV-8821-XK' },
    { icon: Building2, label: 'Divisi', value: 'Field Delivery' },
    { icon: Calendar, label: 'Bergabung', value: '12 Mar 2023' },
  ];

  return (
    <div className="p-5 space-y-4">
      <div className="pt-2 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-bold">BS</div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Budi Santoso</h1>
          <p className="text-xs text-slate-500">ID: EMP-2023-0147</p>
          <div className="mt-1"><Badge variant="success"><BadgeCheck className="w-3 h-3" /> Aktif</Badge></div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Ringkasan Bulan Ini</h3>
          <span className="text-[10px] text-slate-400 font-medium">Juni 2024</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Total Jam Kerja</p>
            <p className="text-2xl font-bold tabular-nums">142j 30m</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Total Pengiriman</p>
            <p className="text-2xl font-bold tabular-nums">87</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Kehadiran</p>
            <p className="text-sm font-semibold">22/24 hari</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Rating</p>
            <p className="text-sm font-semibold text-emerald-400">4.8 / 5.0</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-slate-500" />
              </div>
              <span className="text-sm text-slate-600 flex-1">{it.label}</span>
              <span className="text-sm font-medium text-slate-900">{it.value}</span>
            </div>
          );
        })}
      </div>

      <Button variant="outline" size="lg" className="w-full !text-red-600 hover:!bg-red-50 !border-red-200" icon={LogOut}>Keluar Akun</Button>
    </div>
  );
};

const PODSheet = ({ task, onClose }) => {
  const [sig, setSig] = useState(false);
  const [photo, setPhoto] = useState(false);

  return (
    <>
      <div className="absolute inset-0 bg-slate-900/50 z-40 rounded-[1.5rem]" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[85%] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>
        <div className="px-5 pb-4 flex items-start justify-between border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Bukti Pengiriman</h2>
            <p className="text-xs text-slate-500 mt-0.5">{task?.customer}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
              <PenTool className="w-3.5 h-3.5" /> Tanda Tangan Digital
            </label>
            <div onClick={() => setSig(true)} className={cn('h-32 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer', sig ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50')}>
              {sig ? (
                <div className="text-center"><CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1" /><p className="text-xs font-medium text-emerald-700">Tanda tangan tersimpan</p></div>
              ) : (
                <div className="text-center"><PenTool className="w-6 h-6 text-slate-400 mx-auto mb-1" /><p className="text-xs font-medium text-slate-500">Tap untuk tanda tangan</p></div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
              <Camera className="w-3.5 h-3.5" /> Foto Barang
            </label>
            <button onClick={() => setPhoto(true)} className={cn('w-full h-24 rounded-xl border-2 border-dashed flex items-center justify-center gap-2', photo ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50')}>
              {photo ? (<><CheckCircle2 className="w-5 h-5 text-emerald-600" /><span className="text-xs font-medium text-emerald-700">1 foto diambil</span></>) : (<><Camera className="w-5 h-5 text-slate-400" /><span className="text-xs font-medium text-slate-500">Ambil Foto Barang</span></>)}
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block">Catatan (opsional)</label>
            <textarea rows={2} placeholder="Contoh: Barang diterima lengkap" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>

          <Button variant="success" size="lg" className="w-full" icon={CheckCircle2} onClick={onClose}>Konfirmasi Selesai</Button>
        </div>
      </div>
    </>
  );
};

/* ============ SIDEBAR & TOPBAR ============ */

const Sidebar = ({ items, active, setActive, brand }) => (
  <aside className="w-60 bg-white border-r border-slate-200 flex flex-col fixed h-screen">
    <div className="h-16 flex items-center px-5 border-b border-slate-200 gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
        <Boxes className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900 leading-none">{brand}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Enterprise WMS</p>
      </div>
    </div>
    <nav className="flex-1 p-3 space-y-1">
      {items.map((it) => {
        const Icon = it.icon;
        const a = active === it.id;
        return (
          <button key={it.id} onClick={() => setActive(it.id)} className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors', a ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50')}>
            <Icon className="w-4 h-4" />
            {it.label}
          </button>
        );
      })}
    </nav>
    <div className="p-3 border-t border-slate-200">
      <div className="flex items-center gap-2.5 px-2 py-2">
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">AS</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-900 truncate">Admin Sari</p>
          <p className="text-[10px] text-slate-500 truncate">WMS Operator</p>
        </div>
      </div>
    </div>
  </aside>
);

const TopBar = ({ title, subtitle, actions }) => (
  <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
    <div className="flex items-center gap-3">
      <h1 className="text-base font-bold text-slate-900">{title}</h1>
      {subtitle && <span className="text-xs text-slate-500">· {subtitle}</span>}
    </div>
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
        <LiveDot />
        <span className="text-[11px] font-semibold text-emerald-700">Live Operations</span>
      </div>
      {actions}
    </div>
  </header>
);

/* ============ WMS DASHBOARD ============ */

const WMSDashboard = () => {
  const [view, setView] = useState('inventory');
  const [showSO, setShowSO] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'po', label: 'Purchase Orders', icon: ShoppingCart },
    { id: 'so', label: 'Sales Orders', icon: Truck },
    { id: 'dispatch', label: 'Task Dispatch', icon: Send },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      <Sidebar items={navItems} active={view} setActive={setView} brand="GudangKu" />
      <div className="ml-60">
        <TopBar
          title={navItems.find(n => n.id === view)?.label}
          subtitle="Gudang Cakung · Jakarta Timur"
          actions={view === 'so' && <Button icon={Plus} onClick={() => setShowSO(true)}>Buat SO Baru</Button>}
        />
        <main className="p-6">
          {view === 'inventory' && <InventoryView />}
          {view === 'so' && <SalesOrdersView />}
          {view === 'dashboard' && <DashboardOverview />}
          {view === 'po' && <PlaceholderView title="Purchase Orders" />}
          {view === 'dispatch' && <PlaceholderView title="Task Dispatch" />}
        </main>
      </div>
      <CreateSOModal open={showSO} onClose={() => setShowSO(false)} />
    </div>
  );
};

const DashboardOverview = () => {
  const cards = [
    { label: 'Total SKU Aktif', value: '248', delta: '+12', up: true, icon: Boxes },
    { label: 'PO Pending', value: '17', delta: '+3', up: true, icon: ShoppingCart },
    { label: 'SO Hari Ini', value: '42', delta: '+8', up: true, icon: Truck },
    { label: 'Low Stock Alert', value: '6', delta: '+2', up: false, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-slate-600" />
                </div>
                <div className={cn('flex items-center gap-1 text-xs font-semibold', c.up ? 'text-emerald-600' : 'text-red-600')}>
                  {c.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {c.delta}
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium">{c.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Aktivitas Terbaru</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {activityFeed.slice(0, 5).map((a, i) => {
            const Icon = a.icon;
            return (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', a.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-sm text-slate-700 flex-1">{a.text}</p>
                <span className="text-xs text-slate-400 tabular-nums">{a.time}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const InventoryView = () => {
  const [q, setQ] = useState('');
  const filtered = inventory.filter(i => i.name.toLowerCase().includes(q.toLowerCase()) || i.sku.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari SKU atau nama barang..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={Filter}>Filter</Button>
          <Button variant="secondary" icon={RefreshCw}>Refresh</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">SKU</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Item Name</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Current Stock</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Unit</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Last Updated</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((it) => (
              <tr key={it.sku} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{it.sku}</td>
                <td className="px-5 py-3 font-medium text-slate-900">{it.name}</td>
                <td className="px-5 py-3 text-right">
                  <span className={cn('font-bold tabular-nums', it.stock < 50 ? 'text-red-600' : it.stock < 100 ? 'text-amber-600' : 'text-slate-900')}>
                    {it.stock}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-600">{it.unit}</td>
                <td className="px-5 py-3 text-slate-500 text-xs">{it.updated}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="secondary">Restock</Button>
                    <Button size="sm" variant="ghost">Adjust</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SalesOrdersView = () => {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">SO ID</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Customer</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tanggal</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Items</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Total</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {salesOrders.map((so) => (
              <React.Fragment key={so.id}>
                <tr className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{so.id}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{so.customer}</td>
                  <td className="px-5 py-3 text-slate-600">{so.date}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-700">{so.items}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-900 tabular-nums">Rp {so.total.toLocaleString('id-ID')}</td>
                  <td className="px-5 py-3"><StatusBadge status={so.status} /></td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => setExpanded(expanded === so.id ? null : so.id)} className="w-7 h-7 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center">
                      <MoreHorizontal className="w-4 h-4 text-slate-500" />
                    </button>
                  </td>
                </tr>
                {expanded === so.id && (
                  <tr className="bg-slate-50">
                    <td colSpan={7} className="px-5 py-4">
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <p className="text-slate-500 font-medium">Alamat Pengiriman</p>
                          <p className="text-slate-900 mt-1">Jl. Raya Bekasi No. 45, Cakung, Jakarta Timur</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-medium">Metode Pembayaran</p>
                          <p className="text-slate-900 mt-1">Transfer Bank (BCA)</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-medium">Assigned Driver</p>
                          <p className="text-slate-900 mt-1">Budi Santoso</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CreateSOModal = ({ open, onClose }) => {
  const [items, setItems] = useState([{ sku: '', name: '', qty: 1, price: 0 }]);
  const [genTask, setGenTask] = useState(true);

  const addLine = () => setItems([...items, { sku: '', name: '', qty: 1, price: 0 }]);
  const updateItem = (i, field, val) => {
    const next = [...items];
    next[i][field] = val;
    setItems(next);
  };
  const total = items.reduce((s, it) => s + (it.qty * it.price), 0);

  return (
    <Modal open={open} onClose={onClose} title="Buat Sales Order Baru" subtitle="Isi detail pesanan dan line item" size="lg">
      <div className="space-y-5">
        <Input label="Customer" icon={Building2} placeholder="Cari customer..." />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700">Line Items</label>
            <Button size="sm" variant="secondary" icon={Plus} onClick={addLine}>Tambah Item</Button>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">SKU / Produk</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-24">Qty</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-32">Harga</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 w-32">Subtotal</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <input value={it.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Ketik untuk cari produk..." className="w-full text-sm border-0 focus:outline-none placeholder-slate-400" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={it.qty} onChange={e => updateItem(i, 'qty', +e.target.value)} className="w-full text-sm text-right border-0 focus:outline-none tabular-nums" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={it.price} onChange={e => updateItem(i, 'price', +e.target.value)} className="w-full text-sm text-right border-0 focus:outline-none tabular-nums" />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">
                      Rp {(it.qty * it.price).toLocaleString('id-ID')}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button onClick={() => setItems(items.filter((_, x) => x !== i))} className="w-6 h-6 rounded hover:bg-red-50 inline-flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={3} className="px-3 py-3 text-right text-xs font-semibold text-slate-600">Total</td>
                  <td className="px-3 py-3 text-right font-bold text-slate-900 tabular-nums">Rp {total.toLocaleString('id-ID')}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <Send className="w-4 h-4 text-indigo-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Generate Delivery Task</p>
              <p className="text-xs text-slate-500">Otomatis buat task pengiriman untuk driver</p>
            </div>
          </div>
          <button onClick={() => setGenTask(!genTask)} className={cn('w-11 h-6 rounded-full transition-colors relative', genTask ? 'bg-indigo-600' : 'bg-slate-300')}>
            <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', genTask ? 'translate-x-5' : 'translate-x-0.5')} />
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button icon={Check} onClick={onClose}>Simpan SO</Button>
        </div>
      </div>
    </Modal>
  );
};

const PlaceholderView = ({ title }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
      <BarChart3 className="w-5 h-5 text-slate-500" />
    </div>
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <p className="text-xs text-slate-500 mt-1">Modul ini belum diimplementasikan</p>
  </div>
);

/* ============ ADMIN DASHBOARD ============ */

const AdminDashboard = () => {
  const [view, setView] = useState('overview');
  const [otTab, setOtTab] = useState('attendance');
  const [expanded, setExpanded] = useState(null);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance & OT', icon: Clock },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'monitor', label: 'Live WMS Monitor', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      <Sidebar items={navItems} active={view} setActive={setView} brand="AdminKu" />
      <div className="ml-60">
        <TopBar
          title={navItems.find(n => n.id === view)?.label}
          subtitle="Central Admin"
          actions={
            <button className="relative w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <Activity className="w-4 h-4 text-slate-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
          }
        />
        <main className="p-6">
          {view === 'overview' && <AdminOverview />}
          {view === 'attendance' && <AttendanceView otTab={otTab} setOtTab={setOtTab} expanded={expanded} setExpanded={setExpanded} />}
          {view === 'payroll' && <PlaceholderView title="Payroll" />}
          {view === 'monitor' && <LiveWMSMonitor />}
        </main>
      </div>
    </div>
  );
};

const AdminOverview = () => {
  const cards = [
    { label: 'Total Karyawan Aktif', value: '142', delta: '+3', up: true, icon: Users },
    { label: 'OT Pending Approval', value: '8', delta: '+2', up: false, icon: Clock },
    { label: 'Payroll Bulan Ini', value: 'Rp 428jt', delta: '+2.1%', up: true, icon: DollarSign },
    { label: 'Task Selesai Hari Ini', value: '87', delta: '+12', up: true, icon: PackageCheck },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                <Icon className="w-4 h-4 text-slate-600" />
              </div>
              <div className={cn('flex items-center gap-1 text-xs font-semibold', c.up ? 'text-emerald-600' : 'text-red-600')}>
                {c.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {c.delta}
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium">{c.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{c.value}</p>
          </div>
        );
      })}
    </div>
  );
};

const AttendanceView = ({ otTab, setOtTab, expanded, setExpanded }) => {
  const attendanceLog = [
    { date: '14 Jun 2024', worker: 'Budi Santoso', clockIn: '07:58', clockOut: '20:45', hours: '12j 47m', status: 'Normal' },
    { date: '14 Jun 2024', worker: 'Andi Wijaya', clockIn: '08:00', clockOut: '21:10', hours: '13j 10m', status: 'OT' },
    { date: '14 Jun 2024', worker: 'Rudi Hartono', clockIn: '07:55', clockOut: '19:30', hours: '11j 35m', status: 'OT' },
    { date: '14 Jun 2024', worker: 'Joko Susilo', clockIn: '08:12', clockOut: '17:30', hours: '9j 18m', status: 'Normal' },
  ];

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {[
            { id: 'attendance', label: 'Attendance Log' },
            { id: 'ot', label: 'Pending OT Approvals', count: 8 },
          ].map(t => (
            <button key={t.id} onClick={() => setOtTab(t.id)} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2', otTab === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-600 hover:text-slate-900')}>
              {t.label}
              {t.count && <Badge variant="danger">{t.count}</Badge>}
            </button>
          ))}
        </div>
      </div>

      {otTab === 'attendance' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Tanggal</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Karyawan</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Clock In</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Clock Out</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Total Jam</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceLog.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-600">{r.date}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{r.worker}</td>
                  <td className="px-5 py-3 tabular-nums text-slate-700">{r.clockIn}</td>
                  <td className="px-5 py-3 tabular-nums text-slate-700">{r.clockOut}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900">{r.hours}</td>
                  <td className="px-5 py-3">
                    <Badge variant={r.status === 'OT' ? 'warning' : 'neutral'}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {otTab === 'ot' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase w-8"></th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Tanggal</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Karyawan</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Clock Out</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Durasi OT</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Estimasi Biaya</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {otApprovals.map((ot) => (
                <React.Fragment key={ot.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <button onClick={() => setExpanded(expanded === ot.id ? null : ot.id)} className="w-6 h-6 rounded hover:bg-slate-100 inline-flex items-center justify-center">
                        {expanded === ot.id ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{ot.date}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{ot.worker}</td>
                    <td className="px-5 py-3 tabular-nums text-slate-700">{ot.clockOut}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-amber-700">{ot.duration}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900">Rp {ot.cost.toLocaleString('id-ID')}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="success" icon={Check}>Approve</Button>
                        <Button size="sm" variant="danger" icon={XCircle}>Reject</Button>
                      </div>
                    </td>
                  </tr>
                  {expanded === ot.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={7} className="px-5 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white rounded-lg border border-slate-200 p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <MapPinned className="w-3.5 h-3.5 text-indigo-600" />
                              <p className="text-xs font-semibold text-slate-700">GPS Clock Out</p>
                            </div>
                            <p className="text-xs text-slate-600">{ot.gps}</p>
                          </div>
                          <div className="bg-white rounded-lg border border-slate-200 p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <p className="text-xs font-semibold text-slate-700">Task Terakhir</p>
                            </div>
                            <p className="text-xs text-slate-600">{ot.lastTask}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const LiveWMSMonitor = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 font-medium">Total Stock Value</p>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900 tabular-nums">Rp 2.847.500.000</p>
          <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-600">
            <TrendingUp className="w-3 h-3" /> +3.2% dari bulan lalu
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 font-medium">Low Stock Alerts</p>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-600 tabular-nums">6</p>
          <p className="text-xs text-slate-500 mt-1">SKU di bawah minimum threshold</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Inventory Snapshot</h3>
            <Badge variant="info">Read-only</Badge>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-600 uppercase">SKU</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-600 uppercase">Item</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-600 uppercase">Stock</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.slice(0, 5).map(it => (
                <tr key={it.sku}>
                  <td className="px-5 py-2.5 font-mono text-xs font-semibold text-slate-700">{it.sku}</td>
                  <td className="px-5 py-2.5 text-slate-900">{it.name}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums font-semibold text-slate-900">{it.stock} {it.unit}</td>
                  <td className="px-5 py-2.5">
                    {it.stock < 50 ? <Badge variant="danger">Low</Badge> : it.stock < 100 ? <Badge variant="warning">Medium</Badge> : <Badge variant="success">Healthy</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <LiveDot />
            <h3 className="text-sm font-semibold text-slate-900">Live Activity Feed</h3>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[520px]">
            {activityFeed.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className="flex items-start gap-3 px-5 py-3 border-b border-slate-100 last:border-b-0">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', a.color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 leading-relaxed">{a.text}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">{a.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============ ROOT APP ============ */

export default function App() {
  const [app, setApp] = useState('mobile');

  return (
    <div className="font-sans antialiased">
      <div className="fixed top-4 right-4 z-[100] bg-white border border-slate-200 rounded-lg shadow-lg p-1 flex gap-1">
        {[
          { id: 'mobile', label: 'Mobile' },
          { id: 'wms', label: 'WMS Admin' },
          { id: 'admin', label: 'Central Admin' },
        ].map(a => (
          <button key={a.id} onClick={() => setApp(a.id)} className={cn('px-3 py-1.5 rounded-md text-xs font-semibold transition-colors', app === a.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100')}>
            {a.label}
          </button>
        ))}
      </div>

      {app === 'mobile' && <MobileApp />}
      {app === 'wms' && <WMSDashboard />}
      {app === 'admin' && <AdminDashboard />}
    </div>
  );
}