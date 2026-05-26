import React, { useState } from 'react';
import { pressReleases as defaultPress } from '../../mock/clientData';
import { Search, Filter, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const PressTracker = () => {
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [pressList] = useState(() => {
        const saved = localStorage.getItem('anexar_press_releases');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error(e); }
        }
        return defaultPress;
    });

    const filteredPress = pressList.filter(pr => {
        const matchesFilter = filter === 'All' || pr.sentiment === filter;
        const matchesSearch = pr.title.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getSentimentIcon = (sentiment) => {
        switch (sentiment) {
            case 'Positive': return <TrendingUp size={16} className="text-emerald-400" />;
            case 'Negative': return <TrendingDown size={16} className="text-rose-400" />;
            default: return <Minus size={16} className="text-gray-500 dark:text-gray-400 dark:text-gray-400" />;
        }
    };

    const getSentimentColor = (sentiment) => {
        switch (sentiment) {
            case 'Positive': return 'bg-emerald-500 dark:bg-emerald-500/90 text-emerald-400 border-emerald-500/20';
            case 'Negative': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default: return 'bg-gray-50 dark:bg-[#1F2937] text-gray-700 dark:text-gray-300 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Press Release Tracker</h1>
                    <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Monitor your distributed releases and media pickups.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 dark:text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search press releases..."
                            className="w-full sm:w-64 bg-white dark:bg-[#111827] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-amber-500 transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-white dark:bg-[#111827] rounded-lg p-1 border border-[#EAE8E4] dark:border-white/10">
                        {['All', 'Positive', 'Neutral', 'Negative'].map(option => (
                            <button
                                key={option}
                                onClick={() => setFilter(option)}
                                className={`flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === option
                                    ? 'bg-gray-100 dark:bg-[#374151] text-amber-500 dark:text-amber-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:text-gray-200'
                                    }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#111827] rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#FDFBF7] dark:bg-[#0B0F19] border-b border-[#EAE8E4] dark:border-white/10">
                                <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500">Press Title</th>
                                <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500">Date Sent</th>
                                <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500">Media Pickups</th>
                                <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500">Est. Reach</th>
                                <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500">Sentiment</th>
                                <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EAE8E4]">
                            {filteredPress.length > 0 ? (
                                filteredPress.map((pr) => (
                                    <tr key={pr.id} className="hover:bg-gray-50 dark:hover:bg-[#1F2937] dark:bg-[#1F2937]:bg-slate-700 transition-colors">
                                        <td className="p-4">
                                            <p className="font-medium text-gray-900 dark:text-white">{pr.title}</p>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                                            {new Date(pr.dateSent).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="p-4">
                                            <span className="font-semibold text-gray-900 dark:text-white">{pr.pressPickups}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-gray-700 dark:text-gray-300">{pr.estimatedReach}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${getSentimentColor(pr.sentiment)}`}>
                                                {getSentimentIcon(pr.sentiment)}
                                                {pr.sentiment}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-block px-2.5 py-1 bg-gray-100 dark:bg-[#374151] text-gray-700 dark:text-gray-300 text-xs font-medium rounded border border-gray-200">
                                                {pr.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500">
                                        No press releases found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PressTracker;
