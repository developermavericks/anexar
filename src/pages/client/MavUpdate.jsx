import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { useUser } from '../../context/UserContext';
import { 
    Clock, 
    Download, 
    FileText, 
    FileSpreadsheet, 
    BookOpen, 
    TrendingUp, 
    Sparkles, 
    User,
    ChevronDown,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CLIENTS = ["Visionary Media Pvt Ltd", "Acura Corporate", "RedBull Racing", "Spotify", "Vercel", "Nike"];

export default function MavUpdate() {
    const { user } = useUser();
    const clientCompany = user?.organization?.companyName || "Visionary Media Pvt Ltd";
    
    const [selectedClient, setSelectedClient] = useState(clientCompany);
    const [updates, setUpdates] = useState([]);

    // Fetch updates from localStorage
    const loadUpdates = () => {
        const stored = localStorage.getItem('anexar_client_updates');
        if (stored) {
            try {
                setUpdates(JSON.parse(stored));
            } catch (e) {
                console.error(e);
            }
        }
    };

    useEffect(() => {
        loadUpdates();
        // Set up custom event listener or simple interval to check for real-time updates
        const interval = setInterval(loadUpdates, 1500);
        return () => clearInterval(interval);
    }, []);

    // Filter updates for the active client selection
    const filteredUpdates = updates.filter(
        upd => upd.client.toLowerCase() === selectedClient.toLowerCase()
    );

    return (
        <div className="space-y-8 max-w-5xl mx-auto font-sans pb-12 text-slate-900 dark:text-slate-100 animate-fade-in">
            {/* Header banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-cyan-500/10 to-blue-600/10 rounded-3xl p-8 border border-cyan-500/20 shadow-xl">
                <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <span className="px-2.5 py-0.5 bg-cyan-500/15 text-cyan-500 rounded-full text-4xs font-extrabold uppercase tracking-widest">
                            Intelligence Feed
                        </span>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                            MAV Update Board
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium">
                            Real-time deliverables, spreadsheets, and strategy files compiled by your Mavericks account manager.
                        </p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center shrink-0 w-12 h-12">
                        <RefreshCw className="text-cyan-500 animate-spin" style={{ animationDuration: '8s' }} size={24} />
                    </div>
                </div>
            </div>

            {/* Filter control */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">
                        Active Workspace: {clientCompany}
                    </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label className="text-xs font-bold text-slate-400 shrink-0">Filter Client:</label>
                    <div className="relative w-full sm:w-56">
                        <select
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl px-4 py-2 pr-10 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-semibold text-xs cursor-pointer"
                        >
                            {CLIENTS.map((client) => (
                                <option key={client} value={client}>
                                    {client === clientCompany ? `${client} (Your Org)` : client}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                </div>
            </div>

            {/* Content Feed */}
            {filteredUpdates.length === 0 ? (
                <Card className="border-none shadow-md bg-white dark:bg-slate-950 rounded-3xl p-12 text-center text-slate-400 dark:text-slate-600 border border-slate-100 dark:border-slate-850 py-20 flex flex-col items-center justify-center">
                    <Clock size={48} className="text-slate-300 dark:text-slate-700 mb-4 animate-pulse" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">
                        No Updates Posted Yet
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mt-2 font-medium">
                        Your account manager hasn't posted any files or updates for <strong>{selectedClient}</strong> yet. Any items submitted in the Team Portal will display here instantly.
                    </p>
                </Card>
            ) : (
                <div className="space-y-6">
                    {filteredUpdates.map((update, index) => (
                        <motion.div
                            key={update.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="border-none shadow-md bg-white dark:bg-slate-950 rounded-3xl p-6 border border-slate-100 dark:border-slate-850 hover:border-cyan-500/25 dark:hover:border-cyan-500/20 transition-all">
                                {/* Update Card Title / Timestamp */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-900 pb-4 mb-6">
                                    <div className="flex items-center gap-2.5">
                                        <div className="bg-cyan-50 dark:bg-cyan-550/10 text-cyan-600 dark:text-cyan-400 p-2 rounded-xl border border-cyan-100/50 dark:border-cyan-500/10 shrink-0">
                                            <Sparkles size={16} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                Update Compiled for {update.client}
                                            </h3>
                                            <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                                                Update ID: {update.id}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-3xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200/20 dark:border-slate-800 shrink-0 self-start sm:self-center">
                                        Published: {update.timestamp}
                                    </span>
                                </div>

                                {/* Submitted Sections Display */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Overall Work Notes (if present) */}
                                    {update.data.overallWork && (
                                        <div className="md:col-span-2 bg-[#FDFBF7] dark:bg-slate-900/40 p-5 rounded-2xl border border-[#EAE8E4] dark:border-slate-850 relative overflow-hidden">
                                            <div className="absolute right-4 top-4 text-3xs font-extrabold uppercase tracking-widest text-[#EAE8E4] dark:text-slate-800 pointer-events-none select-none">
                                                OVERALL BRIEF
                                            </div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2.5">
                                                <BookOpen size={14} className="text-cyan-500" />
                                                Account Progress & Notes
                                            </h4>
                                            <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed font-semibold italic">
                                                "{update.data.overallWork.text}"
                                            </p>
                                        </div>
                                    )}

                                    {/* Files List */}
                                    {Object.keys(update.data).map((key) => {
                                        if (key === 'overallWork' || !update.data[key]) return null;
                                        
                                        const fileData = update.data[key];
                                        const formattedTitle = key === 'pressReleases' ? 'Press Releases'
                                                             : key === 'tracker' ? 'Daily/Monthly Tracker'
                                                             : key === 'annualReport' ? 'Annual Report'
                                                             : 'Outreach List';
                                        
                                        return (
                                            <div 
                                                key={key}
                                                className="bg-slate-50 dark:bg-slate-900/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 hover:bg-slate-100/50 dark:hover:bg-slate-900/40 transition-colors flex items-center justify-between gap-4"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                                        key === 'tracker' 
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 border-emerald-250/20'
                                                            : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-450 border-blue-250/20'
                                                    }`}>
                                                        {key === 'tracker' ? <FileSpreadsheet size={18} /> : <FileText size={18} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{formattedTitle}</p>
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate max-w-[200px]" title={fileData.fileName}>
                                                            {fileData.fileName}
                                                        </p>
                                                    </div>
                                                </div>

                                                <a
                                                    href={`data:text/plain;charset=utf-8,${encodeURIComponent(fileData.fileName)}`}
                                                    download={fileData.fileName}
                                                    title="Download Document"
                                                    className="p-2.5 bg-white dark:bg-slate-950 hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-600 text-slate-500 dark:text-slate-400 rounded-xl shadow-sm border border-slate-150 dark:border-slate-800 transition-all cursor-pointer shrink-0"
                                                >
                                                    <Download size={14} />
                                                </a>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
