/**
 * Guest Guard
 * 
 * Protects routes that should only be accessible to non-authenticated users.
 * Redirects to messages if user is already authenticated.
 */

import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

export function GuestGuard() {
  const { isAuthenticated, loading, checkAuth, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      checkAuth();
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Already authenticated, redirect to messages
  if (isAuthenticated && user) {
    return <Navigate to="/messages" replace />;
  }

  return <Outlet />;
}
