import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ role, children }) {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-beige">
                <div className="animate-spin w-8 h-8 border-4 border-brand-amber border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!user) {
        // Redirect to login but save the attempted url
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Convert to lowercase for comparison just in case
    const userRole = user.role?.toLowerCase();
    const requiredRole = role?.toLowerCase();

    if (requiredRole && userRole !== requiredRole) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
}
