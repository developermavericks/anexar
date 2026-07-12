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
    Moon,
    ChevronLeft,
    ChevronRight,
    ShieldAlert
} from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebaseClient';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const SidebarItem = ({ icon: Icon, label, to, collapsed }) => (
    <NavLink
        to={to}
        end={to === "/team"}
        className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                isActive
                ? 'bg-[#1A1A1A] dark:bg-amber-500/10 text-white dark:text-amber-400 dark:border-l-4 dark:border-amber-500 shadow-md'
                : 'text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
            } ${collapsed ? 'justify-center' : ''}`
        }
        title={collapsed ? label : undefined}
    >
        <Icon size={20} className="shrink-0" />
        {!collapsed && <span className="font-medium truncate">{label}</span>}
    </NavLink>
);

const TeamLayout = () => {
    const { user } = useAuth();
    const { user: contextUser, setUser } = useUser();
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [collapsed, setCollapsed] = React.useState(false);

    const toggleTheme = () => {
        setUser(prev => ({
            ...prev,
            theme: prev.theme === 'dark' ? 'light' : 'dark'
        }));
    };
    const [showNotifications, setShowNotifications] = React.useState(false);
    const [notificationsList, setNotificationsList] = React.useState([]);

    React.useEffect(() => {
        if (!user?.email) return;

        const q = query(
            collection(db, "notifications"),
            where("recipientEmail", "==", user.email)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ docId: docSnap.id, ...docSnap.data() });
            });
            // Sort by createdAt descending
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setNotificationsList(list);
        }, (err) => {
            console.error("Error listening to notifications:", err);
        });

        return () => unsubscribe();
    }, [user?.email]);

    const handleDismissNotification = async (docId) => {
        try {
            await deleteDoc(doc(db, "notifications", docId));
        } catch (err) {
            console.error("Error deleting notification:", err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            const promises = notificationsList
                .filter(n => !n.read)
                .map(n => updateDoc(doc(db, "notifications", n.docId), { read: true }));
            await Promise.all(promises);
        } catch (err) {
            console.error("Error marking all read:", err);
        }
    };

    const handleAcceptMeeting = async (notif) => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) {
            alert("Google Calendar Client ID is missing. Please configure VITE_GOOGLE_CLIENT_ID in your .env file.");
            return;
        }

        const scope = "https://www.googleapis.com/auth/calendar.events";
        const redirectUri = window.location.origin; 
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=consent`;

        const width = 500, height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(authUrl, "google_login", `width=${width},height=${height},left=${left},top=${top}`);

        if (!popup) {
            alert("Please allow popups to connect to your Google Calendar.");
            return;
        }

        const checkPopupInterval = setInterval(() => {
            if (!popup || popup.closed) {
                clearInterval(checkPopupInterval);
                return;
            }

            try {
                const popupUrl = popup.location.href;
                if (popupUrl.includes("access_token=")) {
                    const hash = popup.location.hash;
                    const params = new URLSearchParams(hash.substring(1));
                    const accessToken = params.get("access_token");

                    popup.close();
                    clearInterval(checkPopupInterval);

                    executeEmployeeCalendarBooking(accessToken, notif);
                }
            } catch (err) {
                // Cross-origin errors expected
            }
        }, 500);
    };

    const executeEmployeeCalendarBooking = async (accessToken, notif) => {
        try {
            const meetingDate = notif.meetingDate;
            const slots = notif.slots || [];
            if (slots.length === 0) throw new Error("No slots specified in request.");

            const sortedSlots = [...slots].sort();
            const firstSlot = sortedSlots[0];
            const lastSlot = sortedSlots[sortedSlots.length - 1];

            const startDateTime = new Date(`${meetingDate}T${firstSlot}:00`);
            const lastSlotDate = new Date(`${meetingDate}T${lastSlot}:00`);
            const endDateTime = new Date(lastSlotDate.getTime() + 30 * 60 * 1000);

            const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    summary: `Meeting: ${notif.topic || 'Portal Discussion'}`,
                    description: `Scheduled via Anexar Client Portal.\n\nTopic: ${notif.topic}\nClient Name: ${notif.client}`,
                    start: {
                        dateTime: startDateTime.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    end: {
                        dateTime: endDateTime.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    attendees: [
                        { email: user.email },
                        { email: notif.clientEmail || '' }
                    ],
                    conferenceData: {
                        createRequest: {
                            requestId: `anexar-${Date.now()}`,
                            conferenceSolutionKey: {
                                type: 'hangoutsMeet'
                            }
                        }
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || "Failed to save event to Google Calendar");
            }

            if (notif.meetingId) {
                await updateDoc(doc(db, "meetings", notif.meetingId), {
                    status: 'accepted'
                });
            }

            await deleteDoc(doc(db, "notifications", notif.docId));
            alert("Meeting successfully accepted and scheduled on Google Calendar!");
        } catch (err) {
            console.error("Error accepting meeting:", err);
            alert("Failed to schedule: " + err.message);
        }
    };

    const handleRejectMeeting = async (notif) => {
        try {
            if (notif.meetingId) {
                await updateDoc(doc(db, "meetings", notif.meetingId), {
                    status: 'rejected'
                });
            }
            await deleteDoc(doc(db, "notifications", notif.docId));
            alert("Meeting request rejected.");
        } catch (err) {
            console.error("Error rejecting meeting:", err);
        }
    };

    const unreadCount = notificationsList.filter(n => !n.read).length;

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/team' },
        { icon: Users, label: 'Clients', to: '/team/clients' },
        { icon: FileText, label: 'Publish Updates', to: '/team/upload' },
        { icon: Award, label: 'Events and Awards', to: '/team/events' },
        { icon: Newspaper, label: 'Journalist Source', to: '/team/journalists' },
        { icon: Sun, label: 'Morning Tracker', to: '/team/morning-tracker' },
        { icon: ShieldAlert, label: 'Crisis Tracker', to: '/team/crisis-tracker' },
        { icon: Clock, label: 'Time Allocation', to: '/team/time-allocation' },
        { icon: BrainCircuit, label: 'Analysis Board', to: '/team/analysis' },
    ];

    return (
        <div className="flex h-screen bg-[#FDFBF7] overflow-hidden text-slate-900">
            {/* Sidebar - Desktop */}
            <aside className={`${collapsed ? 'w-20' : 'w-64'} flex-shrink-0 border-r border-[#EAE8E4] dark:border-slate-800 bg-[#FDFBF7] dark:bg-[#1E293B] hidden md:flex flex-col relative transition-all duration-300 ${contextUser.theme === 'dark' ? 'dark bg-[#111827] text-white border-slate-900' : ''}`}>
                <div className={`h-20 border-b border-[#EAE8E4] dark:border-slate-800 dark:bg-[#1e293b]/50 flex items-center px-4 relative ${collapsed ? 'justify-center' : 'justify-start'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-white/80 p-1.5 rounded-lg dark:bg-white/10 dark:backdrop-blur-sm shrink-0">
                            <img src="/anexar_collapsed.png" alt="Logo" className="h-8 w-auto object-contain drop-shadow-sm rounded-lg" />
                        </div>
                        {!collapsed && (
                            <h1 className="text-sm font-bold bg-gradient-to-r from-[#1A1A1A] to-gray-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent leading-tight truncate">
                                Anexar<br />Team Portal
                            </h1>
                        )}
                    </div>
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="absolute right-[-12px] top-1/2 -translate-y-1/2 z-20 p-1 rounded-full bg-white dark:bg-[#1E293B] border border-[#EAE8E4] dark:border-slate-800 text-gray-500 dark:text-slate-400 cursor-pointer transition-all shadow-sm hover:scale-110"
                        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {menuItems.map((item, index) => (
                        <SidebarItem key={index} icon={item.icon} label={item.label} to={item.to} collapsed={collapsed} />
                    ))}
                </nav>

                <div className="p-4 border-t border-[#EAE8E4] dark:border-slate-800 space-y-1">
                    <SidebarItem icon={Settings} label="Settings" to="/team/settings" collapsed={collapsed} />
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer text-left font-medium ${collapsed ? 'justify-center' : ''}`}
                        title={collapsed ? "Log Out" : undefined}
                    >
                        <LogOut size={20} className="shrink-0" />
                        {!collapsed && <span>Log Out</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Topbar */}
                <header className={`h-20 flex-shrink-0 border-b border-[#EAE8E4] dark:border-slate-800 bg-[#FDFBF7] dark:bg-[#0F172A]/90 dark:backdrop-blur-md flex items-center justify-between px-6 z-10 w-full top-0 sticky transition-all duration-300 ${contextUser.theme === 'dark' ? 'dark bg-[#111827] text-white border-slate-900' : ''}`}>
                    <div className="flex items-center gap-4">
                        <button
                            className="md:hidden text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-brand-amber/15 text-brand-amber rounded-full text-3xs font-extrabold uppercase tracking-wider">
                                Mavericks Workspace
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-amber-400 transition-colors cursor-pointer rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800"
                            title={contextUser.theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {contextUser.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        {/* Notifications Toggle */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-amber-400 transition-colors cursor-pointer"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center rounded-full px-1 border border-white dark:border-[#0F172A]">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 mt-3 w-80 bg-[#FDFBF7] dark:bg-[#1E293B] rounded-3xl border border-[#EAE8E4] dark:border-slate-800 shadow-2xl z-50 p-4 animate-in fade-in slide-in-from-top-3">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Notifications</h4>
                                        {unreadCount > 0 && (
                                            <button 
                                                onClick={handleMarkAllRead}
                                                className="text-[10px] font-bold text-amber-500 hover:text-amber-600 cursor-pointer"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {notificationsList.length === 0 ? (
                                            <div className="text-center py-6 text-2xs text-slate-450 dark:text-slate-500 font-semibold">
                                                No new notifications
                                            </div>
                                        ) : (
                                            notificationsList.map((notif) => (
                                                <div 
                                                    key={notif.docId} 
                                                    className={`p-3 rounded-2xl text-xs flex justify-between gap-3 relative transition-all border ${
                                                        notif.read 
                                                        ? 'bg-slate-50/50 dark:bg-[#111827]/40 border-slate-100 dark:border-slate-900/65 text-slate-500 dark:text-slate-450' 
                                                        : 'bg-white dark:bg-[#111827] border-slate-250 dark:border-slate-800 text-gray-800 dark:text-gray-250 shadow-sm'
                                                    }`}
                                                >
                                                    <div className="space-y-1 flex-1">
                                                        <p className={`${!notif.read ? 'font-bold' : 'font-medium'}`}>{notif.message}</p>
                                                        <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {notif.type === 'meeting_request' && (
                                                            <div className="flex gap-2 mt-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                                                <button
                                                                    onClick={() => handleAcceptMeeting(notif)}
                                                                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9px] font-bold transition-colors cursor-pointer uppercase tracking-wider shadow-sm flex items-center gap-1"
                                                                >
                                                                    Accept
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectMeeting(notif)}
                                                                    className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[9px] font-bold transition-colors cursor-pointer uppercase tracking-wider shadow-sm flex items-center gap-1"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleDismissNotification(notif.docId)}
                                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 cursor-pointer transition-colors"
                                                        title="Dismiss"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profile Badge */}
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || 'Staff Core'}</p>
                                <span className="text-3xs text-brand-amber font-extrabold uppercase tracking-wider block font-sans">
                                    {user?.title || (
                                        user?.email?.toLowerCase().includes('satyam') || user?.email?.toLowerCase().includes('ss1084169')
                                        ? "Founder & CEO"
                                        : user?.role 
                                          ? user.role.charAt(0).toUpperCase() + user.role.slice(1) 
                                          : "Core Staff"
                                    )}
                                </span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1A1A1A] to-brand-amber p-0.5 shadow-sm">
                                <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-sm font-bold border-2 border-[#FDFBF7] dark:border-slate-800 text-[#1A1A1A] dark:text-white overflow-hidden">
                                    {(user?.picture || user?.avatar) ? (
                                        <img src={user.picture || user.avatar} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
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
                                <div className="bg-white/80 p-1.5 rounded-lg dark:bg-white/10 dark:backdrop-blur-sm shrink-0">
                                    <img src="/anexar_collapsed.png" alt="Logo" className="h-6 object-contain drop-shadow-sm rounded-lg" />
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
