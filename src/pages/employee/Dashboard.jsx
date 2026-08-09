import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { useUser } from '../../context/UserContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { doc, setDoc, getDoc, collection, addDoc, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../lib/firebaseClient';
import { 
    TrendingUp, 
    Newspaper, 
    PieChart, 
    Target, 
    ShieldCheck, 
    Save,
    RefreshCw,
    Sparkles,
    Plus,
    X,
    Users,
    Send
} from 'lucide-react';
import { motion } from 'framer-motion';

const KPI = ({ title, value, trend, icon: Icon, color, showAddButton, onAddClick }) => (
    <div 
        onClick={() => showAddButton && onAddClick()}
        className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex items-center justify-between hover:-translate-y-1 transition-transform cursor-pointer relative group"
    >
        <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{value}</h3>
            <p className={`text-xs mt-2 ${trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-455'}`}>
                {trend} vs last month
            </p>
        </div>
        {showAddButton ? (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onAddClick();
                }}
                className="p-4 rounded-3xl bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer transform hover:scale-105 shrink-0 border border-purple-500/20"
                title="Add Campaign"
            >
                <Plus size={18} className="stroke-[3.5px]" />
                <span className="text-xs font-black uppercase tracking-wider pr-1">Add</span>
            </button>
        ) : (
            <div className={`p-4 rounded-3xl ${color}`}>
                <Icon size={24} className="text-white" />
            </div>
        )}
    </div>
);

export default function Dashboard() {
    const { user } = useAuth();
    const userRole = user?.role?.toLowerCase();
    const isManagerOrCore = userRole === 'core' || userRole === 'manager' || user?.email?.toLowerCase().includes('satyam') || user?.email?.toLowerCase().includes('ss1084169') || user?.email?.toLowerCase().includes('google') || user?.email?.toLowerCase().includes('admin');

    // Dynamic client and onboarding states
    const [assignedClients, setAssignedClients] = useState(() => {
        try {
            const saved = localStorage.getItem('anexar_assigned_clients');
            const parsed = saved ? JSON.parse(saved) : [];
            if (parsed && parsed.length > 0) return parsed;
        } catch (e) {}
        return ['FUJIFILM', 'Google', 'Spotify', 'Plum', 'Nike', 'Udaiti', 'Scapia', 'Musashi-D'];
    });
    const [selectedClient, setSelectedClient] = useState('FUJIFILM');

    useEffect(() => {
        localStorage.setItem('anexar_assigned_clients', JSON.stringify(assignedClients));
    }, [assignedClients]);

    useEffect(() => {
        const fetchClients = async () => {
            if (!user || !user.email) return;

            const emailLower = user.email.toLowerCase();
            const isDeveloperSatyam = emailLower.includes('satyam') || emailLower.includes('ss1084169') || emailLower.includes('test') || user.name?.toLowerCase().includes('satyam');
            const isCoreUser = user.role?.toLowerCase() === 'core' || user.role?.toLowerCase() === 'manager';
            const isChetan = emailLower === 'chetan@themavericksindia.com' || user.name?.toLowerCase().includes('chetan');
            const hasWholeAccess = isChetan || isDeveloperSatyam || isCoreUser;

            const DEFAULT_FALLBACK = ['FUJIFILM', 'Google', 'Spotify', 'Plum', 'Nike', 'Udaiti', 'Scapia', 'Musashi-D'];

            try {
                // 1. Core, Manager, or Developer bypass - fetch all active clients
                if (hasWholeAccess) {
                    try {
                        const { data, error } = await supabase
                            .from('clients')
                            .select('name')
                            .eq('is_active', true)
                            .order('name', { ascending: true });

                        if (!error && data && data.length > 0) {
                            setAssignedClients(data.map(c => c.name));
                            return;
                        }
                    } catch (e) {
                        console.error("Supabase client fetch exception:", e);
                    }
                    setAssignedClients(DEFAULT_FALLBACK);
                    return;
                }

                // 2. Otherwise try loading user clients from Firestore
                const docRef = doc(db, "user_clients", emailLower);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists() && docSnap.data().clients) {
                    const clientNames = docSnap.data().clients;
                    if (clientNames.length > 0) {
                        setAssignedClients(clientNames);
                        return; // Successfully loaded from Firestore!
                    }
                }

                // 3. Fallback to Supabase allocations
                if (user.id) {
                    const [weeklyRes, monthlyRes] = await Promise.all([
                        supabase
                            .from('allocations_weekly')
                            .select('clients(name)')
                            .eq('user_id', user.id),
                        supabase
                            .from('allocations_monthly')
                            .select('clients(name)')
                            .eq('user_id', user.id)
                    ]);

                    const clientNamesSet = new Set();
                    
                    if (weeklyRes.data) {
                        weeklyRes.data.forEach(item => {
                            if (item.clients?.name) clientNamesSet.add(item.clients.name);
                        });
                    }
                    if (monthlyRes.data) {
                        monthlyRes.data.forEach(item => {
                            if (item.clients?.name) clientNamesSet.add(item.clients.name);
                        });
                    }

                    const clientNames = Array.from(clientNamesSet);
                    if (clientNames.length > 0) {
                        setAssignedClients(clientNames);
                        return;
                    }
                }

                setAssignedClients(DEFAULT_FALLBACK);
            } catch (err) {
                console.error("Error fetching user clients:", err);
                setAssignedClients(DEFAULT_FALLBACK);
            }
        };

        fetchClients();
    }, [user, user?.id]);

    useEffect(() => {
        if (assignedClients.length > 0 && !assignedClients.includes(selectedClient)) {
            setSelectedClient(assignedClients[0]);
        }
    }, [assignedClients, selectedClient]);

    // Fetch KPIs for selected client from Firestore
    useEffect(() => {
        const fetchKpis = async () => {
            if (!selectedClient) return;
            try {
                const docRef = doc(db, "kpis", selectedClient);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setKpis(docSnap.data());
                } else {
                    // Reset to defaults if not created yet
                    setKpis({
                        activeCampaigns: '3',
                        pressCoverage: '1.2M',
                        budgetUsed: '65%',
                        goalCompletion: '82%'
                    });
                }
            } catch (err) {
                console.error("Error loading KPIs from Firestore:", err);
            }
        };
        fetchKpis();
    }, [selectedClient]);

    const [campaigns, setCampaigns] = useState([]);

    useEffect(() => {
        const q = query(collection(db, "campaigns"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ docId: docSnap.id, ...docSnap.data() });
            });
            setCampaigns(list);
        }, (err) => {
            console.error("Error listening to campaigns:", err);
        });
        return () => unsubscribe();
    }, []);

    const activeCampaignsCount = campaigns.filter(c => 
        c.client?.toLowerCase() === selectedClient?.toLowerCase() && c.status === 'Active'
    ).length;

    useEffect(() => {
        if (!selectedClient || activeCampaignsCount === undefined) return;
        const syncCampaignCount = async () => {
            try {
                const docRef = doc(db, "kpis", selectedClient);
                const docSnap = await getDoc(docRef);
                const currentData = docSnap.exists() ? docSnap.data() : {
                    activeCampaigns: '0',
                    pressCoverage: '1.2M',
                    budgetUsed: '65%',
                    goalCompletion: '82%'
                };
                if (currentData.activeCampaigns !== activeCampaignsCount.toString()) {
                    await setDoc(docRef, {
                        ...currentData,
                        activeCampaigns: activeCampaignsCount.toString()
                    }, { merge: true });
                    // Also update local state so UI updates immediately
                    setKpis(prev => ({
                        ...prev,
                        activeCampaigns: activeCampaignsCount.toString()
                    }));
                }
            } catch (err) {
                console.error("Error auto-syncing campaign count to Firestore:", err);
            }
        };
        syncCampaignCount();
    }, [selectedClient, activeCampaignsCount]);

    // KPI Values State
    const [kpis, setKpis] = useState({
        activeCampaigns: '3',
        pressCoverage: '1.2M',
        budgetUsed: '65%',
        goalCompletion: '82%'
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Save KPIs to Firestore
    const handleSaveKPIs = async (updatedKpis) => {
        setIsSaving(true);
        try {
            await setDoc(doc(db, "kpis", selectedClient), updatedKpis);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error("Error saving KPIs to Firestore:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = async (field, value) => {
        const nextKpis = { ...kpis, [field]: value };
        setKpis(nextKpis);
        try {
            await setDoc(doc(db, "kpis", selectedClient), nextKpis);
        } catch (err) {
            console.error("Error auto-saving KPI to Firestore:", err);
        }
    };

    // Campaign creation states
    const [newCampName, setNewCampName] = useState('');
    const [newCampClient, setNewCampClient] = useState('');
    const [newCampStatus, setNewCampStatus] = useState('Active');
    const [newCampProgress, setNewCampProgress] = useState(0);
    const [campSuccess, setCampSuccess] = useState(false);
    const [isAddCampaignModalOpen, setIsAddCampaignModalOpen] = useState(false);

    // Operational Brief state hooks
    const [latestBriefText, setLatestBriefText] = useState('');
    const [briefInputText, setBriefInputText] = useState('');
    const [publishingBrief, setPublishingBrief] = useState(false);
    const [briefSuccess, setBriefSuccess] = useState(false);

    useEffect(() => {
        if (!selectedClient) return;
        const q = query(
            collection(db, "client_overall_work"),
            where("client", "==", selectedClient)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            if (list.length > 0) {
                list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setLatestBriefText(list[0].text);
                setBriefInputText(list[0].text);
            } else {
                setLatestBriefText('');
                setBriefInputText('');
            }
        });
        return () => unsubscribe();
    }, [selectedClient]);

    const handlePublishBrief = async (e) => {
        if (e) e.preventDefault();
        if (!briefInputText.trim() || !selectedClient) return;
        setPublishingBrief(true);
        try {
            await addDoc(collection(db, "client_overall_work"), {
                client: selectedClient,
                text: briefInputText.trim(),
                createdAt: new Date().toISOString()
            });
            setBriefSuccess(true);
            setTimeout(() => setBriefSuccess(false), 3000);
        } catch (err) {
            console.error("Error publishing brief:", err);
            alert("Failed to publish brief.");
        } finally {
            setPublishingBrief(false);
        }
    };

    useEffect(() => {
        if (assignedClients.length > 0) {
            setNewCampClient(assignedClients[0]);
        }
    }, [assignedClients]);

    const handleAddCampaign = async (e) => {
        e.preventDefault();
        if (!newCampName.trim() || !newCampClient) return;

        const newCamp = {
            id: Date.now(),
            name: newCampName.trim(),
            client: newCampClient,
            status: newCampStatus,
            progress: newCampProgress,
            createdAt: new Date().toISOString()
        };

        try {
            await addDoc(collection(db, "campaigns"), newCamp);
            setNewCampName('');
            setNewCampProgress(0);
            setCampSuccess(true);
            setTimeout(() => setCampSuccess(false), 3000);
            
            // Increment active campaigns count if added as Active
            if (newCampStatus === 'Active') {
                const updatedCount = (parseInt(kpis.activeCampaigns) || 0) + 1;
                handleInputChange('activeCampaigns', updatedCount.toString());
            }
        } catch (err) {
            console.error("Error adding campaign to Firestore:", err);
            alert("Failed to create campaign program.");
        }
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
                            Monitor deliverables, adjust client metrics, and publish real-time updates.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2.5 bg-emerald-500/10 dark:bg-emerald-500/15 backdrop-blur-sm px-4 py-2.5 rounded-full border border-emerald-500/20 shadow-sm shrink-0">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">
                            Real-Time Sync Active
                        </span>
                    </div>
                </div>
            </div>

            {assignedClients.length === 0 ? (
                <div className="bg-white dark:bg-[#111827] border border-[#EAE8E4] dark:border-white/10 rounded-[2rem] p-8 text-center text-slate-400 dark:text-slate-500 py-16 flex flex-col items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                    <Users className="mb-4 text-slate-350 dark:text-slate-700" size={48} />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-750 dark:text-slate-355">No Allocated Clients</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-555 max-w-md mx-auto mt-2 font-medium">
                        You are not currently allocated to any client workspaces. Please contact an administrator or manager to assign client accounts to your profile.
                    </p>
                </div>
            ) : (
                <>
                    {/* Brand Partner Focus Selector */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-[#EAE8E4] dark:border-white/10 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Brand Partner Focus</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Workspaces you report on or have allocations mapped to in the database</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-650 dark:text-slate-300 uppercase tracking-wider">Focus Client:</span>
                            <select
                                value={selectedClient}
                                onChange={(e) => setSelectedClient(e.target.value)}
                                className="h-10 px-4 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-white cursor-pointer shadow-sm"
                            >
                                {assignedClients.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* KPI Cards consistent with Client Dashboard */}
                    <div className="space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-450 dark:text-slate-555">
                            Live Client-Portal KPI Display
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <KPI 
                                title="Active Campaigns" 
                                value={activeCampaignsCount} 
                                trend="+12%" 
                                icon={TrendingUp} 
                                color="bg-[#1A1A1A] dark:bg-amber-550 text-amber-500 dark:text-amber-400" 
                                showAddButton={isManagerOrCore}
                                onAddClick={() => setIsAddCampaignModalOpen(true)}
                            />
                            <KPI title="Goal Completion" value={kpis.goalCompletion} trend="+8%" icon={Target} color="bg-emerald-500 dark:bg-emerald-500/90 text-emerald-400" />
                        </div>
                    </div>

                    {/* KPI Live Controller Form */}
                    <div className="w-full">
                        {isManagerOrCore ? (
                            <Card className="border-none shadow-md bg-white dark:bg-slate-955 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 space-y-6">
                                <div>
                                    <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <RefreshCw className="text-amber-500" size={18} />
                                        Live KPI Sync (Manager Desk)
                                    </h3>
                                    <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                        Adjust parameters to update the client portal in real time.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-900">
                                    {/* Active Campaigns Input */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Active Campaigns (Count)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={activeCampaignsCount}
                                            disabled
                                            className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 rounded-xl px-4 py-2.5 transition-all font-semibold text-xs cursor-not-allowed"
                                            title="This value is automatically calculated from the campaigns database"
                                        />
                                        <p className="text-[10px] text-slate-400 font-semibold mt-1">Calculated from campaigns collection</p>
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
                                            className="w-full accent-emerald-500 h-1.5 bg-slate-100 dark:bg-slate-850 rounded-lg cursor-pointer"
                                        />
                                    </div>

                                    {/* Press Coverage Input */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Press Coverage (e.g. 1.2M)</label>
                                        <input
                                            type="text"
                                            value={kpis.pressCoverage}
                                            onChange={(e) => handleInputChange('pressCoverage', e.target.value)}
                                            className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium text-xs"
                                        />
                                    </div>

                                    {/* Budget Used Input */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Budget Used (e.g. 65%)</label>
                                        <input
                                            type="text"
                                            value={kpis.budgetUsed}
                                            onChange={(e) => handleInputChange('budgetUsed', e.target.value)}
                                            className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium text-xs"
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
                                            <span className="text-3xs text-slate-500 dark:text-slate-400 font-semibold">Changes are saved automatically in real-time.</span>
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
                        ) : (
                            <Card className="border-none shadow-md bg-white dark:bg-slate-955 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 space-y-6">
                                <div>
                                    <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <ShieldCheck className="text-emerald-500" size={18} />
                                        Client Performance Summary
                                    </h3>
                                    <p className="text-2xs text-slate-555 dark:text-slate-400 mt-1 font-medium">
                                        Overview of target performance and campaign allocations.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-slate-100 dark:border-slate-900">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block mb-1">Active Campaigns</span>
                                        <span className="text-2xl font-black text-slate-850 dark:text-white">{activeCampaignsCount}</span>
                                        <p className="text-[10px] text-slate-400 font-semibold mt-1">Calculated from campaigns collection</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block mb-1">Goal Completion</span>
                                        <span className="text-2xl font-black text-emerald-500">{kpis.goalCompletion}</span>
                                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: kpis.goalCompletion }}></div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block mb-1">Press Coverage</span>
                                        <span className="text-2xl font-black text-purple-500">{kpis.pressCoverage}</span>
                                        <p className="text-[10px] text-slate-400 font-semibold mt-1">Secured press hits volume</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block mb-1">Budget Used</span>
                                        <span className="text-2xl font-black text-rose-500">{kpis.budgetUsed}</span>
                                        <p className="text-[10px] text-slate-400 font-semibold mt-1">Allocated budget spend ratio</p>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Operational Brief Section */}
                    <div className="w-full">
                        {isManagerOrCore ? (
                            <Card className="border-none shadow-md bg-white dark:bg-slate-950 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 space-y-6">
                                <div>
                                    <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Newspaper className="text-purple-500" size={18} />
                                        Latest Operational Brief
                                    </h3>
                                    <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                        Publish brief updates or announcements that will appear at the top of the client's dashboard.
                                    </p>
                                </div>

                                <form onSubmit={handlePublishBrief} className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Brief Text</label>
                                        <textarea
                                            value={briefInputText}
                                            onChange={(e) => setBriefInputText(e.target.value)}
                                            rows="3"
                                            placeholder="e.g. Completed the media outreach for this week. Securing editorial placements in Tier-1 publications..."
                                            className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium text-xs resize-none"
                                        />
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            {briefSuccess ? (
                                                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                                                    <ShieldCheck size={14} /> Published successfully!
                                                </span>
                                            ) : (
                                                <span className="text-3xs text-slate-550 dark:text-slate-450 font-semibold">Will display instantly on the client dashboard homepage.</span>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={publishingBrief || !briefInputText.trim()}
                                            className="bg-purple-650 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-500/10 cursor-pointer disabled:opacity-50 animate-pulse-once"
                                        >
                                            {publishingBrief ? (
                                                <>
                                                    <span className="h-3 w-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                    <span>Publishing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={13} />
                                                    <span>Publish Brief</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </Card>
                        ) : (
                            latestBriefText && (
                                <Card className="border-none shadow-md bg-white dark:bg-slate-955 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 space-y-6">
                                    <div>
                                        <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Newspaper className="text-purple-500" size={18} />
                                            Latest Operational Brief
                                        </h3>
                                        <p className="text-2xs text-slate-550 dark:text-slate-400 mt-1 font-medium">
                                            Latest status notes shared with the client.
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-900">
                                        <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed font-semibold italic pl-4 border-l-2 border-purple-500/40">
                                            "{latestBriefText}"
                                        </p>
                                    </div>
                                </Card>
                            )
                        )}
                    </div>
                </>
            )}

            {/* ADD CAMPAIGN MODAL DIALOG */}
            {isAddCampaignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col p-6 space-y-6 animate-scale-up">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h3 className="text-md font-black text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <Target className="text-purple-500 animate-pulse stroke-[2.5px]" size={18} />
                                    Create Brand Campaign
                                </h3>
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-500 mt-1">
                                    Configure new marketing or PR initiative
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAddCampaignModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={(e) => {
                            handleAddCampaign(e);
                            setIsAddCampaignModalOpen(false);
                        }} className="space-y-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Campaign Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Q3 Social Expansion"
                                    value={newCampName}
                                    onChange={(e) => setNewCampName(e.target.value)}
                                    required
                                    className="h-11 bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl px-4 text-xs font-semibold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Client Brand</label>
                                <select
                                    value={newCampClient}
                                    onChange={(e) => setNewCampClient(e.target.value)}
                                    className="h-11 bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-905 dark:text-white rounded-2xl px-4 text-xs font-semibold focus:outline-none focus:border-purple-500 cursor-pointer focus:ring-2 focus:ring-purple-500/20 outline-none"
                                >
                                    {assignedClients.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Campaign Status</label>
                                <select
                                    value={newCampStatus}
                                    onChange={(e) => setNewCampStatus(e.target.value)}
                                    className="h-11 bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl px-4 text-xs font-semibold focus:outline-none focus:border-purple-500 cursor-pointer focus:ring-2 focus:ring-purple-500/20 outline-none"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Planning">Planning</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5 pb-4">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Progress: {newCampProgress}%</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={newCampProgress}
                                    onChange={(e) => setNewCampProgress(parseInt(e.target.value))}
                                    className="w-full accent-purple-600 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white h-11 rounded-2xl text-xs font-bold transition-all shadow-md shadow-purple-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                <Plus size={14} className="stroke-[2.5px]" />
                                Create Campaign
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
