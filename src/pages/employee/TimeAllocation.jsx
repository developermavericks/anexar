import React from 'react';
import { 
    Clock, 
    DollarSign, 
    LayoutGrid, 
    ShieldAlert, 
    Download, 
    ArrowRight, 
    Play, 
    Settings, 
    ChevronRight,
    TrendingUp,
    Sparkles
} from 'lucide-react';

export default function TimeAllocation() {
    return (
        <div className="space-y-8 max-w-4xl mx-auto px-4 py-8 font-sans animate-fade-in">
            {/* Embedded animations and special transitions */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes pulse-logo {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.06); opacity: 0.9; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .logo-animate-pulse {
                    animation: pulse-logo 2.5s infinite ease-in-out;
                }
            `}} />

            {/* Premium, High-Detail Glassmorphic Operational Card */}
            <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl transition-all duration-500 hover:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.12)] group">
                
                {/* Visual Accent Glow Backdrops */}
                <div className="absolute -right-24 -top-24 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl transition-all duration-700 group-hover:bg-blue-500/15"></div>
                <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl transition-all duration-700 group-hover:bg-emerald-500/10"></div>

                {/* Header Brand Band with Royal Blue Gradient */}
                <div className="relative bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950 px-8 py-8 md:px-10 text-white border-b border-indigo-955">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.18),transparent_60%)]"></div>
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 logo-animate-pulse">
                                <Clock size={26} strokeWidth={2.5} />
                            </div>
                            <div>
                                <span className="inline-block px-2.5 py-0.5 bg-blue-400/25 border border-blue-400/35 text-white text-[9px] font-extrabold uppercase tracking-[1.5px] rounded-md">
                                    OPERATIONAL WORKFLOW
                                </span>
                                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1">
                                    Clocked | In-Depth Time Allocation
                                </h2>
                            </div>
                        </div>
                        <div className="mt-2 text-[10px] md:text-2xs font-extrabold uppercase tracking-[1.2px] text-blue-200/90 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-white/10 pt-4">
                            <span>Granular Hour Tracking</span>
                            <span className="text-blue-500/50">•</span>
                            <span>Resource-Cost Reconciliation</span>
                            <span className="text-blue-500/50">•</span>
                            <span>Operational Auditing</span>
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
                            <strong className="text-slate-800 dark:text-white font-bold">Clocked</strong> is the organization's dedicated engine for tracking and analyzing resource efforts across all active accounts. By recording exactly how many hours are spent on client deliverables, Business Development (BD), and internal operations, it creates an audit trail that directly connects operational work with financial health.
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
                                    <DollarSign size={18} strokeWidth={2.5} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Triple-Layer Financial Pivot Analyzer
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                        Provides interactive views of monthly operational metrics:
                                        <br /><span className="text-slate-400">•</span> <strong className="text-slate-700 dark:text-slate-300">Hours View:</strong> Absolute time logged per client account.
                                        <br /><span className="text-slate-400">•</span> <strong className="text-slate-700 dark:text-slate-300">Percentage View:</strong> Proportional effort breakdown to identify overall allocation balances.
                                        <br /><span className="text-slate-400">•</span> <strong className="text-slate-700 dark:text-slate-300">Salary cost mapping:</strong> Automatically pro-rates team base salaries based on exit/joining dates and distributes the costs directly to the client accounts based on efforts.
                                    </p>
                                </div>
                            </div>

                            {/* Feature 2 */}
                            <div className="flex items-start gap-4">
                                <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                                    <LayoutGrid size={18} strokeWidth={2.5} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Dynamic Pro-Ration & Budget Tracking
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                        Calculates active working intervals automatically for clients and resources based on joining/exit configurations. This ensures mid-month onboarding or departures do not skew monthly financial reporting and budget benchmarks.
                                    </p>
                                </div>
                            </div>

                            {/* Feature 3 */}
                            <div className="flex items-start gap-4">
                                <div className="h-10 w-10 rounded-full bg-red-50 dark:bg-red-950/40 text-red-650 dark:text-red-400 flex items-center justify-center shrink-0 shadow-inner">
                                    <ShieldAlert size={18} strokeWidth={2.5} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Locked Non-Revenue Configurations
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                        Enforces zero-revenue constraints on internal structures and business development (BD) clients. These entities are marked as non-revenue automatically, preventing accidental financial assignments and ensuring precise client-only revenue tracking.
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
                                        Executive Excel Export Utility
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                        Generates production-grade, highly styled spreadsheets featuring pre-merged vertical headers, auto-adjusted column width parameters, and automatic currency formatting matching the UI layout for direct sharing.
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
                                    Log Efforts
                                </h5>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                    Choose the target client account, enter the total weekly hours logged, and hit Save. The database updates real-time.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
                                <div className="absolute top-4 right-4 text-2xl font-black text-slate-200 dark:text-slate-800 leading-none select-none">
                                    02
                                </div>
                                <h5 className="text-xs font-black uppercase text-slate-900 dark:text-white mb-2 tracking-wider">
                                    Define Verticals
                                </h5>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                    Client accounts are grouped under core leaders (Archana, Mitali, Smriti, Chetan), BD, or Internal categories.
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden">
                                <div className="absolute top-4 right-4 text-2xl font-black text-slate-200 dark:text-slate-800 leading-none select-none">
                                    03
                                </div>
                                <h5 className="text-xs font-black uppercase text-slate-900 dark:text-white mb-2 tracking-wider">
                                    Audit & Reconcile
                                </h5>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                    Managers check the live dashboard to analyze project health, review budget targets, and export reports.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Prompt Box Section */}
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-[1.5rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="space-y-1 text-center sm:text-left">
                            <h5 className="text-sm font-extrabold text-emerald-805 dark:text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5">
                                <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
                                Access Your Time Allocation Desk
                            </h5>
                            <p className="text-xs text-emerald-700/85 dark:text-emerald-400/70 font-semibold leading-relaxed max-w-md">
                                Ensure your weekly client contributions are captured accurately in the central operational ledger.
                            </p>
                        </div>
                        
                        <a 
                            href="https://mavs-tracker.vercel.app/" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35 hover:scale-[1.03] transition-all flex items-center gap-2 cursor-pointer shrink-0"
                        >
                            <span>Go to Clocked</span>
                            <ArrowRight size={13} strokeWidth={2.5} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
