import React from 'react';
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
import { campaigns, goals, analyticsData } from '../../mock/clientData';

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

    // Sync KPIs from localStorage (published by Team Portal)
    const [kpis, setKpis] = React.useState({
        activeCampaigns: '3',
        pressCoverage: '1.2M',
        budgetUsed: '65%',
        goalCompletion: '82%'
    });

    React.useEffect(() => {
        const loadKpis = () => {
            const saved = localStorage.getItem('anexar_client_kpis');
            if (saved) {
                try {
                    setKpis(JSON.parse(saved));
                } catch (e) {
                    console.error(e);
                }
            }
        };
        loadKpis();
        const interval = setInterval(loadKpis, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {user.name}</h1>
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Here's your PR performance overview.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPI title="Active Campaigns" value={kpis.activeCampaigns} trend="+12%" icon={TrendingUp} color="bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] text-amber-500 dark:text-amber-400" />
                <KPI title="Press Coverage" value={kpis.pressCoverage} trend="+5%" icon={Newspaper} color="bg-purple-500/20 text-purple-400" />
                <KPI title="Budget Used" value={kpis.budgetUsed} trend="-2%" icon={PieChart} color="bg-rose-500/20 text-rose-450" />
                <KPI title="Goal Completion" value={kpis.goalCompletion} trend="+8%" icon={Target} color="bg-emerald-500 dark:bg-emerald-500/90 text-emerald-400" />
            </div>

            {/* Middle Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Campaigns Progress */}
                <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Campaigns</h2>
                    <div className="space-y-6">
                        {campaigns.filter(c => c.status === 'Active').map(campaign => (
                            <div key={campaign.id}>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-900 dark:text-white font-medium">{campaign.name}</span>
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
                        {goals.slice(0, 3).map(goal => (
                            <div key={goal.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1F2937] rounded-lg">
                                <div className="w-1/2">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={goal.deliverable}>{goal.deliverable}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">Status: <span className="text-amber-500 dark:text-amber-400">{goal.status}</span></p>
                                </div>
                                <div className="w-1/3 mr-2">
                                    <div className="w-full bg-slate-600 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-emerald-500 dark:bg-emerald-500/90 h-1.5 rounded-full transition-all duration-1000"
                                            style={{ width: `${goal.progress}%` }}
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

            {/* Premium Analytics Section */}
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
                        {/* Blurred Mock Chart Background */}
                        <div className="absolute inset-0 filter blur-sm opacity-50 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48L3N2Zz4=')] bg-cover">
                            <div className="w-full h-full bg-white dark:bg-[#111827]"></div>
                        </div>

                        {/* Upsell Content */}
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
                        {/* Sentiment Tracking */}
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

                        {/* Media Volume */}
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
        </div>
    );
};

export default Dashboard;
