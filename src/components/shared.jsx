// src/components/shared.jsx
import React from 'react';
import { X, LayoutDashboard, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authContext';

export const cn = (...c) => c.filter(Boolean).join(' ');

// ============ BADGE ============

export const Badge = ({ children, variant = 'default', className }) => {
  const v = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border', v[variant], className)}>
      {children}
    </span>
  );
};

// ============ BUTTON ============

export const Button = ({ children, variant = 'primary', size = 'md', icon: Icon, className, ...p }) => {
  const v = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 border-transparent shadow-sm',
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
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg border transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        v[variant], s[size], className
      )}
      {...p}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

// ============ STATUS BADGE ============

export const StatusBadge = ({ status }) => {
  const m = {
    'Pending': 'warning',
    'In Progress': 'info',
    'Completed': 'success',
    'Diproses': 'info',
    'Selesai': 'success',
    'Dikirim': 'warning',
    'Draft': 'neutral',
  };
  return <Badge variant={m[status] || 'default'}>{status}</Badge>;
};

// ============ LIVE DOT ============

export const LiveDot = () => (
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
  </span>
);

// ============ INPUT ============

export const Input = ({ label, icon: Icon, className, ...p }) => (
  <div className={cn('space-y-1.5', className)}>
    {label && <label className="block text-xs font-medium text-slate-700">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
      <input
        className={cn(
          'w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder-slate-400',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
          Icon ? 'pl-9 pr-3 py-2' : 'px-3 py-2'
        )}
        {...p}
      />
    </div>
  </div>
);

// ============ MODAL ============

export const Modal = ({ open, onClose, title, subtitle, children, size = 'md' }) => {
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

// ============ SIDEBAR ============

export const Sidebar = ({ items, active, setActive, brand }) => (
  <aside className="w-60 bg-white border-r border-slate-200 flex flex-col fixed h-screen">
    {/* Logo + Brand */}
    <div className="h-16 flex items-center px-5 border-b border-slate-200 gap-2.5">
      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-slate-200 bg-slate-50">
        <img
          src="/logos/logo-full.png"
          alt="Logo"
          className="w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900 leading-none">{brand}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Kediri · Indonesia</p>
      </div>
    </div>

    {/* Nav */}
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {items.map((it) => {
        const Icon = it.icon;
        const a = active === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setActive(it.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              a ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            <Icon className="w-4 h-4" />
            {it.label}
          </button>
        );
      })}
    </nav>

    {/* User section + Logout */}
    <SidebarUserSection />
  </aside>
);

function SidebarUserSection() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = React.useState(false);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <div className="p-3 border-t border-slate-200">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              {profile?.position || profile?.role || '-'}
            </p>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center flex-shrink-0"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white rounded-xl max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Keluar dari akun?
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Kamu harus login ulang untuk mengakses sistem.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowConfirm(false)}>
                Batal
              </Button>
              <Button variant="danger" onClick={handleLogout}>
                Keluar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============ TOPBAR ============

export const TopBar = ({ title, subtitle, actions }) => (
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