import React, { useState } from 'react';
import { recommendedTopics } from '../../mock/clientData';
import { Lightbulb, Calendar, CheckCircle, XCircle } from 'lucide-react';

const ThoughtLeadership = () => {
    const [topics, setTopics] = useState(recommendedTopics);

    const handleAction = (id, action) => {
        setTopics(topics.map(topic =>
            topic.id === id ? { ...topic, status: action } : topic
        ));
    };

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Thought Leadership</h1>
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Review and approve suggested speaking topics and content themes.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {topics.map(topic => (
                    <div
                        key={topic.id}
                        className={`bg-white dark:bg-[#111827] p-6 rounded-3xl border transition-all shadow-[0_10px_30px_rgba(0,0,0,0.05)] ${topic.status === 'approved'
                            ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
                            : topic.status === 'rejected'
                                ? 'border-rose-500/50 opacity-75'
                                : 'border-[#EAE8E4] dark:border-white/10 hover:border-gray-300 hover:-translate-y-1'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-gray-50 dark:bg-[#1F2937] rounded-lg">
                                <Lightbulb size={24} className={
                                    topic.status === 'approved' ? 'text-emerald-400' :
                                        topic.status === 'rejected' ? 'text-rose-400' : 'text-amber-500 dark:text-amber-400'
                                } />
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">Match Score</span>
                                <p className="text-xl font-black text-gray-900 dark:text-white">{topic.relevanceScore}%</p>
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 line-clamp-2 min-h-[56px]">
                            {topic.title}
                        </h3>

                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mb-6">
                            <Calendar size={16} />
                            <span>Pitch Deadline: <span className="text-gray-800 dark:text-gray-200">{new Date(topic.deadline).toLocaleDateString()}</span></span>
                        </div>

                        {topic.status === 'pending' ? (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleAction(topic.id, 'approved')}
                                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 dark:bg-emerald-500/90 hover:bg-emerald-500 dark:bg-emerald-500/90 text-emerald-400 border border-emerald-500/30 py-2 rounded-lg font-medium transition-colors"
                                >
                                    <CheckCircle size={18} /> Approve
                                </button>
                                <button
                                    onClick={() => handleAction(topic.id, 'rejected')}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-50 dark:bg-[#1F2937] hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 text-gray-500 dark:text-gray-400 dark:text-gray-500 border border-gray-200 py-2 rounded-lg font-medium transition-colors"
                                >
                                    <XCircle size={18} /> Reject
                                </button>
                            </div>
                        ) : (
                            <div className={`py-2 text-center rounded-lg font-medium text-sm border ${topic.status === 'approved'
                                ? 'bg-emerald-500 dark:bg-emerald-500/90 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}>
                                {topic.status.charAt(0).toUpperCase() + topic.status.slice(1)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ThoughtLeadership;
