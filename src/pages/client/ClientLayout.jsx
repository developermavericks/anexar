import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
    LayoutDashboard,
    Megaphone,
    FileText,
    Lightbulb,
    Award,
    Target,
    BarChart,
    Users,
    CreditCard,
    Bell,
    Settings,
    Menu,
    X,
    LogOut
} from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { hasProAccess } from '../../utils/checkAccess';

const SidebarItem = ({ icon: Icon, label, to }) => (
    <NavLink
        to={to}
        end={to === "/client"}
        className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                ? 'bg-[#1A1A1A] dark:bg-cyan-500/10 text-white dark:text-cyan-400 dark:border-l-4 dark:border-cyan-500 shadow-md'
                : 'text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
            }`
        }
    >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
    </NavLink>
);

const ClientLayout = () => {
    const { user } = useUser();
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/client' },
        { icon: Megaphone, label: 'Campaign Overview', to: '/client/campaigns' },
        { icon: FileText, label: 'Press Release Tracker', to: '/client/press' },
        { icon: Lightbulb, label: 'Thought Leadership', to: '/client/thought-leadership' },
        { icon: Award, label: 'Events & Awards', to: '/client/events' },
        { icon: Target, label: 'Goals & Commitment', to: '/client/goals' },
        { icon: BarChart, label: 'Reports', to: '/client/reports' },
        { icon: Users, label: 'Meet Your Team', to: '/client/team' },
        { icon: CreditCard, label: 'Subscription', to: '/client/subscription' },
    ];

    return (
        <div className="flex h-screen bg-[#FDFBF7] dark:bg-[#0F172A] overflow-hidden">
            {/* Sidebar - Desktop */}
            <aside className="w-64 flex-shrink-0 border-r border-[#EAE8E4] dark:border-slate-800 bg-[#FDFBF7] dark:bg-[#1E293B] hidden md:flex flex-col">
                <div className="p-6 border-b border-[#EAE8E4] dark:border-slate-800 dark:bg-[#1e293b]/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/80 p-1.5 rounded-lg dark:bg-white/10 dark:backdrop-blur-sm">
                            <img src="/mav%20logo.png" alt="Logomark" className="h-8 w-auto object-contain drop-shadow-sm" onError={(e) => e.target.style.display = 'none'} />
                        </div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-[#1A1A1A] to-gray-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent leading-tight hidden xl:block">
                            Mavericks<br />Dashboard
                        </h1>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {menuItems.map((item, index) => (
                        <SidebarItem key={index} icon={item.icon} label={item.label} to={item.to} />
                    ))}
                </nav>

                <div className="p-4 border-t border-[#EAE8E4] dark:border-slate-800 space-y-1">
                    <SidebarItem icon={Settings} label="Settings" to="/client/settings" />
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer text-left"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Log Out</span>
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
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white hidden sm:block">Client Portal</h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="relative text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-cyan-400 transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full"></span>
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                                <div className="flex items-center justify-end">
                                    {user.plan === 'pro' ? (
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1A1A1A] dark:bg-cyan-500/10 text-amber-500 dark:text-cyan-400 border border-amber-500/30 dark:border-cyan-500/30">
                                            Pro Plan
                                        </span>
                                    ) : user.plan === 'enterprise' ? (
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                            Enterprise
                                        </span>
                                    ) : (
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                                            Basic Plan
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1A1A1A] to-gray-700 dark:from-cyan-500 dark:to-blue-600 p-0.5 shadow-sm">
                                <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-sm font-bold border-2 border-[#FDFBF7] dark:border-slate-800 text-[#1A1A1A] dark:text-white overflow-hidden">
                                    {user.avatar ? (
                                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        user.name.charAt(0)
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
                                <div className="bg-white/80 p-1.5 rounded-lg dark:bg-white/10 dark:backdrop-blur-sm">
                                    <img src="/mav%20logo.png" alt="Logo" className="h-6 object-contain drop-shadow-sm" onError={(e) => e.target.style.display = 'none'} />
                                </div>
                                <h1 className="text-lg font-bold text-[#1A1A1A] dark:text-white">Mavericks Dashboard</h1>
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

export default ClientLayout;
