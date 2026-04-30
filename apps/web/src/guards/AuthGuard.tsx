/**
 * Auth Guard
 *
 * Protects routes that require authentication.
 * Uses the auth store to check if user is authenticated.
 * Starts a session monitor to keep the session alive.
 */

import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

export function AuthGuard() {
  const location = useLocation();
  const { isAuthenticated, loading, user, checkAuth, startSessionMonitor } = useAuthStore();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      checkAuth();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !cleanupRef.current) {
      cleanupRef.current = startSessionMonitor();
    }
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [isAuthenticated, startSessionMonitor]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
