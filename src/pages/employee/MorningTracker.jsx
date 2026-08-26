import React, { useState } from 'react';
import { 
    Sun, 
    Shield, 
    Clock, 
    Database, 
    Download, 
    Globe, 
    BookOpen, 
    ExternalLink, 
    Sparkles, 
    ArrowRight 
} from 'lucide-react';

export default function MorningTracker() {
    const [activeTab, setActiveTab] = useState('live'); // 'live' or 'docs'
    const [serverSource, setServerSource] = useState('production'); // 'production' or 'local'
    const [iframeLoading, setIframeLoading] = useState(true);

    const productionUrl = "https://morning-tracker-sigma.vercel.app/login";
    const localUrl = "http://localhost:3000";
    const currentIframeUrl = serverSource === 'production' ? productionUrl : localUrl;

    // Show server selector only during local development testing
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    return (
        <div className="space-y-6 w-full font-sans animate-fade-in">
            {/* Scoped animations */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes nexus-pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.06); opacity: 0.9; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .nexus-pulse-icon {
                    animation: nexus-pulse 2.5s infinite ease-in-out;
                }
            `}} />

            {/* Header Dashboard Banner */}
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-955 shadow-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="absolute -right-24 -top-24 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex items-center gap-4 relative z-10">
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-600 dark:text-blue-400 nexus-pulse-icon shrink-0">
                        <Sun size={26} strokeWidth={2.5} />
                    </div>
                    <div>
                        <span className="inline-block px-2.5 py-0.5 bg-blue-400/25 border border-blue-400/35 text-blue-600 dark:text-blue-350 text-[9px] font-extrabold uppercase tracking-[1.5px] rounded-md">
                            DAILY NEXUS ENGINE
                        </span>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 dark:text-white mt-0.5">
                            Nexus | Morning Tracker
                        </h2>
                    </div>
                </div>

                {/* Tab Navigation & Server Selector */}
                <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800">
                        <button
                            onClick={() => { setActiveTab('live'); setIframeLoading(true); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                                activeTab === 'live'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <Globe size={12} />
                            Live Tracker
                        </button>
                        <button
                            onClick={() => setActiveTab('docs')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                                activeTab === 'docs'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <BookOpen size={12} />
                            System Docs
                        </button>
                    </div>

                    {activeTab === 'live' && isLocal && (
                        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800">
                            <button
                                onClick={() => { setServerSource('production'); setIframeLoading(true); }}
                                className={`px-3 py-1.5 text-[9px] font-extrabold uppercase rounded-lg transition-all cursor-pointer ${
                                    serverSource === 'production'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
                                }`}
                                title="Use deployed Vercel webapp server"
                            >
                                Production Server
                            </button>
                            <button
                                onClick={() => { setServerSource('local'); setIframeLoading(true); }}
                                className={`px-3 py-1.5 text-[9px] font-extrabold uppercase rounded-lg transition-all cursor-pointer ${
                                    serverSource === 'local'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
                                }`}
                                title="Connect to local server on port 3000"
                            >
                                Localhost (3000)
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            {activeTab === 'live' ? (
                <div className="relative rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl overflow-hidden transition-all duration-300">
                    {/* URL Status Bar */}
                    <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-150 dark:border-slate-850 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${serverSource === 'production' ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500 animate-pulse'}`}></span>
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                Target Frame: <a href={currentIframeUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 dark:text-blue-400 font-semibold">{currentIframeUrl}</a>
                            </span>
                        </div>
                        <a 
                            href={currentIframeUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-slate-400 dark:text-slate-500 font-bold hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 hover:underline"
                        >
                            Open in New Tab <ExternalLink size={10} />
                        </a>
                    </div>

                    {/* Local server helper panel */}
                    {serverSource === 'local' && (
                        <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/10 border-b border-indigo-100/50 dark:border-indigo-950/30 text-xs text-slate-655 dark:text-slate-400 flex items-center justify-between gap-4">
                            <div>
                                💡 To view your local morning tracker here, make sure your dev server is running locally:
                                <code className="ml-2 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 rounded text-[11px] font-mono text-indigo-700 dark:text-indigo-300">npm run dev</code>
                            </div>
                            <span className="text-[9px] font-bold text-indigo-550 shrink-0 uppercase">Development Mode</span>
                        </div>
                    )}

                    {/* Embed Soon / Redirect Placeholder */}
                    <div className="flex flex-col items-center justify-center min-h-[500px] p-8 md:p-12 text-center bg-slate-50/50 dark:bg-slate-900/20">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                            <div className="relative h-20 w-20 rounded-3xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                                <Sparkles size={36} className="animate-pulse" />
                            </div>
                        </div>

                        <span className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-full mb-3">
                            Temporary Portal Redirect
                        </span>
                        
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight max-w-md">
                            Embedding Morning Tracker Soon
                        </h3>
                        
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-3 max-w-lg leading-relaxed">
                            We are configuring the single-sign-on (SSO) and Vercel domain policies to frame the Morning Tracker directly inside Anexar. In the meantime, you can launch the live portal securely in a new tab.
                        </p>

                        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                            <a
                                href={currentIframeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span>Launch Workspace Portal</span>
                                <ExternalLink size={14} strokeWidth={2.5} />
                            </a>

                            {isLocal && (
                                <button
                                    onClick={() => {
                                        setServerSource(serverSource === 'production' ? 'local' : 'production');
                                    }}
                                    className="w-full sm:w-auto px-6 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-350 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer"
                                >
                                    {serverSource === 'production' ? "Switch to Localhost (3000)" : "Switch to Production Vercel"}
                                </button>
                            )}
                        </div>

                        {serverSource === 'local' && (
                            <div className="mt-6 p-4 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-950/30 rounded-2xl text-xs text-slate-655 dark:text-slate-400 flex items-center gap-2">
                                <span>💡 Dev Tip: Make sure your local server is running on port 3000:</span>
                                <code className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 rounded text-[11px] font-mono text-indigo-700 dark:text-indigo-300">npm run dev</code>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* System Documentation Tab */
                <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl transition-all duration-500 hover:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.12)] group">
                    {/* Visual Background Accent Glow Backdrops */}
                    <div className="absolute -right-24 -top-24 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl transition-all duration-700 pointer-events-none"></div>
                    <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl transition-all duration-700 pointer-events-none"></div>

                    {/* Detailed Application Breakdown Body */}
                    <div className="relative z-10 p-8 md:p-10 space-y-9">
                        {/* Operational Overview Section */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b-2 border-slate-100 dark:border-slate-800 pb-2.5">
                                Operational Overview
                            </h3>
                            <p className="text-sm md:text-base text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
                                <strong className="text-slate-800 dark:text-white font-bold">Morning Tracker Nexus</strong> is our organization's high-fidelity, distributed news intelligence and portfolio monitoring command center. Driven by an asynchronous Celery and Redis message broker, Nexus automates lookback harvesting windows (24-hour to 3-day discovery scopes) to track precise mentions of specified brand nodes. Operators can deploy targeted search profiles using a compliance-enforced keyword framework across multi-regional streams—including India, Europe, USA, Japan, and Australia. Designed with self-healing protocols, the engine bypasses paywalls, tracks API limits dynamically, and streams live telemetry directly to the central portal to align your team with critical market developments every single morning.
                            </p>
                        </div>

                        {/* Features Detailed Layout */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b-2 border-slate-100 dark:border-slate-800 pb-2.5">
                                Key Capabilities & Features
                            </h3>
                            
                            <div className="flex flex-col gap-6">
                                {/* Feature 1 */}
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
                                        <Shield size={18} strokeWidth={2.5} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Compliance Watchlists & Target Mappings
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                            Configure brand nodes with dedicated regional targets (including USA, India, UK, Europe, Japan, and Global) while enforcing a strict 15-keyword compliance limit per brand node to prevent tracking dilution.
                                        </p>
                                    </div>
                                </div>

                                {/* Feature 2 */}
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                                        <Clock size={18} strokeWidth={2.5} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Flexible Lookback Discovery Scans
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                            Run customized harvesting windows ranging from 24-hour rapid updates up to 3-day complete sweeps, keeping operators completely updated on recent publications.
                                        </p>
                                    </div>
                                </div>

                                {/* Feature 3 */}
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-full bg-rose-50 dark:bg-rose-955/40 text-rose-650 dark:text-rose-450 flex items-center justify-center shrink-0 shadow-inner">
                                        <Database size={18} strokeWidth={2.5} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Distributed Worker Telemetry
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                            Asynchronous processing queues powered by FastAPI, Celery, and Redis to process jobs concurrently, featuring real-time state telemetry (pending, running, completed, or failed) and emergency override purges.
                                        </p>
                                    </div>
                                </div>

                                {/* Feature 4 */}
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-650 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-inner">
                                        <Download size={18} strokeWidth={2.5} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Strategic Spreadsheet Exporting
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                            Generate and export comprehensive intelligence reports, brand briefings, and news mention lists in clean, formula-ready Excel structures.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* How It Works Steps Grid */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b-2 border-slate-100 dark:border-slate-800 pb-2.5">
                                How It Works
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Step 1 */}
                                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
                                    <div className="absolute top-4 right-4 text-2xl font-black text-slate-200 dark:text-slate-800 leading-none select-none">
                                        01
                                    </div>
                                    <h5 className="text-xs font-black uppercase text-slate-900 dark:text-white mb-2 tracking-wider">
                                        Configure Brand
                                    </h5>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                        Define target brand nodes, map regions, and input up to 15 compliance-enforced monitoring keywords.
                                    </p>
                                </div>

                                {/* Step 2 */}
                                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
                                    <div className="absolute top-4 right-4 text-2xl font-black text-slate-200 dark:text-slate-800 leading-none select-none">
                                        02
                                    </div>
                                    <h5 className="text-xs font-black uppercase text-slate-900 dark:text-white mb-2 tracking-wider">
                                        Execute sweeps
                                    </h5>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                        FastAPI triggers concurrent crawler tasks via Celery and Redis brokers, bypassing paywalls autonomously.
                                    </p>
                                </div>

                                {/* Step 3 */}
                                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
                                    <div className="absolute top-4 right-4 text-2xl font-black text-slate-200 dark:text-slate-800 leading-none select-none">
                                        03
                                    </div>
                                    <h5 className="text-xs font-black uppercase text-slate-900 dark:text-white mb-2 tracking-wider">
                                        Sync Telemetry
                                    </h5>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                        Progress feeds stream live via WebSockets, compiling daily briefings and Excel tracking sheets.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Prompt Box Section */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/10 border border-blue-100 dark:border-blue-900/30 rounded-[1.5rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="space-y-1 text-center sm:text-left">
                                <h5 className="text-sm font-extrabold text-blue-800 dark:text-blue-400 flex items-center justify-center sm:justify-start gap-1.5">
                                    <Sparkles size={14} className="text-blue-600 dark:text-blue-400 animate-spin" style={{ animationDuration: '6s' }} />
                                    Access the Nexus Portfolio Desk
                                </h5>
                                <p className="text-xs text-blue-700/85 dark:text-blue-400/70 font-semibold leading-relaxed max-w-md">
                                    Open the real-time news crawler, brand watchlist settings, and Celery processing queues on the Morning Tracker console.
                                </p>
                            </div>
                            
                            <a 
                                href={currentIframeUrl} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 hover:scale-[1.03] transition-all flex items-center gap-2 cursor-pointer shrink-0"
                            >
                                <span>Go to Nexus</span>
                                <ArrowRight size={13} strokeWidth={2.5} />
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
