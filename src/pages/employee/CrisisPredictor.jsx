import React from 'react';
import { 
    ShieldAlert, 
    Clock, 
    Database, 
    Mail, 
    ArrowRight, 
    Sparkles, 
    Activity, 
    Eye
} from 'lucide-react';

export default function CrisisPredictor() {
    return (
        <div className="space-y-8 max-w-4xl mx-auto px-4 py-8 font-sans animate-fade-in">
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

            {/* Premium, High-Detail Glassmorphic Operational Card matching Cerebro, Clocked & Nexus */}
            <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl transition-all duration-500 hover:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.12)] group">
                
                {/* Visual Background Accent Glow Backdrops */}
                <div className="absolute -right-24 -top-24 w-96 h-96 bg-red-500/10 dark:bg-red-500/20 rounded-full blur-3xl transition-all duration-700 group-hover:bg-red-500/15"></div>
                <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-3xl transition-all duration-700 group-hover:bg-blue-500/10"></div>

                {/* Header Brand Band with Royal Blue Gradient */}
                <div className="relative bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-955 px-8 py-8 md:px-10 text-white border-b border-indigo-955">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(239,68,68,0.18),transparent_60%)]"></div>
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-red-500/20 border border-red-400/30 flex items-center justify-center text-red-300 crisis-pulse-icon">
                                    <ShieldAlert size={26} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <span className="inline-block px-2.5 py-0.5 bg-red-400/25 border border-red-400/35 text-white text-[9px] font-extrabold uppercase tracking-[1.5px] rounded-md">
                                        THREAT PROTECTION
                                    </span>
                                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1">
                                        Risk Escape | Crisis Tracker
                                    </h2>
                                </div>
                            </div>
                            
                            <div className="hidden sm:flex items-center gap-2 bg-slate-900/60 border border-white/10 px-3.5 py-1.5 rounded-full">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-350">
                                    MONITORING ACTIVE
                                </span>
                            </div>
                        </div>
                        <div className="mt-2 text-[10px] md:text-2xs font-extrabold uppercase tracking-[1.2px] text-blue-200/90 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-white/10 pt-4">
                            <span>Adaptive Brand Telemetry</span>
                            <span className="text-blue-500/50">•</span>
                            <span>Sentiment Polarity Tracking</span>
                            <span className="text-blue-500/50">•</span>
                            <span>SMTP Escalation Alerts</span>
                        </div>
                    </div>
                </div>

                {/* Detailed Application Breakdown Body */}
                <div className="relative z-10 p-8 md:p-10 space-y-9">
                    
                    {/* Operational Overview Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b-2 border-slate-100 dark:border-slate-800 pb-2.5">
                            Operational Overview
                        </h3>
                        <p className="text-sm md:text-base text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
                            <strong className="text-slate-800 dark:text-white font-bold">Risk Escape</strong> is the organization's central early-warning crisis intelligence radar. It proactively monitors, evaluates, and alerts on financial and operational risks impacting our key client and partner entities. By orchestrating fully automated background web crawlers, NLP-based sentiment analyzers, and instant SMTP broadcast protocols, Risk Escape acts as the ultimate buffer against market volatility and reputational escalations, giving your leadership team the power of preemptive decision-making.
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
                                    <Activity size={18} strokeWidth={2.5} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Adaptive Brand Telemetry
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                        Managed by <code>scheduler.py</code> via background <code>APScheduler</code> intervals. It conducts regional (Global/India) RSS feed analysis matching key brand expressions with automatic metadata filtering limits.
                                    </p>
                                </div>
                            </div>

                            {/* Feature 2 */}
                            <div className="flex items-start gap-4">
                                <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                                    <Eye size={18} strokeWidth={2.5} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Dual-Extraction Engine
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                        Uses parallel threads in <code>fetcher.py</code> to execute deep crawls. Resolves secure Google redirects via <code>gnewsdecoder</code> and scrapes full text with <code>Newspaper3k</code> and <code>Trafilatura</code>.
                                    </p>
                                </div>
                            </div>

                            {/* Feature 3 */}
                            <div className="flex items-start gap-4">
                                <div className="h-10 w-10 rounded-full bg-red-50 dark:bg-red-950/40 text-red-650 dark:text-red-400 flex items-center justify-center shrink-0 shadow-inner">
                                    <Database size={18} strokeWidth={2.5} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Semantic Sentiment Polarity
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                        Integrates <code>TextBlob</code> natural language processing models, generating polarity values on collected contexts to tag articles as positive, neutral, or negative threat vectors inside SQLite.
                                    </p>
                                </div>
                            </div>

                            {/* Feature 4 */}
                            <div className="flex items-start gap-4">
                                <div className="h-10 w-10 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-650 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-inner">
                                    <Mail size={18} strokeWidth={2.5} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                        SMTP-SSL Threat Broadcasts
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                        Equipped with SMTP triggers inside <code>notifier.py</code> that compile automatic, structured notifications. Fires instant email briefs directly to stakeholders when threats are identified.
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
                                    Monitor Feeds
                                </h5>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                    APScheduler background routines fetch Global and Indian feeds autonomously every 5 minutes.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
                                <div className="absolute top-4 right-4 text-2xl font-black text-slate-200 dark:text-slate-800 leading-none select-none">
                                    02
                                </div>
                                <h5 className="text-xs font-black uppercase text-slate-900 dark:text-white mb-2 tracking-wider">
                                    Extract & Score
                                </h5>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                    Multi-threaded extractors parse clear body text, and TextBlob models run semantic polarity ratings.
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
                                <div className="absolute top-4 right-4 text-2xl font-black text-slate-200 dark:text-slate-800 leading-none select-none">
                                    03
                                </div>
                                <h5 className="text-xs font-black uppercase text-slate-900 dark:text-white mb-2 tracking-wider">
                                    Escalate Threat
                                </h5>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                    Notifier algorithms flag highly negative sentiment reports and dispatch instant SMTP-SSL briefings.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Integrated System Telemetry Strip */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-inner">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">CRON CYCLE</span>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-200">5 Minutes</span>
                        </div>
                        <div className="hidden sm:block h-8 w-[1px] bg-slate-200 dark:bg-slate-800" />
                        
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">THREAT STATUS</span>
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                0 ACTIVE INCIDENTS
                            </span>
                        </div>
                        <div className="hidden sm:block h-8 w-[1px] bg-slate-200 dark:bg-slate-800" />
                        
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">DATABASE SYSTEM</span>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                SQLite Sync
                            </span>
                        </div>
                    </div>

                    {/* Action Prompt Box Section (Emerald-styled matching Cerebro, Clocked & Nexus) */}
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-[1.5rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="space-y-1 text-center sm:text-left">
                            <h5 className="text-sm font-extrabold text-emerald-805 dark:text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5">
                                <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
                                Access Risk Escape Telemetry
                            </h5>
                            <p className="text-xs text-emerald-700/85 dark:text-emerald-400/70 font-semibold leading-relaxed max-w-md">
                                Open the real-time sentiment alerts database, brand monitoring parameters, and scheduler task logs on the Risk Escape dashboard.
                            </p>
                        </div>
                        
                        <a 
                            href="https://crisis-dashboard-themavericksindia.streamlit.app/" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35 hover:scale-[1.03] transition-all flex items-center gap-2 cursor-pointer shrink-0"
                        >
                            <span>Go to Risk Escape</span>
                            <ArrowRight size={13} strokeWidth={2.5} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
