import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
    Clock, 
    ExternalLink, 
    Sparkles, 
    Globe,
    BookOpen,
    ShieldAlert
} from 'lucide-react';

export default function TimeAllocation() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('live'); // 'live' or 'docs'
    const [iframeLoading, setIframeLoading] = useState(true);
    const iframeRef = useRef(null);

    const baseUrl = "https://mavs-tracker.vercel.app";
    const userEmail = user?.email || '';
    const idToken = user?.idToken || '';

    // JWT Expiration Validator
    const isTokenExpired = (token) => {
        if (!token) return true;
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return true;
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            const currentTime = Math.floor(Date.now() / 1000);
            return payload.exp < currentTime;
        } catch (e) {
            return true;
        }
    };

    const expired = isTokenExpired(idToken);

    // Secure HTML5 postMessage SSO handler when iframe finishes loading
    const handleIframeLoad = () => {
        setIframeLoading(false);
        
        if (idToken && !expired && iframeRef.current) {
            console.log("Iframe loaded. Starting secure SSO transmission...");
            
            const sendSsoToken = () => {
                if (iframeRef.current && iframeRef.current.contentWindow) {
                    console.log("Sending CLOCKED_SSO_LOGIN token via postMessage...");
                    iframeRef.current.contentWindow.postMessage(
                        {
                            type: 'CLOCKED_SSO_LOGIN',
                            idToken: idToken,
                            userEmail: userEmail
                        },
                        baseUrl // Restrict the message destination strictly to Clocked's domain
                    );
                }
            };

            // Send immediately on load
            sendSsoToken();

            // Send repeatedly over the next 3 seconds to guarantee it is received
            // after the child React app mounts and binds its message listener.
            const retryDelays = [300, 800, 1500, 3000];
            retryDelays.forEach(delay => {
                setTimeout(sendSsoToken, delay);
            });
        }
    };

    return (
        <div className="space-y-6 w-full font-sans animate-fade-in">
            {/* Scoped animations */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes clock-pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.06); opacity: 0.9; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .clock-pulse-icon {
                    animation: clock-pulse 3s infinite ease-in-out;
                }
            `}} />

            {/* Header Dashboard Banner */}
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-955 shadow-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="absolute -right-24 -top-24 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex items-center gap-4 relative z-10">
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-500 dark:text-blue-400 clock-pulse-icon shrink-0">
                        <Clock size={26} strokeWidth={2.5} />
                    </div>
                    <div>
                        <span className="inline-block px-2.5 py-0.5 bg-blue-500/10 border border-blue-400/30 text-blue-500 dark:text-blue-350 text-[9px] font-extrabold uppercase tracking-[1.5px] rounded-md">
                            OPERATIONAL WORKFLOW
                        </span>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 dark:text-white mt-0.5">
                            Clocked | Time Allocation Desk
                        </h2>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-3 relative z-10 shrink-0">
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800">
                        <button
                            onClick={() => setActiveTab('live')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                                activeTab === 'live'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <Globe size={12} />
                            Live Logger
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
                <div className="relative rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-955 shadow-2xl overflow-hidden transition-all duration-300">
                    {/* URL Status Bar */}
                    <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-150 dark:border-slate-850 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                SSO Channel Active: <span className="text-blue-600 dark:text-blue-400 font-semibold">{userEmail}</span>
                            </span>
                        </div>
                        <a 
                            href={baseUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-slate-400 dark:text-slate-500 font-bold hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 hover:underline"
                        >
                            Open Standalone App <ExternalLink size={10} />
                        </a>
                    </div>

                    {/* Check if Google SSO token is expired */}
                    {expired ? (
                        <div className="flex flex-col items-center justify-center min-h-[550px] p-8 md:p-12 text-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse"></div>
                                <div className="relative h-20 w-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-xl shadow-amber-500/20">
                                    <ShieldAlert size={36} className="animate-pulse" />
                                </div>
                            </div>

                            <span className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-full mb-3">
                                Google Authentication Expired
                            </span>
                            
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight max-w-md">
                                Re-Authorization Required
                            </h3>
                            
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-3 max-w-lg leading-relaxed">
                                Google restricts authentication tokens to 1 hour. Because Google prevents sign-in screens from loading inside frames (causing the 403 error), please launch the standalone app to sign in, or refresh your Anexar session.
                            </p>

                            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                                <a
                                    href={baseUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>Open Standalone App</span>
                                    <ExternalLink size={14} strokeWidth={2.5} />
                                </a>

                                <a
                                    href={`/login?return_to=${encodeURIComponent(window.location.pathname)}`}
                                    className="w-full sm:w-auto px-6 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-350 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer text-center"
                                >
                                    Re-Login to Anexar
                                </a>
                            </div>
                        </div>
                    ) : (
                        /* IFrame with loading spinner */
                        <div className="relative w-full h-[950px] bg-slate-50 dark:bg-[#0B0F19]">
                            {iframeLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-slate-955 z-20">
                                    <div className="w-10 h-10 border-4 border-blue-550/20 border-t-blue-600 rounded-full animate-spin"></div>
                                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-4 animate-pulse">
                                        Loading Clocked Interface&hellip;
                                    </p>
                                </div>
                            )}
                            <iframe
                                ref={iframeRef}
                                src={baseUrl}
                                title="Clocked Time Allocation App"
                                onLoad={handleIframeLoad}
                                className="w-full h-full border-0"
                            />
                        </div>
                    )}
                </div>
            ) : (
                /* System Documentation Tab */
                <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-955 shadow-2xl p-8 md:p-10 space-y-10">
                    {/* Visual Background Accent Glow */}
                    <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

                    {/* Operational Overview Section */}
                    <div className="space-y-4 relative z-10">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-550"></span>
                            Operational Overview
                        </h3>
                        <p className="text-sm md:text-base text-slate-660 dark:text-slate-350 leading-relaxed font-semibold">
                            <strong className="text-slate-800 dark:text-white font-bold">Clocked</strong> is an enterprise-grade, high-performance time-tracking and productivity analytics platform designed for teams to easily log hours, fetch Google Calendar meetings in real-time, and analyze resource allocations across projects and clients. By recording exactly how many hours are spent on client deliverables, Business Development (BD), and internal operations, it creates a secure audit trail that directly connects operational effort with corporate financial health.
                        </p>
                    </div>

                    {/* Authentication & Integration Flow */}
                    <div className="space-y-4 relative z-10">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-550"></span>
                            SSO & IFrame Integration
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 space-y-2.5">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                    Parent-Child SSO Channel
                                </h4>
                                <p className="text-xs text-slate-550 dark:text-slate-450 leading-relaxed font-medium">
                                    Google blocks authentication screens from loading inside nested frames (`X-Frame-Options: DENY`). To bypass this, Anexar securely transmits the authenticated Google OAuth ID token into the Clocked iframe using a staggered HTML5 `postMessage` protocol (transmitting at 0.3s, 0.8s, 1.5s, and 3.0s delays).
                                </p>
                            </div>

                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 space-y-2.5">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                    Domain Origin Locks
                                </h4>
                                <p className="text-xs text-slate-550 dark:text-slate-450 leading-relaxed font-medium">
                                    For absolute security, the receiver script inside the Clocked app enforces origin checking, accepting tokens exclusively from the production host `https://anexar-9820c.web.app`. Local token transfers on development environments are rejected to protect directory security.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 4-Tier Access Matrix */}
                    <div className="space-y-4 relative z-10">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-550"></span>
                            Access Control Levels
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                                <thead>
                                    <tr className="text-left text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                                        <th className="pb-3 pr-4">Access Level</th>
                                        <th className="pb-3 px-4">Enforcement Details</th>
                                        <th className="pb-3 pl-4 text-right">Available Portals</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-900 text-slate-700 dark:text-slate-350">
                                    <tr>
                                        <td className="py-3.5 pr-4 font-bold text-blue-600 dark:text-blue-450">Tier 1: Super Admin</td>
                                        <td className="py-3.5 px-4 font-medium text-slate-550 dark:text-slate-450">Hardcoded email array override inside `Sidebar.tsx` config rules.</td>
                                        <td className="py-3.5 pl-4 text-right font-black">4 Portals (All)</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3.5 pr-4 font-bold text-slate-800 dark:text-slate-250">Tier 2: Core Admin</td>
                                        <td className="py-3.5 px-4 font-medium text-slate-550 dark:text-slate-450">Supabase user database checks matching role identifier `'core'`.</td>
                                        <td className="py-3.5 pl-4 text-right font-black">3 Portals</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3.5 pr-4 font-bold text-slate-850 dark:text-slate-300">Tier 3: Manager</td>
                                        <td className="py-3.5 px-4 font-medium text-slate-550 dark:text-slate-450">Dynamic relation mappings defined directly inside `teams` table.</td>
                                        <td className="py-3.5 pl-4 text-right font-black">2 Portals</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3.5 pr-4 font-bold text-slate-500 dark:text-slate-500">Tier 4: Standard User</td>
                                        <td className="py-3.5 px-4 font-medium text-slate-550 dark:text-slate-450">Restricted by default to personal time allocation entries.</td>
                                        <td className="py-3.5 pl-4 text-right font-black">1 Portal</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Calendar Sync Pipeline */}
                    <div className="space-y-4 relative z-10">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-550"></span>
                            Google Calendar Sync Engine
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 text-center space-y-1.5">
                                <span className="block text-[10px] font-black uppercase text-blue-600 dark:text-blue-450 tracking-wider">
                                    Timezone Sync
                                </span>
                                <p className="text-xs text-slate-550 dark:text-slate-450 leading-relaxed font-medium">
                                    Dates are automatically resolved and normalized matching India Standard Time (IST).
                                </p>
                            </div>
                            
                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 text-center space-y-1.5">
                                <span className="block text-[10px] font-black uppercase text-blue-600 dark:text-blue-450 tracking-wider">
                                    Decimal Conversion
                                </span>
                                <p className="text-xs text-slate-550 dark:text-slate-450 leading-relaxed font-medium">
                                    Calculates calendar event durations into decimal hours (e.g., 45-minute meetings parse as `0.75`).
                                </p>
                            </div>

                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 text-center space-y-1.5">
                                <span className="block text-[10px] font-black uppercase text-blue-600 dark:text-blue-450 tracking-wider">
                                    Auto-Deduplication
                                </span>
                                <p className="text-xs text-slate-550 dark:text-slate-450 leading-relaxed font-medium">
                                    Aggregates duplicate event invitations on the same day by title to avoid UI log clutter.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Operations & Work Detailing */}
                    <div className="space-y-4 relative z-10">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-550"></span>
                            Operations & Work Workflows
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 space-y-3">
                                <span className="block text-[10px] font-black uppercase text-blue-600 dark:text-blue-450 tracking-wider">
                                    1. Super Admins
                                </span>
                                <ul className="list-disc pl-4 text-xs text-slate-550 dark:text-slate-450 space-y-2 font-medium">
                                    <li><strong>Roster Setup:</strong> Configure team member profiles, set up direct manager hierarchies, and manage database roles.</li>
                                    <li><strong>Client Management:</strong> Add new client records and toggle active status as accounts onboard or offboard.</li>
                                    <li><strong>Target Projections:</strong> Update monthly projection targets directly inside the console to align allocations with budgets.</li>
                                </ul>
                            </div>

                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 space-y-3">
                                <span className="block text-[10px] font-black uppercase text-blue-600 dark:text-blue-450 tracking-wider">
                                    2. Managers
                                </span>
                                <ul className="list-disc pl-4 text-xs text-slate-550 dark:text-slate-450 space-y-2 font-medium">
                                    <li><strong>Roster Insights:</strong> Access a consolidated list of team members mapped directly to your reporting line.</li>
                                    <li><strong>Time Auditing:</strong> Review weekly actual logs and monthly projections to track team effort outputs.</li>
                                    <li><strong>Sheet Verification:</strong> Audits active vs. inactive resources to verify that all work hours are submitted.</li>
                                </ul>
                            </div>

                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 space-y-3">
                                <span className="block text-[10px] font-black uppercase text-blue-600 dark:text-blue-450 tracking-wider">
                                    3. Team Resources
                                </span>
                                <ul className="list-disc pl-4 text-xs text-slate-550 dark:text-slate-450 space-y-2 font-medium">
                                    <li><strong>Effort Logging:</strong> Enter hours worked directly against clients, BD initiatives, or operational tasks.</li>
                                    <li><strong>Calendar Import:</strong> Hook into Google Calendar to auto-group and parse daily meetings into decimal hours.</li>
                                    <li><strong>Detailed Notes:</strong> Log tasks performed per client allocation to create an auditable work history.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
