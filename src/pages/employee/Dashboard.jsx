import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { useUser } from '../../context/UserContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { doc, setDoc, getDoc, collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
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
    Users
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
        const saved = localStorage.getItem('anexar_assigned_clients');
        return saved ? JSON.parse(saved) : ['FUJIFILM', 'Google', 'Spotify', 'Plum', 'Nike', 'Udaiti', 'Scapia', 'Musashi-D'];
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
            const isChetan = emailLower === 'chetan@themavericksindia.com' || user.name?.toLowerCase().includes('chetan');
            const hasWholeAccess = isChetan || isDeveloperSatyam;

            try {
                // 1. Core, Manager, or Satyam (Developer) bypass - fetch all active clients
                if (hasWholeAccess) {
                    const { data, error } = await supabase
                        .from('clients')
                        .select('name')
                        .eq('is_active', true)
                        .order('name', { ascending: true });

                    if (error) throw error;
                    if (data && data.length > 0) {
                        setAssignedClients(data.map(c => c.name));
                        return;
                    }
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

                setAssignedClients([]); // Empty list if no allocations mapped
            } catch (err) {
                console.error("Error fetching user clients:", err);
                setAssignedClients([]);
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
                            Here is the Mavericks organization console. Monitor campaign deliverables, adjust client-facing metrics, and publish updates in real-time.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-purple-600 p-0.5">
                            <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center font-bold text-sm">
                                {user.avatar ? <img src={user.avatar} alt="avatar" referrerPolicy="no-referrer" className="w-full h-full rounded-full object-cover" /> : user.name.charAt(0)}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{user.name}</p>
                        </div>
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
                        <Card className="border-none shadow-md bg-white dark:bg-slate-950 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 space-y-6">
                            <div>
                                <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <RefreshCw className="text-amber-500" size={18} />
                                    Interactive Card Synchronization
                                </h3>
                                <p className="text-2xs text-slate-450 dark:text-slate-555 mt-1 font-medium">
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
                                        <span className="text-3xs text-slate-450 font-semibold">Changes are saved automatically in real-time.</span>
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
