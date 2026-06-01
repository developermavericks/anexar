import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { useUser } from '../../context/UserContext';
import { 
    TrendingUp, 
    Newspaper, 
    PieChart, 
    Target, 
    ShieldCheck, 
    Save,
    RefreshCw,
    Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

const KPI = ({ title, value, trend, icon: Icon, color }) => (
    <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex items-center justify-between hover:-translate-y-1 transition-transform cursor-pointer">
        <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{value}</h3>
            <p className={`text-xs mt-2 ${trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-450'}`}>
                {trend} vs last month
            </p>
        </div>
        <div className={`p-4 rounded-3xl ${color}`}>
            <Icon size={24} className="text-white" />
        </div>
    </div>
);

export default function Dashboard() {
    const { user } = useUser();

    // KPI Values State synced with localStorage
    const [kpis, setKpis] = useState(() => {
        const saved = localStorage.getItem('anexar_client_kpis');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error(e);
            }
        }
        return {
            activeCampaigns: '3',
            pressCoverage: '1.2M',
            budgetUsed: '65%',
            goalCompletion: '82%'
        };
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Save KPIs to localStorage
    const handleSaveKPIs = (updatedKpis) => {
        setIsSaving(true);
        setTimeout(() => {
            localStorage.setItem('anexar_client_kpis', JSON.stringify(updatedKpis));
            setIsSaving(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        }, 800);
    };

    const handleInputChange = (field, value) => {
        const nextKpis = { ...kpis, [field]: value };
        setKpis(nextKpis);
        // Auto-save/sync immediately in real-time
        localStorage.setItem('anexar_client_kpis', JSON.stringify(nextKpis));
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto font-sans pb-12 text-slate-900 dark:text-slate-100 animate-fade-in">
            {/* Prominent Header Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-blue-500/15 rounded-3xl p-8 border border-amber-500/20 shadow-xl">
                <div className="absolute right-0 top-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <span className="px-2.5 py-0.5 bg-amber-500/15 text-amber-500 rounded-full text-4xs font-extrabold uppercase tracking-wider">
                            Executive Portal
                        </span>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
                            Welcome back, <span className="bg-gradient-to-r from-amber-500 to-purple-500 bg-clip-text text-transparent">{user.name}</span>!
                        </h1>
                        <p className="text-sm text-slate-650 dark:text-slate-400 mt-2 font-medium max-w-xl">
                            Here is the Mavericks organization console. Monitor campaign deliverables, adjust client-facing metrics, and publish updates in real-time.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-purple-600 p-0.5">
                            <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center font-bold text-sm">
                                {user.avatar ? <img src={user.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" /> : user.name.charAt(0)}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{user.name}</p>
                            <p className="text-4xs text-slate-400 font-semibold tracking-wider uppercase">{user.profile?.designation || 'Account Strategist'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards consistent with Client Dashboard */}
            <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-450 dark:text-slate-555">
                    Live Client-Portal KPI Display
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <KPI title="Active Campaigns" value={kpis.activeCampaigns} trend="+12%" icon={TrendingUp} color="bg-[#1A1A1A] dark:bg-amber-550 text-amber-500 dark:text-amber-400" />
                    <KPI title="Goal Completion" value={kpis.goalCompletion} trend="+8%" icon={Target} color="bg-emerald-500 dark:bg-emerald-500/90 text-emerald-400" />
                </div>
            </div>

            {/* KPI Live Controller Form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="border-none shadow-md bg-white dark:bg-slate-950 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 lg:col-span-2 space-y-6">
                    <div>
                        <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <RefreshCw className="text-amber-500" size={18} />
                            Interactive Card Synchronization
                        </h3>
                        <p className="text-2xs text-slate-400 dark:text-slate-555 mt-1 font-medium">
                            Alter key parameters below. Any adjustment triggers an instant real-time synchronization to the Client Portal Dashboard.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-900">
                        {/* Active Campaigns Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Active Campaigns (Count)</label>
                            <input
                                type="number"
                                min="0"
                                value={kpis.activeCampaigns}
                                onChange={(e) => handleInputChange('activeCampaigns', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-gray-905 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-all font-semibold text-xs"
                            />
                        </div>

                        {/* Goal Completion Slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Goal Completion (%)</label>
                                <span className="text-xs font-bold text-emerald-500">{kpis.goalCompletion}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={parseInt(kpis.goalCompletion) || 0}
                                onChange={(e) => handleInputChange('goalCompletion', `${e.target.value}%`)}
                                className="w-full accent-emerald-500 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-900 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            {saveSuccess ? (
                                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                                    <ShieldCheck size={14} /> Synced successfully!
                                </span>
                            ) : (
                                <span className="text-3xs text-slate-400 font-semibold">Changes are saved automatically in real-time.</span>
                            )}
                        </div>
                        <button
                            onClick={() => handleSaveKPIs(kpis)}
                            disabled={isSaving}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
                        >
                            {isSaving ? (
                                <>
                                    <span className="h-3 w-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                    <span>Syncing...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={13} />
                                    <span>Force Sync</span>
                                </>
                            )}
                        </button>
                    </div>
                </Card>

                {/* Info Card */}
                <Card className="border-none shadow-md bg-gradient-to-tr from-slate-900 to-slate-950 dark:from-slate-950 dark:to-slate-990 rounded-3xl p-6 text-white border border-slate-800 flex flex-col justify-between">
                    <div className="space-y-4">
                        <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-4xs font-extrabold uppercase tracking-widest inline-block">
                            Live Sync Engine
                        </span>
                        <h3 className="text-lg font-bold">Client Dashboard Integration</h3>
                        <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                            When clients load their dashboard portal, the metrics are parsed directly from this shared localStorage key.
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                            This creates an immediate, seamless feedback loop between manager allocations and client deliverables without any back-end lag.
                        </p>
                    </div>

                    <div className="mt-8 pt-4 border-t border-slate-800 flex items-center gap-2 text-amber-400 font-bold text-xs">
                        <Sparkles size={14} className="animate-pulse" />
                        <span>Ready for Operations</span>
                    </div>
                </Card>
            </div>
        </div>
    );
}
