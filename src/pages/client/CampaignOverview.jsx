import React from 'react';
import { campaigns } from '../../mock/clientData';
import { Activity, Target } from 'lucide-react';

const CampaignOverview = () => {
    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campaign Overview</h1>
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Track the progress and ROI of your active marketing initiatives.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {campaigns.map((campaign) => (
                    <div key={campaign.id} className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{campaign.name}</h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${campaign.status === 'Active'
                                            ? 'bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] text-amber-500 dark:text-amber-400 border-amber-500/20'
                                            : campaign.status === 'Completed'
                                                ? 'bg-emerald-500 dark:bg-emerald-500/90 text-emerald-400 border-emerald-500/20'
                                                : 'bg-gray-50 dark:bg-[#1F2937] text-gray-700 dark:text-gray-300 border-gray-200'
                                        }`}>
                                        {campaign.status}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-gray-100 dark:bg-[#374151] p-3 rounded-3xl border border-gray-200">
                                <Activity size={24} className="text-amber-500 dark:text-amber-400" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 flex items-center gap-2"><Target size={16} /> Progress</span>
                                    <span className="text-gray-900 dark:text-white font-bold">{campaign.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-[#374151] rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-1000"
                                        style={{ width: `${campaign.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CampaignOverview;
