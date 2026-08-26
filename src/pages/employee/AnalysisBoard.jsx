import React, { useState } from 'react';
import { 
    Globe, 
    DollarSign, 
    LayoutGrid, 
    ShieldAlert, 
    Download, 
    ArrowRight, 
    Sparkles, 
    Search,
    Smile,
    TrendingUp,
    BookOpen,
    Eye,
    ExternalLink
} from 'lucide-react';

export default function AnalysisBoard() {
    const [activeTab, setActiveTab] = useState('live'); // 'live' or 'docs'
    const [iframeLoading, setIframeLoading] = useState(true);

    const targetUrl = "https://cerebro-358839170188.asia-south1.run.app/";

    return (
        <div className="space-y-6 w-full font-sans animate-fade-in">
            {/* Scoped animations */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes cerebro-pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.06); opacity: 0.9; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .cerebro-pulse-icon {
                    animation: cerebro-pulse 2.5s infinite ease-in-out;
                }
            `}} />

            {/* Header Dashboard Banner */}
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="absolute -right-24 -top-24 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex items-center gap-4 relative z-10">
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-600 dark:text-blue-400 cerebro-pulse-icon shrink-0">
                        <Globe size={26} strokeWidth={2.5} />
                    </div>
                    <div>
                        <span className="inline-block px-2.5 py-0.5 bg-blue-400/25 border border-blue-400/35 text-blue-600 dark:text-blue-350 text-[9px] font-extrabold uppercase tracking-[1.5px] rounded-md">
                            MEDIA INTELLIGENCE ENGINE
                        </span>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 dark:text-white mt-0.5">
                            Cerebro | Analysis Board
                        </h2>
                    </div>
                </div>

                {/* Tab Navigation */}
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
                            Live Board
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
                </div>
            </div>

            {/* Main Content Area */}
            {activeTab === 'live' ? (
                <div className="relative rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl overflow-hidden transition-all duration-300">
                    {/* URL Status Bar */}
                    <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-150 dark:border-slate-850 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                Target Frame: <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 dark:text-blue-400 font-semibold">{targetUrl}</a>
                            </span>
                        </div>
                        <a 
                            href={targetUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-slate-400 dark:text-slate-500 font-bold hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 hover:underline"
                        >
                            Open in New Tab <ExternalLink size={10} />
                        </a>
                    </div>

                    {/* IFrame with loading spinner */}
                    <div className="relative w-full h-[850px] bg-slate-50 dark:bg-[#0B0F19]">
                        {iframeLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-slate-950 z-20">
                                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-4 animate-pulse">
                                    Loading Cerebro Analysis Interface&hellip;
                                </p>
                            </div>
                        )}
                        <iframe
                            src={targetUrl}
                            title="Cerebro Analysis Board"
                            onLoad={() => setIframeLoading(false)}
                            className="w-full h-full border-0"
                            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                        />
                    </div>
                </div>
            ) : (
                /* System Documentation Tab */
                <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-955 shadow-2xl transition-all duration-500 hover:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.12)] group">
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
                                <strong className="text-slate-800 dark:text-white font-bold">Cerebro</strong> is the organization's dedicated media intelligence engine for tracking and analyzing brand coverage across active publications. By capturing exactly where and how our target clients or policies are mentioned in the news, it creates a clean audit trail that measures reputational health and estimates overall reader reach.
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
                                        <Search size={18} strokeWidth={2.5} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Automated News Coverage Tracker
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                            Continuously crawls global media networks, digital publications, and press outlets to index brand mentions and articles in real-time.
                                        </p>
                                    </div>
                                </div>

                                {/* Feature 2 */}
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                                        <Smile size={18} strokeWidth={2.5} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Reputational Sentiment Analysis
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                            Evaluates article copy to automatically categorize media coverage as positive, neutral, or negative, providing instant reputational insights.
                                        </p>
                                    </div>
                                </div>

                                {/* Feature 3 */}
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-full bg-red-50 dark:bg-red-950/40 text-red-650 dark:text-red-400 flex items-center justify-center shrink-0 shadow-inner">
                                        <Eye size={18} strokeWidth={2.5} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Estimated Reach & Impact
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                            Projects estimated readership reach and relative publication influence parameters to quantify the exact value of brand appearances.
                                        </p>
                                    </div>
                                </div>

                                {/* Feature 4 */}
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-650 dark:text-purple-450 flex items-center justify-center shrink-0 shadow-inner">
                                        <LayoutGrid size={18} strokeWidth={2.5} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Taxonomy & Competitor Filters
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                            Maps industry-specific taxonomies, handles alias normalization, and cleans out irrelevant keyword noise for direct competitive auditing.
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
                                        Ingest Feeds
                                    </h5>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                        Digital news channels and target publications are monitored automatically every 5 minutes to gather articles.
                                    </p>
                                </div>

                                {/* Step 2 */}
                                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
                                    <div className="absolute top-4 right-4 text-2xl font-black text-slate-200 dark:text-slate-800 leading-none select-none">
                                        02
                                    </div>
                                    <h5 className="text-xs font-black uppercase text-slate-900 dark:text-white mb-2 tracking-wider">
                                        Match & Score
                                    </h5>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                        Mentions are validated against active client lists, parsed for sentiment score parameters, and decoded.
                                    </p>
                                </div>

                                {/* Step 3 */}
                                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
                                    <div className="absolute top-4 right-4 text-2xl font-black text-slate-200 dark:text-slate-800 leading-none select-none">
                                        03
                                    </div>
                                    <h5 className="text-xs font-black uppercase text-slate-900 dark:text-white mb-2 tracking-wider">
                                        Audit Telemetry
                                    </h5>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                        Leadership tracks overall brand reputation, downloads clean telemetry audits, and views impact analysis.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Prompt Box Section */}
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-[1.5rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="space-y-1 text-center sm:text-left">
                                <h5 className="text-sm font-extrabold text-emerald-805 dark:text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5">
                                    <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
                                    Access Your Media Intelligence Desk
                                </h5>
                                <p className="text-xs text-emerald-700/85 dark:text-emerald-400/70 font-semibold leading-relaxed max-w-md">
                                    Open the real-time news crawler, sentiment reporting systems, and coverage dashboards on the Cerebro console.
                                </p>
                            </div>
                            
                            <a 
                                href={targetUrl} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35 hover:scale-[1.03] transition-all flex items-center gap-2 cursor-pointer shrink-0"
                            >
                                <span>Go to Cerebro</span>
                                <ArrowRight size={13} strokeWidth={2.5} />
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
