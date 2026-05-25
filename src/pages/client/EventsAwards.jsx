import React, { useState } from 'react';
import { events } from '../../mock/clientData';
import { CalendarDays, Trophy, MapPin, Clock } from 'lucide-react';

const EventsAwards = () => {
    const [activeTab, setActiveTab] = useState('events');

    const filteredItems = events.filter(item =>
        activeTab === 'events' ? item.type === 'event' : item.type === 'award'
    );

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'upcoming': return 'bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] text-amber-500 dark:text-amber-400 border-amber-500/20';
            case 'applied': return 'bg-emerald-500 dark:bg-emerald-500/90 text-emerald-400 border-emerald-500/20';
            case 'open': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'drafting': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            default: return 'bg-gray-100 dark:bg-[#374151] text-gray-700 dark:text-gray-300 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Events & Awards</h1>
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Discover speaking opportunities and industry recognition.</p>
            </div>

            <div className="flex bg-white dark:bg-[#111827] p-1 rounded-lg border border-[#EAE8E4] dark:border-white/10 w-full max-w-md mb-6 shadow-sm">
                <button
                    onClick={() => setActiveTab('events')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-md transition-all ${activeTab === 'events'
                        ? 'bg-gray-100 dark:bg-[#374151] text-amber-500 dark:text-amber-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:text-gray-200'
                        }`}
                >
                    <CalendarDays size={18} /> Industry Events
                </button>
                <button
                    onClick={() => setActiveTab('awards')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-md transition-all ${activeTab === 'awards'
                        ? 'bg-gray-100 dark:bg-[#374151] text-amber-500 dark:text-amber-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:text-gray-200'
                        }`}
                >
                    <Trophy size={18} /> Awards
                </button>
            </div>

            <div className="bg-white dark:bg-[#111827] rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="divide-y divide-[#EAE8E4]">
                    {filteredItems.length > 0 ? (
                        filteredItems.map(item => (
                            <div key={item.id} className="p-6 hover:bg-gray-50 dark:hover:bg-[#1F2937] dark:bg-[#1F2937]:bg-slate-700 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                                            {item.status}
                                        </span>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 px-2.5 py-1 bg-[#FDFBF7] dark:bg-[#0B0F19] rounded-full border border-[#EAE8E4] dark:border-white/10">
                                            {item.industry}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{item.name}</h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                                        <span className="flex items-center gap-1.5"><Clock size={16} /> Deadline: {new Date(item.deadline).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex-shrink-0 w-full md:w-auto">
                                    <button className="w-full md:w-auto bg-gray-100 dark:bg-[#374151] hover:bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] hover:text-white text-gray-800 dark:text-gray-200 border border-gray-200 hover:border-amber-500 py-2.5 px-6 rounded-lg font-medium transition-all shadow-sm">
                                        {item.type === 'event' ? 'Request to Speak' : 'Start Application'}
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500">
                            <Trophy size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                            <p>No {activeTab} available at the moment.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventsAwards;
