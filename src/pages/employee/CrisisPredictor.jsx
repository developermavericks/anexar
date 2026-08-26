import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
    ShieldAlert, 
    Database, 
    Mail, 
    Activity, 
    Eye,
    Globe,
    BookOpen,
    ExternalLink
} from 'lucide-react';

export default function CrisisPredictor() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('live'); // 'live' or 'docs'
    const [serverSource, setServerSource] = useState('production'); // 'production' or 'local'
    const [iframeLoading, setIframeLoading] = useState(true);

    const productionUrl = "https://brand-tracker-ejw3.onrender.com/";
    const localUrl = "http://localhost:8501";
    const userEmail = user?.email || 'default';
    const currentIframeUrl = serverSource === 'production' 
        ? `${productionUrl}?user_email=${encodeURIComponent(userEmail)}`
        : `${localUrl}?user_email=${encodeURIComponent(userEmail)}`;

    // Show server selector only during local development testing
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    return (
        <div className="space-y-6 w-full font-sans animate-fade-in">
            {/* Scoped animations */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes crisis-pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.06); opacity: 0.9; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .crisis-pulse-icon {
                    animation: crisis-pulse 2.5s infinite ease-in-out;
                }
            `}} />

            {/* Header Dashboard Banner */}
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="absolute -right-24 -top-24 w-96 h-96 bg-red-500/10 dark:bg-red-500/20 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex items-center gap-4 relative z-10">
                    <div className="h-12 w-12 rounded-2xl bg-red-500/20 border border-red-400/30 flex items-center justify-center text-red-650 dark:text-red-400 crisis-pulse-icon shrink-0">
                        <ShieldAlert size={26} strokeWidth={2.5} />
                    </div>
                    <div>
                        <span className="inline-block px-2.5 py-0.5 bg-red-400/25 border border-red-400/35 text-red-650 dark:text-red-300 text-[9px] font-extrabold uppercase tracking-[1.5px] rounded-md">
                            THREAT PROTECTION
                        </span>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 dark:text-white mt-0.5">
                            Risk Escape | Crisis & Brand Tracker
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
                                    ? 'bg-purple-600 text-white shadow-md'
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
                                    ? 'bg-purple-600 text-white shadow-md'
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
                                title="Use deployed Render webapp server"
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
                                title="Connect to local Streamlit on port 8501"
                            >
                                Localhost (8501)
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
                                Target Frame: <a href={currentIframeUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-purple-600 dark:text-purple-400 font-semibold">{currentIframeUrl}</a>
                            </span>
                        </div>
                        <a 
                            href={currentIframeUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-slate-400 dark:text-slate-500 font-bold hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1 hover:underline"
                        >
                            Open in New Tab <ExternalLink size={10} />
                        </a>
                    </div>

                    {/* Local server helper panel */}
                    {serverSource === 'local' && (
                        <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/10 border-b border-indigo-100/50 dark:border-indigo-950/30 text-xs text-slate-650 dark:text-slate-400 flex items-center justify-between gap-4">
                            <div>
                                💡 To view your local brand tracker here, make sure your Streamlit app is running in your terminal:
                                <code className="ml-2 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 rounded text-[11px] font-mono text-indigo-700 dark:text-indigo-300">streamlit run app.py</code>
                            </div>
                            <span className="text-[9px] font-bold text-indigo-550 shrink-0 uppercase">Development Mode</span>
                        </div>
                    )}

                    {/* IFrame with loading spinner */}
                    <div className="relative w-full h-[850px] bg-slate-50 dark:bg-[#0B0F19]">
                        {iframeLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-slate-950 z-20">
                                <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-600 rounded-full animate-spin"></div>
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-4 animate-pulse">
                                    Loading News Tracker Interface&hellip;
                                </p>
                            </div>
                        )}
                        <iframe
                            src={currentIframeUrl}
                            title="Real-Time Brand Tracker App"
                            onLoad={() => setIframeLoading(false)}
                            className="w-full h-full border-0"
                            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                        />
                    </div>
                </div>
            ) : (
                /* System Documentation Tab */
                <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl p-8 md:p-10 space-y-9">
                    {/* Visual Background Accent Glow Backdrops */}
                    <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl transition-all duration-700 pointer-events-none"></div>

                    {/* Operational Overview Section */}
                    <div className="space-y-3 relative z-10">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b-2 border-slate-100 dark:border-slate-800 pb-2.5">
                            Operational Overview
                        </h3>
                        <p className="text-sm md:text-base text-slate-655 dark:text-slate-350 leading-relaxed font-medium">
                            <strong className="text-slate-800 dark:text-white font-bold">Risk Escape</strong> is the organization's central early-warning crisis intelligence radar. It proactively monitors, evaluates, and alerts on financial and operational risks impacting our key client and partner entities. By orchestrating fully automated background web crawlers, NLP-based sentiment analyzers, and instant SMTP broadcast protocols, Risk Escape acts as the ultimate buffer against market volatility and reputational escalations, giving your leadership team the power of preemptive decision-making.
                        </p>
                    </div>

                    {/* Features Detailed Layout */}
                    <div className="space-y-6 relative z-10">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b-2 border-slate-100 dark:border-slate-800 pb-2.5">
                            Key Capabilities & Features
                        </h3>
                        
                        <div className="flex flex-col gap-6">
                            {/* Feature 1 */}
                            <div className="flex items-start gap-4">
                                <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
                                    <Activity size={18} strokeWidth={2.5} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Semantic Sentiment Polarity
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                        Integrates <code>TextBlob</code> natural language processing models, generating polarity values on collected contexts to tag articles as positive, neutral, or negative threat vectors inside Google Sheets.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* How It Works Steps Grid */}
                    <div className="space-y-4 relative z-10">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b-2 border-slate-100 dark:border-slate-800 pb-2.5">
                            How It Works
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
                                <h5 className="text-xs font-black uppercase text-slate-900 dark:text-white mb-2 tracking-wider">
                                    Escalate Threat
                                </h5>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                    Notifier algorithms flag highly negative sentiment reports and dispatch instant SMTP-SSL briefings.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
