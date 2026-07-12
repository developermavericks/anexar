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

    // Convert to lowercase and support array of roles
    const userRole = user.role?.toLowerCase();
    if (role) {
        const allowedRoles = Array.isArray(role) ? role : [role];
        const lowercaseAllowed = allowedRoles.map(r => r.toLowerCase());
        if (!lowercaseAllowed.includes(userRole)) {
            return <Navigate to="/" replace />;
        }
    }

    return children;
}
