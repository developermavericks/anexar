import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Clock,
    BrainCircuit,
    Award,
    Newspaper,
    Settings,
    LogOut,
    Bell,
    Menu,
    X,
    Sparkles,
    FileText,
    Sun,
    ShieldAlert
} from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { useAuth } from '../../context/AuthContext';

const SidebarItem = ({ icon: Icon, label, to }) => (
    <NavLink
        to={to}
        end={to === "/team"}
        className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                isActive
                ? 'bg-[#1A1A1A] dark:bg-amber-500/10 text-white dark:text-amber-400 dark:border-l-4 dark:border-amber-500 shadow-md'
                : 'text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
            }`
        }
    >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
    </NavLink>
);

const TeamLayout = () => {
    const { user } = useUser();
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [showNotifications, setShowNotifications] = React.useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/team' },
        { icon: Users, label: 'Clients', to: '/team/clients' },
        { icon: FileText, label: 'Upload Coverage', to: '/team/upload' },
        { icon: Award, label: 'Events and Awards', to: '/team/events' },
        { icon: Newspaper, label: 'Journalist Source', to: '/team/journalists' },
        { icon: Sun, label: 'Morning Tracker', to: '/team/morning-tracker' },
        { icon: ShieldAlert, label: 'Crisis Tracker', to: '/team/crisis-tracker' },
        { icon: Clock, label: 'Time Allocation', to: '/team/time-allocation' },
        { icon: BrainCircuit, label: 'Analysis Board', to: '/team/analysis' },
    ];

    return (
        <div className="flex h-screen bg-[#FDFBF7] dark:bg-[#0F172A] overflow-hidden">
            {/* Sidebar - Desktop */}
            <aside className="w-64 flex-shrink-0 border-r border-[#EAE8E4] dark:border-slate-800 bg-[#FDFBF7] dark:bg-[#1E293B] hidden md:flex flex-col">
                <div className="p-6 border-b border-[#EAE8E4] dark:border-slate-800 dark:bg-[#1e293b]/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#1A1A1A] dark:bg-white/10 p-1.5 rounded-lg flex items-center justify-center">
                            <span className="text-brand-amber font-bold text-lg leading-none">A</span>
                        </div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-[#1A1A1A] to-gray-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent leading-tight">
                            Anexar<br />Team Portal
                        </h1>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {menuItems.map((item, index) => (
                        <SidebarItem key={index} icon={item.icon} label={item.label} to={item.to} />
                    ))}
                </nav>

                <div className="p-4 border-t border-[#EAE8E4] dark:border-slate-800 space-y-1">
                    <SidebarItem icon={Settings} label="Settings" to="/team/settings" />
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer text-left font-medium"
                    >
                        <LogOut size={20} />
                        <span>Log Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Topbar */}
                <header className="h-20 flex-shrink-0 border-b border-[#EAE8E4] dark:border-slate-800 bg-[#FDFBF7] dark:bg-[#0F172A]/90 dark:backdrop-blur-md flex items-center justify-between px-6 z-10 w-full top-0 sticky">
                    <div className="flex items-center gap-4">
                        <button
                            className="md:hidden text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white hidden sm:block">Anexar Team Portal</h2>
                            <span className="px-2.5 py-0.5 bg-brand-amber/15 text-brand-amber rounded-full text-3xs font-extrabold uppercase tracking-wider hidden sm:block">
                                Staff Workspace
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Notifications Toggle */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-amber-400 transition-colors cursor-pointer"
                            >
                                <Bell size={20} />
                                <span className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full"></span>
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 mt-3 w-80 bg-[#FDFBF7] dark:bg-[#1E293B] rounded-3xl border border-[#EAE8E4] dark:border-slate-800 shadow-2xl z-50 p-4 animate-in fade-in slide-in-from-top-3">
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">Notifications</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        <div className="p-2.5 bg-white dark:bg-[#111827] rounded-xl text-xs text-gray-600 dark:text-gray-300">
                                            Acura Corporate PR schedule updated successfully.
                                        </div>
                                        <div className="p-2.5 bg-white dark:bg-[#111827] rounded-xl text-xs text-gray-600 dark:text-gray-300">
                                            Weekly timesheet approvals are pending.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profile Badge */}
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || 'Staff Core'}</p>
                                <span className="text-3xs text-brand-amber font-extrabold uppercase tracking-wider block">
                                    Associate Strategist
                                </span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1A1A1A] to-brand-amber p-0.5 shadow-sm">
                                <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-sm font-bold border-2 border-[#FDFBF7] dark:border-slate-800 text-[#1A1A1A] dark:text-white overflow-hidden">
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        (user?.name || 'A').charAt(0)
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="h-8 w-[1px] bg-[#EAE8E4] dark:bg-slate-800 hidden sm:block" />

                        <button
                            onClick={handleLogout}
                            title="Log Out"
                            className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <Outlet />
                </main>
            </div>

            {/* Mobile Drawer */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <aside className="w-64 bg-[#FDFBF7] dark:bg-[#1E293B] border-r border-[#EAE8E4] dark:border-slate-800 shadow-2xl relative flex flex-col">
                        <div className="p-6 border-b border-[#EAE8E4] dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="bg-[#1A1A1A] dark:bg-white/10 p-1.5 rounded-lg flex items-center justify-center">
                                    <span className="text-brand-amber font-bold text-md leading-none">A</span>
                                </div>
                                <h1 className="text-lg font-bold text-[#1A1A1A] dark:text-white">Anexar Team Portal</h1>
                            </div>
                            <button
                                className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <nav className="flex-1 overflow-y-auto p-4 space-y-1" onClick={() => setIsMobileMenuOpen(false)}>
                            {menuItems.map((item, index) => (
                                <SidebarItem key={index} icon={item.icon} label={item.label} to={item.to} />
                            ))}
                        </nav>
                    </aside>
                </div>
            )}
        </div>
    );
};

export default TeamLayout;
