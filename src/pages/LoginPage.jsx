// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, AlertTriangle, Loader,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { COMPANY, APP } from '../lib/companyConfig';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const { signIn, isAuthenticated, loading, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect kalau udah login
  useEffect(() => {
    // Tunggu loading selesai DAN profile udah ke-load
    if (!loading && isAuthenticated && profile) {
      redirectByRole(profile.role);
    }
  }, [loading, isAuthenticated, profile]);

  function redirectByRole(role) {
    const from = location.state?.from?.pathname;

    // Kalau ada from URL valid, balik ke situ
    if (from && from !== '/' && from !== '/login') {
      navigate(from, { replace: true });
      return;
    }

    // Redirect berdasarkan role
    if (role === 'admin') {
      navigate('/admin-pus', { replace: true });
    } else if (role === 'wms') {
      navigate('/wms', { replace: true });
    } else if (role === 'worker') {
      navigate('/absen', { replace: true });
    } else {
      // Fallback kalau role gak dikenal
      console.warn('[login] unknown role:', role);
      navigate('/absen', { replace: true });
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
      // Redirect di-handle useEffect
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Email atau password salah'
          : err.message || 'Gagal login'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memeriksa sesi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[420px]">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 ring-2 ring-brand-600/20 bg-white">
            <img
              src="/logos/logo-full.png"
              alt={COMPANY.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{COMPANY.name}</h1>
          <p className="text-sm text-brand-600 font-medium italic mt-1">
            {COMPANY.tagline}
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Masuk ke Sistem</h2>
            <p className="text-xs text-slate-500 mt-1">
              Gunakan email & password yang diberikan admin
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@matanglestari.co.id"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-slate-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Masuk...
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>
                Sistem ini dilindungi. Hubungi admin kalau lupa password.
              </span>
            </div>
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-[10px] text-slate-400 mt-6">
          {APP.copyright} · v{APP.version}
        </p>
      </div>
    </div>
  );
}