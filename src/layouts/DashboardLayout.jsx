import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    LogOut,
    User as UserIcon,
    Settings,
    Bell
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function DashboardLayout() {
    const { user, isAuthenticated, logout } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-brand-beige flex">
            {/* Sidebar (Bento Style) */}
            <aside className="w-64 hidden md:flex flex-col p-4">
                <div className="bg-white radius-main shadow-soft border border-brand-border/30 h-full flex flex-col overflow-hidden">

                    <div className="p-6 border-b border-brand-border/20 flex flex-col items-center">
                        <div className="w-12 h-12 rounded-xl bg-brand-charcoal flex items-center justify-center text-brand-amber font-bold text-2xl mb-3 shadow-soft">
                            M
                        </div>
                        <span className="font-bold text-brand-charcoal text-center tracking-tight">Mavericks Dashboard</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">

                        {/* Nav Items */}
                        <div className="space-y-1">
                            <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-brand-amber text-brand-charcoal radius-pill font-medium shadow-soft">
                                <LayoutDashboard size={18} />
                                <span>Dashboard</span>
                            </Link>
                        </div>
                    </div>

                    {/* User Section Bottom Sidebar */}
                    <div className="p-4 border-t border-brand-border/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 radius-small bg-brand-amber/20 text-brand-amber flex items-center justify-center font-bold">
                                {user?.name.charAt(0)}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium text-brand-charcoal truncate">{user?.name}</p>
                                <p className="text-xs text-brand-gray truncate">{user?.role}</p>
                            </div>
                            <button onClick={logout} className="p-2 text-brand-gray hover:text-red-500 transition-colors">
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>

                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col p-4 md:pl-0 h-screen overflow-hidden">
                {/* Header (Bento Style) */}
                <header className="bg-white radius-main shadow-soft border border-brand-border/30 h-20 mb-4 flex items-center justify-between px-6 shrink-0">

                    <div className="flex items-center gap-4">
                        {/* Mobile Menu Button - visible only on small screens */}
                        <div className="md:hidden w-8 h-8 rounded-lg bg-brand-charcoal flex items-center justify-center text-brand-amber font-bold text-xl">
                            M
                        </div>
                        <h2 className="text-xl font-bold text-brand-charcoal">
                            Welcome back, {user?.name.split(' ')[0]}
                        </h2>
                        <span className="hidden sm:inline-block px-3 py-1 bg-brand-charcoal text-white text-xs font-medium radius-pill ml-2">
                            {user?.role} Space
                        </span>
                    </div>

                    {/* Header Utilities */}
                    <div className="flex items-center gap-3">
                        <button className="w-10 h-10 flex items-center justify-center text-brand-gray hover:bg-black/5 radius-pill transition-colors">
                            <Bell size={20} />
                        </button>
                        <button className="w-10 h-10 flex items-center justify-center text-brand-gray hover:bg-black/5 radius-pill transition-colors">
                            <Settings size={20} />
                        </button>
                        <div className="w-10 h-10 bg-brand-beige border border-brand-border radius-pill flex items-center justify-center overflow-hidden">
                            {user?.avatarUrl ? (
                                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon size={20} className="text-brand-gray" />
                            )}
                        </div>
                    </div>
                </header>

                {/* Scrollable Content (Bento Grid Area) */}
                <div className="flex-1 overflow-y-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
