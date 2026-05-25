import React, { useState } from 'react';
import { goals as initialGoals } from '../../mock/clientData';
import { Target, TrendingUp, CheckCircle, AlertTriangle, Plus, X, Calendar } from 'lucide-react';

const GoalsCommitment = () => {
    const [goalsList, setGoalsList] = useState(initialGoals.map(g => ({ ...g, period: 'Annual' })));
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newGoal, setNewGoal] = useState({ deliverable: '', target: '', period: 'Monthly' });

    const handleAddGoal = (e) => {
        e.preventDefault();
        const goal = {
            id: Date.now(),
            deliverable: newGoal.deliverable,
            target: newGoal.target,
            achieved: 0,
            progress: 0,
            status: 'Pending',
            period: newGoal.period
        };
        setGoalsList([goal, ...goalsList]);
        setIsModalOpen(false);
        setNewGoal({ deliverable: '', target: '', period: 'Monthly' });
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Completed': return <CheckCircle size={16} className="text-emerald-400" />;
            case 'On Track': return <TrendingUp size={16} className="text-amber-500 dark:text-amber-400" />;
            case 'At Risk': return <AlertTriangle size={16} className="text-rose-400" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Goals & Commitment</h1>
                    <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Track the deliverables and success metrics we committed to achieve.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] hover:bg-black dark:hover:bg-amber-400:bg-cyan-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm flex-shrink-0"
                >
                    <Plus size={18} /> Add Goal
                </button>
            </div>

            <div className="bg-white dark:bg-[#111827] rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="p-6 border-b border-[#EAE8E4] dark:border-white/10 bg-[#FDFBF7] dark:bg-[#0B0F19] flex items-center gap-3">
                    <div className="p-2 bg-emerald-500 dark:bg-emerald-500/90 text-emerald-400 rounded-lg">
                        <Target size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Annual Deliverables</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Your campaign goals tracker</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#FDFBF7] dark:bg-[#0B0F19] border-b border-[#EAE8E4] dark:border-white/10">
                                <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 w-1/4">Deliverable</th>
                                <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 w-1/6">Period</th>
                                <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 w-1/6">Target</th>
                                <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 w-1/6">Achieved</th>
                                <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 w-1/5">Progress</th>
                                <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 w-1/6">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EAE8E4]">
                            {goalsList.map((goal) => (
                                <tr key={goal.id} className="hover:bg-gray-50 dark:hover:bg-[#1F2937] dark:bg-[#1F2937]:bg-slate-700 transition-colors">
                                    <td className="p-4">
                                        <p className="font-medium text-gray-900 dark:text-white">{goal.deliverable}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-xs font-semibold px-2 py-1 bg-gray-100 dark:bg-[#374151] text-gray-600 dark:text-gray-400 dark:text-gray-500 rounded-md border border-gray-200">
                                            {goal.period || 'Annual'}
                                        </span>
                                    </td>
                                    <td className="p-4 font-semibold text-gray-700 dark:text-gray-300">
                                        {goal.target}
                                    </td>
                                    <td className="p-4 font-bold text-gray-900 dark:text-white">
                                        {goal.achieved}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-full bg-gray-100 dark:bg-[#374151] rounded-full h-2 overflow-hidden flex-1">
                                                <div
                                                    className={`h-2 rounded-full transition-all duration-1000 ${goal.status === 'Completed' ? 'bg-emerald-500 dark:bg-emerald-500/90' :
                                                        goal.status === 'At Risk' ? 'bg-rose-500' : 'bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19]'
                                                        }`}
                                                    style={{ width: `${goal.progress}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-8">{goal.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5 text-sm font-medium">
                                            {getStatusIcon(goal.status)}
                                            <span className={
                                                goal.status === 'Completed' ? 'text-emerald-400' :
                                                    goal.status === 'At Risk' ? 'text-rose-400' :
                                                        goal.status === 'Pending' ? 'text-gray-500 dark:text-gray-400 dark:text-gray-500' : 'text-amber-500 dark:text-amber-400'
                                            }>
                                                {goal.status}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Goal Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/5 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-[#111827] rounded-3xl border border-[#EAE8E4] dark:border-white/10 p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-6 right-6 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white dark:text-white:text-slate-100 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Goal</h2>
                            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mt-1">Set a monthly or quarterly goal for the team.</p>
                        </div>

                        <form onSubmit={handleAddGoal} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">Deliverable</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Publish 3 Thought Leadership Articles"
                                    className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder-gray-400 font-medium"
                                    value={newGoal.deliverable}
                                    onChange={(e) => setNewGoal({ ...newGoal, deliverable: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">Target Focus</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        placeholder="Target qty."
                                        className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium"
                                        value={newGoal.target}
                                        onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">Period</label>
                                    <select
                                        className="w-full bg-white dark:bg-[#111827] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium cursor-pointer"
                                        value={newGoal.period}
                                        onChange={(e) => setNewGoal({ ...newGoal, period: e.target.value })}
                                    >
                                        <option value="Monthly">Monthly</option>
                                        <option value="Quarterly">Quarterly</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-2 bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] hover:bg-black dark:hover:bg-amber-400:bg-cyan-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={18} /> Submit Goal
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GoalsCommitment;
