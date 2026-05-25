import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { CheckCircle, Download, CreditCard, ExternalLink } from 'lucide-react';

const Toggle = ({ enabled, onChange }) => {
    return (
        <button
            type="button"
            className={`${enabled ? 'bg-emerald-500 dark:bg-emerald-500/90' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
            role="switch"
            aria-checked={enabled}
            onClick={() => onChange(!enabled)}
        >
            <span
                aria-hidden="true"
                className={`${enabled ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-[#111827] shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    );
};

const BillingTab = () => {
    const { user, setUser } = useUser();
    const [isAnnual, setIsAnnual] = useState(true);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const handleUpgrade = () => {
        setUser({ ...user, plan: 'pro' });
        setToastMessage('Successfully upgraded to Pro Plan!');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleDowngrade = () => {
        setUser({ ...user, plan: 'basic' });
        setToastMessage('Successfully downgraded to Basic Plan.');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const mockInvoices = [
        { id: 'INV-2023-104', date: 'Oct 01, 2023', amount: '$499.00', status: 'Paid' },
        { id: 'INV-2023-094', date: 'Sep 01, 2023', amount: '$499.00', status: 'Paid' },
        { id: 'INV-2023-084', date: 'Aug 01, 2023', amount: '$499.00', status: 'Paid' },
    ];

    return (
        <div className="p-6 md:p-8 relative">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Subscription & Billing</h2>

            <div className="space-y-8">
                {/* Current Plan Overview */}
                <div className="bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] text-white dark:bg-amber-500 dark:text-[#0B0F19] rounded-3xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-2xl font-black">
                                    {user.plan === 'enterprise' ? 'Enterprise Plan' : user.plan === 'pro' ? 'Pro Plan' : 'Basic Plan'}
                                </h3>
                                <span className="bg-emerald-500 dark:bg-emerald-500/90 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
                                    Active
                                </span>
                            </div>
                            <p className="text-gray-400 dark:text-gray-500 max-w-md">You are currently on the {user.plan} tier. Your next billing date is Nov 01, 2023.</p>
                        </div>

                        <div className="flex gap-3 w-full md:w-auto">
                            {user.plan !== 'basic' && (
                                <button onClick={handleDowngrade} className="flex-1 md:flex-none px-5 py-2.5 bg-white dark:bg-[#111827] hover:bg-gray-100 dark:hover:bg-[#1F2937] text-gray-900 dark:text-white rounded-xl font-medium transition-colors border border-[#EAE8E4] dark:border-white/10 shadow-sm">
                                    Downgrade
                                </button>
                            )}
                            {user.plan !== 'enterprise' && (
                                <button onClick={handleUpgrade} className="flex-1 md:flex-none px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-[#1A1A1A] rounded-xl font-bold transition-colors shadow-sm">
                                    Upgrade Plan
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="relative z-10 mt-8 pt-8 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="text-amber-500 dark:text-amber-400" size={20} />
                            <span className="text-gray-300">5 Active Campaigns</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle className="text-amber-500 dark:text-amber-400" size={20} />
                            <span className="text-gray-300">Priority Press Distribution</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle className="text-amber-500 dark:text-amber-400" size={20} />
                            <span className="text-gray-300">Standard Analytics</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Payment Method */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-[#EAE8E4] dark:border-white/10">Payment Method</h3>
                        <div className="border border-[#EAE8E4] dark:border-white/10 rounded-2xl p-5 bg-white dark:bg-[#111827]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-gray-100 dark:bg-[#374151] p-2 rounded-lg">
                                        <CreditCard size={24} className="text-gray-700 dark:text-gray-300" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            Visa ending in <span className="font-mono bg-gray-100 dark:bg-[#374151] px-1.5 py-0.5 rounded text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">4242</span>
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Expires 12/2025</p>
                                    </div>
                                </div>
                            </div>
                            <button className="text-sm font-bold text-[#1A1A1A] hover:text-amber-600 flex items-center gap-1 transition-colors">
                                Update payment method <ExternalLink size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Billing Cycle */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-[#EAE8E4] dark:border-white/10">Billing Cycle</h3>
                        <div className="border border-[#EAE8E4] dark:border-white/10 rounded-2xl p-5 bg-[#FDFBF7] dark:bg-[#0B0F19] flex items-center justify-between">
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">Annual Billing</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">Save 20% by paying annually.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold ${!isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>Monthly</span>
                                <Toggle enabled={isAnnual} onChange={setIsAnnual} />
                                <span className={`text-sm font-bold ${isAnnual ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>Annual</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Invoices */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-[#EAE8E4] dark:border-white/10">Invoice History</h3>
                    <div className="border border-[#EAE8E4] dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-[#111827]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#FDFBF7] dark:bg-[#0B0F19] border-b border-[#EAE8E4] dark:border-white/10">
                                    <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500">Invoice ID</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500">Date</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500">Amount</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500">Status</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EAE8E4]">
                                {mockInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-[#1F2937] dark:bg-[#1F2937]:bg-slate-700 transition-colors">
                                        <td className="p-4 font-medium text-gray-900 dark:text-white">{inv.id}</td>
                                        <td className="p-4 text-gray-600 dark:text-gray-400 dark:text-gray-500">{inv.date}</td>
                                        <td className="p-4 font-semibold text-gray-900 dark:text-white">{inv.amount}</td>
                                        <td className="p-4">
                                            <span className="bg-emerald-50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button className="text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-[#1A1A1A] p-2 hover:bg-gray-100 dark:hover:bg-[#374151] dark:bg-[#374151] rounded-lg transition-colors inline-flex">
                                                <Download size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Toast */}
            {showToast && (
                <div className="fixed bottom-6 right-6 bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
                    <CheckCircle className="text-emerald-400" size={20} />
                    <span className="font-medium">{toastMessage}</span>
                </div>
            )}
        </div>
    );
};

export default BillingTab;
