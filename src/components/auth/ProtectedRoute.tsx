import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-grey flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="animate-spin text-brand-green mb-4" size={36} />
        <p className="text-sm font-bold uppercase tracking-wider text-brand-navy/60">
          Vérification de la session...
        </p>
      </div>
    );
  }

  if (!user) {
    // Save current location to return to it after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
