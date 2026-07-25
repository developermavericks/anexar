import React, { useEffect, useState } from 'react';
import {
    TrendingUp,
    Newspaper,
    PieChart,
    Target,
    Lock
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useUser } from '../../context/UserContext';
import { hasProAccess } from '../../utils/checkAccess';
import { goals, analyticsData } from '../../mock/clientData';
import { doc, onSnapshot, collection, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebaseClient';

const KPI = ({ title, value, trend, icon: Icon, color }) => (
    <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex items-center justify-between hover:-translate-y-1 transition-transform cursor-pointer">
        <div>
            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{value}</h3>
            <p className={`text-xs mt-2 ${trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trend} vs last month
            </p>
        </div>
        <div className={`p-4 rounded-3xl ${color}`}>
            <Icon size={24} className="text-white" />
        </div>
    </div>
);

const Dashboard = () => {
    const { user, setUser } = useUser();
    const isPro = hasProAccess(user);

    const handleUpgrade = () => setUser({ ...user, plan: 'pro' });

    // Sync KPIs from Firestore in real-time (published by Team Portal)
    const [kpis, setKpis] = useState({
        activeCampaigns: '3',
        pressCoverage: '1.2M',
        budgetUsed: '65%',
        goalCompletion: '82%'
    });

    const [campaignsList, setCampaignsList] = useState([]);

    useEffect(() => {
        const q = query(collection(db, "campaigns"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ docId: docSnap.id, ...docSnap.data() });
            });
            setCampaignsList(list);
        }, (err) => {
            console.error("Error loading campaigns for dashboard:", err);
        });
        return () => unsubscribe();
    }, []);

    const clientBrand = user?.clientBrand || 'FUJIFILM';

    useEffect(() => {
        if (!clientBrand) return;

        const unsubscribe = onSnapshot(doc(db, "kpis", clientBrand), (docSnap) => {
            if (docSnap.exists()) {
                setKpis(docSnap.data());
            }
        }, (err) => {
            console.error("Error listening to Firestore KPIs:", err);
        });

        return () => unsubscribe();
    }, [clientBrand]);

    const isDeveloper = user?.email?.toLowerCase().includes('satyam') || user?.email?.toLowerCase().includes('test') || user?.name?.toLowerCase().includes('satyam');
    const clientName = clientBrand;

    const [goalsList, setGoalsList] = useState([]);
    const [latestBrief, setLatestBrief] = useState(null);

    useEffect(() => {
        if (!clientName) return;

        const q = query(
            collection(db, "goals"),
            where("client", "==", clientName)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            // Sort in memory by createdAt descending
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setGoalsList(list);
        }, (err) => {
            console.error("Error listening to goals on dashboard:", err);
        });

        return () => unsubscribe();
    }, [clientName]);

    useEffect(() => {
        if (!clientName) return;

        const q = query(
            collection(db, "client_overall_work"),
            where("client", "==", clientName)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ docId: docSnap.id, ...docSnap.data() });
            });
            if (list.length > 0) {
                list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setLatestBrief(list[0]);
            } else {
                setLatestBrief(null);
            }
        }, (err) => {
            console.error("Error listening to operational brief:", err);
        });

        return () => unsubscribe();
    }, [clientName]);

    const activeFilteredCampaigns = campaignsList.filter(c => {
        if (c.status !== 'Active') return false;
        if (!clientName) return true;
        return (
            c.client?.toLowerCase() === clientName.toLowerCase() ||
            clientName.toLowerCase().includes(c.client?.toLowerCase() || '') ||
            (c.client?.toLowerCase() || '').includes(clientName.toLowerCase())
        );
    });

    const completedGoalsCount = goalsList.filter(g => g.status === 'Completed' || g.progress === 100).length;
    const displayGoalCompletion = goalsList.length > 0
        ? `${Math.round((completedGoalsCount / goalsList.length) * 100)}%`
        : kpis.goalCompletion;

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {user.name}</h1>
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Here's your PR performance overview.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPI title="Active Campaigns" value={activeFilteredCampaigns.length} trend="+12%" icon={TrendingUp} color="bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] text-amber-500 dark:text-amber-400" />
                <KPI title="Press Coverage" value={kpis.pressCoverage} trend="+5%" icon={Newspaper} color="bg-purple-500/20 text-purple-400" />
                <KPI title="Budget Used" value={kpis.budgetUsed} trend="-2%" icon={PieChart} color="bg-rose-500/20 text-rose-450" />
                <KPI title="Goal Completion" value={displayGoalCompletion} trend="+8%" icon={Target} color="bg-emerald-500 dark:bg-emerald-500/90 text-emerald-400" />
            </div>

            {/* Latest Operational Brief card */}
            {latestBrief && (
                <div className="bg-gradient-to-r from-purple-500/5 to-indigo-650/5 dark:from-purple-900/10 dark:to-indigo-950/10 border border-purple-500/20 dark:border-purple-550/30 rounded-3xl p-6 shadow-md animate-fade-in">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="p-1.5 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg text-purple-600 dark:text-purple-400">
                            <Newspaper size={18} />
                        </span>
                        <div>
                            <h3 className="text-xs font-black text-slate-805 dark:text-white uppercase tracking-wider">Latest Operational Brief</h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Updated on {new Date(latestBrief.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed italic pl-10 border-l-2 border-purple-550/40">
                        "{latestBrief.text}"
                    </p>
                </div>
            )}

            {/* Middle Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Campaigns Progress */}
                <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Campaigns</h2>
                    <div className="space-y-6">
                        {activeFilteredCampaigns.map(campaign => (
                            <div key={campaign.id || campaign.docId}>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-900 dark:text-white font-medium">
                                        {campaign.name}
                                        {isDeveloper && (
                                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase ml-2 bg-purple-500/10 px-2 py-0.5 rounded-full">
                                                {campaign.client}
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-amber-500 dark:text-amber-400 font-bold">{campaign.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-[#374151] rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] h-2.5 rounded-full transition-all duration-1000"
                                        style={{ width: `${campaign.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Commitment Tracker */}
                <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Goals & Commitments</h2>
                    <div className="space-y-4">
                        {(goalsList.length > 0 ? goalsList : goals).slice(0, 3).map(goal => (
                            <div key={goal.id || goal.docId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1F2937] rounded-lg">
                                <div className="w-1/2">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={goal.deliverable}>{goal.deliverable}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Status: <span className="text-amber-500 dark:text-amber-400">{goal.status}</span></p>
                                </div>
                                <div className="w-1/3 mr-2">
                                    <div className="w-full bg-slate-650 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-emerald-500 dark:bg-emerald-500/90 h-1.5 rounded-full transition-all duration-1000"
                                            style={{ width: `${goal.progress || 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white">
                                    {goal.achieved}/{goal.target}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Premium Analytics Section commented out
            <div className="bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] p-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                        <span className="bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent">Reputation Intelligence</span>
                    </h2>
                    {isPro && (
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Pro Feature Enabled
                        </span>
                    )}
                </div>

                {!isPro ? (
                    <div className="relative h-[300px] flex items-center justify-center">
                        <div className="absolute inset-0 filter blur-sm opacity-50 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48L3N2Zz4=')] bg-cover">
                            <div className="w-full h-full bg-white dark:bg-[#111827]"></div>
                        </div>

                        <div className="relative z-10 text-center bg-[#2A2A2A]/90 p-8 rounded-2xl border border-[#444] max-w-md mx-auto shadow-2xl backdrop-blur-md">
                            <div className="w-16 h-16 bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#444]">
                                <Lock size={32} className="text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Unlock Reputation Intelligence</h3>
                            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">
                                Upgrade to Pro to access real-time sentiment analysis, media volume tracking, and competitive benchmarking.
                            </p>
                            <button
                                onClick={handleUpgrade}
                                className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 dark:text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-[0_10px_30px_rgba(0,0,0,0.1)]"
                            >
                                Upgrade to Pro
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[300px]">
                        <div className="h-full flex flex-col">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-4">Brand Sentiment Trending</h3>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={analyticsData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#2A2A2A', borderColor: '#444', borderRadius: '0.5rem', color: '#fff' }}
                                            itemStyle={{ color: '#FBBF24' }}
                                        />
                                        <Line type="monotone" dataKey="sentimentScore" stroke="#FBBF24" strokeWidth={3} dot={{ r: 4, fill: '#2A2A2A', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="h-full flex flex-col">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-4">Media Share of Voice</h3>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analyticsData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            cursor={{ fill: '#333', opacity: 0.4 }}
                                            contentStyle={{ backgroundColor: '#2A2A2A', borderColor: '#444', borderRadius: '0.5rem', color: '#fff' }}
                                        />
                                        <Bar dataKey="mediaVolume" fill="#FBBF24" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            */}
        </div>
    );
};

export default Dashboard;
