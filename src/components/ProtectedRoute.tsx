import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useDustZero } from '../contexts/DustZeroContext';

export const ProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, isInitializing } = useDustZero();

  if (isInitializing) {
    return (
      <div className="flex-center" style={{ height: '100vh', width: '100vw', background: 'var(--bg-main)' }}>
        <div className="loader"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
