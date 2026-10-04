// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/authContext';
import RequireAuth from './components/RequireAuth';
import LoginPage from './pages/LoginPage';
import MobileApp from './mobile/MobileApp';
import WMSDashboard from './wms/WMSDashboard';
import AdminDashboard from './admin/AdminDashboard';
import NotFound from './components/NotFound';

function RootRedirect() {
  const { loading, isAuthenticated, profile } = useAuth();

  // Loading session
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-sm text-slate-500">Memuat...</div>
      </div>
    );
  }

  // Belum login → ke login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Login tapi profile belum ke-load → tunggu
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-sm text-slate-500">Memuat profil...</div>
      </div>
    );
  }

  // Redirect berdasarkan role
  if (profile.role === 'admin') return <Navigate to="/admin-pus" replace />;
  if (profile.role === 'wms') return <Navigate to="/wms" replace />;
  return <Navigate to="/absen" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Root — redirect sesuai role */}
          <Route path="/" element={<RootRedirect />} />

          {/* Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Aplikasi Absensi (Mobile) — semua role bisa */}
          <Route
            path="/absen/*"
            element={
              <RequireAuth>
                <MobileApp />
              </RequireAuth>
            }
          />

          {/* WMS Dashboard — hanya admin & wms */}
          <Route
            path="/wms/*"
            element={
              <RequireAuth allowedRoles={['admin', 'wms']}>
                <WMSDashboard />
              </RequireAuth>
            }
          />

          {/* Central Admin — hanya admin */}
          <Route
            path="/admin-pus/*"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <AdminDashboard />
              </RequireAuth>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}