import React, { useState, useEffect } from 'react';
import {
    User,
    Building2,
    Sliders as ExtraIcon,
    ClipboardList
} from 'lucide-react';
import ProfileTab from '../../components/settings/ProfileTab';
import OrganizationTab from '../../components/settings/OrganizationTab';
import EPaperManager from './EPaperManager';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebaseClient';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

const AuditLogsTab = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAction, setSelectedAction] = useState('All');

    useEffect(() => {
        const q = query(
            collection(db, "audit_logs"),
            orderBy("timestamp", "desc"),
            limit(150)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            setLogs(list);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching audit logs:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredLogs = logs.filter(log => {
        const matchesSearch = 
            (log.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.action || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAction = selectedAction === 'All' || log.action === selectedAction;
        return matchesSearch && matchesAction;
    });

    const uniqueActions = ['All', ...Array.from(new Set(logs.map(l => l.action).filter(Boolean)))];

    const getBadgeColor = (action) => {
        switch (action) {
            case 'Logged In':
                return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
            case 'PDF Scraper':
                return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
            case 'Self-Onboarding':
                return 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20';
            case 'Upload Coverage':
                return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <span className="text-xs font-bold text-slate-505 animate-pulse">Loading audit logs...</span>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-6">
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">System Audit Logs</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold leading-relaxed">
                    Track portal entries, document uploads, client self-assignments, and PDF scrape requests across the organization in real-time.
                </p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <input 
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search logs by email, details or action..."
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                    />
                </div>
                <div className="sm:w-48">
                    <select
                        value={selectedAction}
                        onChange={(e) => setSelectedAction(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:outline-none font-bold"
                    >
                        {uniqueActions.map(action => (
                            <option key={action} value={action}>{action}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Logs Table */}
            <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800">
                                <th className="p-4 text-3xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-1/4">User Email</th>
                                <th className="p-4 text-3xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-1/5">Action</th>
                                <th className="p-4 text-3xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Details</th>
                                <th className="p-4 text-3xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-1/6">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 dark:divide-slate-800 bg-white/40 dark:bg-slate-950/20">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
                                        No audit logs found matching current search filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const dateVal = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                                    const timeString = isNaN(dateVal.getTime()) 
                                        ? 'Just now' 
                                        : dateVal.toLocaleDateString() + ' ' + dateVal.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                    return (
                                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                            <td className="p-4 text-xs font-bold text-slate-755 dark:text-slate-300 truncate max-w-[200px]" title={log.email}>
                                                {log.email}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded-full text-3xs font-bold border uppercase tracking-wider ${getBadgeColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs text-slate-600 dark:text-slate-400 font-semibold leading-normal break-words max-w-[320px]">
                                                {log.details}
                                            </td>
                                            <td className="p-4 text-3xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                                {timeString}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const Settings = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    const emailLower = user?.email?.toLowerCase() || '';
    const isSatyam = emailLower === 'satyam.singh@themavericksindia.com' || emailLower === 'satyam@themavericksindia.com' || emailLower.includes('satyam');

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'organization', label: 'Organization', icon: Building2 },
        ...(isSatyam ? [
            { id: 'extra', label: 'Extra', icon: ExtraIcon },
            { id: 'audit', label: 'Audit Logs', icon: ClipboardList }
        ] : [])
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'profile': return <ProfileTab />;
            case 'organization': return <OrganizationTab />;
            case 'extra': return <EPaperManager />;
            case 'audit': return <AuditLogsTab />;
            default: return <ProfileTab />;
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your strategic preferences, notifications, security credentials, and organization metadata.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Vertical Tab Navigation */}
                <div className="lg:w-64 flex-shrink-0">
                    <nav className="flex flex-col space-y-1 bg-white dark:bg-[#111827] p-2 rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-medium cursor-pointer ${activeTab === tab.id
                                    ? tab.isDanger
                                        ? 'bg-rose-50 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400'
                                        : 'bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] text-white shadow-md'
                                    : tab.isDanger
                                        ? 'text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:bg-rose-400/10'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F2937]'
                                    }`}
                            >
                                <tab.icon size={18} className={activeTab === tab.id ? '' : 'text-gray-400 dark:text-gray-500'} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content Container */}
                <div className="flex-1">
                    <div className="bg-white dark:bg-[#111827] rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)] h-full">
                        {renderTabContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
