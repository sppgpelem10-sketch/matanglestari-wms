// src/components/RequireAuth.jsx
// ============================================
// Komponen proteksi route
// - Kalau belum login → redirect ke /login
// - Kalau role gak sesuai → redirect ke home role-nya
// ============================================

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { useAuth } from '../lib/authContext';

export default function RequireAuth({ children, allowedRoles }) {
  const { loading, isAuthenticated, profile } = useAuth();
  const location = useLocation();

  // Masih loading session
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memuat...</p>
        </div>
      </div>
    );
  }

  // Belum login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Cek role
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect ke home role-nya
    const home = getHomeByRole(profile.role);
    return <Navigate to={home} replace />;
  }

  return children;
}

function getHomeByRole(role) {
  if (role === 'admin') return '/admin-pus';
  if (role === 'wms') return '/wms';
  return '/absen';
}