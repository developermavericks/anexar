import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/Card';
import {
    Briefcase,
    CheckSquare,
    Clock,
    Users,
    Plus,
    Trash2,
    CheckCircle2,
    Activity,
    ShieldAlert,
    Radio,
    UserPlus,
    MessageSquare,
    Sparkles,
    Send
} from 'lucide-react';

export default function Dashboard() {
    const { user } = useAuth();

    // ----------------------------------------------------
    // SIMPLE & INTUITIVE STATES
    // ----------------------------------------------------
    
    // Clients state
    const [assignedClients, setAssignedClients] = useState(() => {
        const saved = localStorage.getItem('anexar_assigned_clients');
        return saved ? JSON.parse(saved) : ['RedBull Racing', 'Spotify', 'Vercel', 'Acura Corporate', 'Nike'];
    });

    // Client Updates Feed State
    const [clientUpdates, setClientUpdates] = useState(() => {
        const saved = localStorage.getItem('anexar_client_updates');
        return saved ? JSON.parse(saved) : [
            { id: 1, client: 'RedBull Racing', update: 'Media briefing prepared for Monaco Grand Prix.', time: '1h ago' },
            { id: 2, client: 'Spotify', update: 'CEO editorial draft submitted to Wired magazine.', time: '3h ago' },
            { id: 3, client: 'Acura Corporate', update: 'Social sentiment dipped by 4.2% following minor recall note.', time: '5h ago' },
            { id: 4, client: 'Vercel', update: 'Vite integration pitch deck signed off.', time: 'Yesterday' }
        ];
    });

    // Crisis Predictor status
    const [simulatedCrisis, setSimulatedCrisis] = useState(false);
    
    // Form Onboarding Input
    const [newClientName, setNewClientName] = useState('');

    // Save states to local cache
    useEffect(() => {
        localStorage.setItem('anexar_assigned_clients', JSON.stringify(assignedClients));
    }, [assignedClients]);

    useEffect(() => {
        localStorage.setItem('anexar_client_updates', JSON.stringify(clientUpdates));
    }, [clientUpdates]);

    // ----------------------------------------------------
    // HANDLERS
    // ----------------------------------------------------
    const handleAddClient = (e) => {
        e.preventDefault();
        if (!newClientName.trim()) return;
        
        const cleanName = newClientName.trim();
        if (assignedClients.includes(cleanName)) return;

        setAssignedClients([...assignedClients, cleanName]);
        
        // Add default updates entry
        const newUpdate = {
            id: Date.now(),
            client: cleanName,
            update: 'Brand partner onboarded to Anexar campaign workspace.',
            time: 'Just now'
        };
        setClientUpdates([newUpdate, ...clientUpdates]);
        setNewClientName('');
    };

    const handleRemoveClient = (clientName) => {
        setAssignedClients(assignedClients.filter(c => c !== clientName));
        setClientUpdates(clientUpdates.filter(u => u.client !== clientName));
    };

    const teamMembers = [
        { name: 'Marcus Sterling', role: 'Head of Brand Strategy', status: 'Active', avatar: 'MS' },
        { name: 'Clara Oswald', role: 'Chief Media Liaison', status: 'In Meeting', avatar: 'CO' },
        { name: 'Arjun Mehta', role: 'Crisis Response Lead', status: 'Active', avatar: 'AM' }
    ];

    return (
        <div className="space-y-8 max-w-5xl mx-auto font-sans pb-8">
            {/* Dynamic Welcome Heading Banner */}
            <div className="bg-gradient-to-r from-brand-charcoal to-brand-gray text-white rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-lg">
                <div className="absolute right-[-2%] top-[-20%] opacity-10 pointer-events-none transform rotate-12">
                    <Briefcase size={200} />
                </div>
                <div className="absolute right-[15%] bottom-[-40%] w-48 h-48 bg-brand-amber/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 max-w-xl">
                    <span className="px-3 py-1 bg-brand-amber text-brand-charcoal rounded-full text-4xs font-extrabold uppercase tracking-widest inline-flex items-center gap-1 shadow-sm">
                        <Sparkles size={10} className="fill-brand-charcoal" />
                        Anexar Strategist Panel
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold mt-4 leading-tight">
                        Hi, <span className="text-brand-amber">{user?.name || 'Strategist'}</span>! 👋
                    </h2>
                    <p className="text-white/80 mt-2 text-xs md:text-sm leading-relaxed">
                        Welcome to your unified strategist dashboard. Manage campaign portfolios, respond to sentiment risks, and sync with co-strategists.
                    </p>
                </div>
            </div>

            {/* MAIN MINIMALIST WORKSPACE GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* COLUMN 1: CLIENT MANAGEMENT & ACTIVITY */}
                <div className="space-y-8">
                    {/* Onboard & Active Clients Card */}
                    <Card className="border-none shadow-soft bg-white dark:bg-slate-900">
                        <CardContent className="p-6 space-y-6">
                            <div className="border-b border-brand-border/20 pb-3 flex items-center justify-between">
                                <h3 className="font-extrabold text-sm text-brand-charcoal dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <Users size={16} className="text-brand-amber" />
                                    Portfolio Partners
                                </h3>
                                <span className="text-4xs font-extrabold px-2 py-0.5 bg-brand-amber/15 text-brand-amber rounded-full">
                                    {assignedClients.length} Assigned
                                </span>
                            </div>

                            {/* Active Clients List */}
                            <div className="flex flex-wrap gap-2">
                                {assignedClients.map((client) => (
                                    <span 
                                        key={client} 
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FDFBF7] dark:bg-slate-800 border border-brand-border/40 dark:border-slate-700 rounded-full text-xs font-semibold text-brand-charcoal dark:text-white"
                                    >
                                        {client}
                                        <button 
                                            onClick={() => handleRemoveClient(client)}
                                            className="text-brand-gray hover:text-red-500 transition-colors"
                                            title={`Remove ${client}`}
                                        >
                                            <Trash2 size={11} />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            {/* Onboard New Client Form */}
                            <form onSubmit={handleAddClient} className="pt-4 border-t border-brand-border/10 space-y-2.5">
                                <label className="text-3xs font-extrabold uppercase tracking-wider text-brand-gray dark:text-gray-400 block">
                                    Onboard Brand Partner
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter brand partner name..."
                                        value={newClientName}
                                        onChange={(e) => setNewClientName(e.target.value)}
                                        required
                                        className="flex-1 h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:text-white"
                                    />
                                    <button
                                        type="submit"
                                        className="h-10 px-4 bg-brand-charcoal hover:bg-black text-white rounded-xl font-bold flex items-center justify-center transition-all cursor-pointer text-xs gap-1.5 shadow-sm"
                                    >
                                        <Plus size={14} />
                                        <span>Onboard</span>
                                    </button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Client Activity Updates Feed */}
                    <Card className="border-none shadow-soft bg-white dark:bg-slate-900">
                        <CardContent className="p-6 space-y-4">
                            <div className="border-b border-brand-border/20 pb-3">
                                <h3 className="font-extrabold text-sm text-brand-charcoal dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <Activity size={16} className="text-brand-amber" />
                                    Client Activity Feed
                                </h3>
                            </div>

                            <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                                {clientUpdates.length === 0 ? (
                                    <p className="text-xs text-brand-gray py-4 text-center">No recent activity updates recorded.</p>
                                ) : (
                                    clientUpdates.map((update) => (
                                        <div key={update.id} className="flex gap-3 items-start border-b border-brand-border/10 pb-3 last:border-b-0 last:pb-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-amber mt-1.5 shrink-0 animate-pulse" />
                                            <div className="flex-1">
                                                <p className="text-xs text-brand-charcoal dark:text-white font-semibold leading-relaxed">
                                                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{update.client}</span>: {update.update}
                                                </p>
                                                <span className="text-4xs text-brand-gray mt-0.5 block font-medium">{update.time}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* COLUMN 2: CRISIS SENTINEL & SYNERGY TEAM */}
                <div className="space-y-8">
                    
                    {/* Crisis Predictor Panel */}
                    <Card className="border-none shadow-soft bg-white dark:bg-slate-900 relative overflow-hidden flex flex-col justify-between">
                        <CardContent className="p-6 flex flex-col justify-between h-full space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-border/20">
                                    <h3 className="font-extrabold text-sm text-brand-charcoal dark:text-white uppercase tracking-wider flex items-center gap-2">
                                        <ShieldAlert className={`${simulatedCrisis ? 'text-rose-600 animate-bounce' : 'text-emerald-500'}`} size={18} />
                                        Crisis Sentinel
                                    </h3>
                                    <span className={`text-4xs font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                        simulatedCrisis ? 'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    }`}>
                                        {simulatedCrisis ? 'Active Threat' : 'Stable & Safe'}
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {simulatedCrisis ? (
                                        <div className="p-4 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 rounded-2xl space-y-3">
                                            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                                                <Radio size={14} className="animate-ping shrink-0" />
                                                <span className="text-2xs font-extrabold uppercase tracking-wide">Anomaly Detected — Spotify</span>
                                            </div>
                                            <p className="text-xs text-rose-700 dark:text-rose-300 font-semibold leading-relaxed">
                                                Social sentiment index dropped 18% due to licensing debate mentions. Immediate statement recommended.
                                            </p>
                                            <div className="pt-1">
                                                <a 
                                                    href="mailto:crisis-team@anexar.com?subject=Emergency response: Spotify media dip" 
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-3xs transition-all shadow-sm"
                                                >
                                                    <span>Call Strategy Lead</span>
                                                    <Send size={10} />
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900 rounded-2xl space-y-2">
                                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 size={14} />
                                                <span className="text-2xs font-extrabold uppercase tracking-wide">All Brand Mentions Clear</span>
                                            </div>
                                            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold leading-relaxed">
                                                PR streams and public sentiment indexes are safe and positive (+4.2% average). No threat detected.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Crisis Simulator Toggle Button */}
                            <div className="pt-4 border-t border-brand-border/10 flex items-center justify-between">
                                <span className="text-3xs font-extrabold uppercase tracking-wider text-brand-gray dark:text-gray-400">Simulation Mode</span>
                                <button
                                    onClick={() => setSimulatedCrisis(!simulatedCrisis)}
                                    className={`px-3 py-2 rounded-xl text-3xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm ${
                                        simulatedCrisis 
                                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/10' 
                                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/10'
                                    }`}
                                >
                                    {simulatedCrisis ? 'Resolve simulator' : 'Simulate Crisis'}
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Synergy Team Panel */}
                    <Card className="border-none shadow-soft bg-white dark:bg-slate-900">
                        <CardContent className="p-6 space-y-6">
                            <div className="border-b border-brand-border/20 pb-3 flex items-center justify-between">
                                <h3 className="font-extrabold text-sm text-brand-charcoal dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <Users size={16} className="text-brand-amber" />
                                    Synergy Team
                                </h3>
                                <span className="text-4xs font-extrabold px-2 py-0.5 bg-brand-amber/15 text-brand-amber rounded-full">
                                    Live sync
                                </span>
                            </div>

                            <div className="space-y-4">
                                {teamMembers.map((member) => (
                                    <div key={member.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-charcoal to-brand-amber flex items-center justify-center text-white font-bold text-3xs shadow-sm">
                                                {member.avatar}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-brand-charcoal dark:text-white">{member.name}</h4>
                                                <p className="text-4xs text-brand-gray">{member.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                member.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                                            }`} />
                                            <span className="text-4xs font-extrabold uppercase tracking-wide text-brand-gray">{member.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Sync Slack link */}
                            <div className="pt-4 border-t border-brand-border/10">
                                <a
                                    href="https://slack.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-xl text-brand-charcoal dark:text-white font-bold border border-brand-border/30 hover:bg-brand-border/10 transition-all text-xs"
                                >
                                    <MessageSquare size={13} />
                                    <span>Sync on Strategy Channel</span>
                                </a>
                            </div>
                        </CardContent>
                    </Card>

                </div>

            </div>
        </div>
    );
}
