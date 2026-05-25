import React, { useState } from 'react';
import { AlertTriangle, Trash2, XCircle } from 'lucide-react';

const DangerZoneTab = () => {
    const [modal, setModal] = useState({ isOpen: false, type: null, title: '', message: '' });

    const openModal = (type) => {
        let config = { isOpen: true, type };
        if (type === 'delete') {
            config.title = 'Delete Account';
            config.message = 'Are you absolutely sure you want to delete your account? This action cannot be undone and you will lose all campaign data, histories, and settings permanently.';
        } else if (type === 'cancel') {
            config.title = 'Cancel Subscription';
            config.message = 'Are you sure you want to cancel your active subscription? You will lose access to Pro features at the end of your billing cycle.';
        } else if (type === 'remove') {
            config.title = 'Remove Organization';
            config.message = 'Are you sure you want to decouple this organization profile from your account? This drops all shared access for your team.';
        }
        setModal(config);
    };

    const handleConfirm = () => {
        // Logic for backend API would execute here
        setModal({ isOpen: false, type: null, title: '', message: '' });
    };

    return (
        <div className="p-6 md:p-8">
            <h2 className="text-xl font-bold text-rose-600 dark:text-rose-400 mb-6 flex items-center gap-2">
                <AlertTriangle size={24} /> Danger Zone
            </h2>

            <div className="border border-rose-200 rounded-3xl overflow-hidden bg-rose-50 dark:bg-rose-400/10">
                <div className="p-6 border-b border-rose-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Cancel Subscription</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 mt-1">Downgrade to the basic free tier and halt future payments.</p>
                    </div>
                    <button
                        onClick={() => openModal('cancel')}
                        className="px-5 py-2.5 bg-white dark:bg-[#111827] border border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1F2937] dark:bg-[#1F2937]:bg-slate-700 hover:text-rose-600 dark:text-rose-400 rounded-xl font-bold transition-colors whitespace-nowrap"
                    >
                        Cancel Plan
                    </button>
                </div>

                <div className="p-6 border-b border-rose-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Remove Organization</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 mt-1">Detach the current company profile from your Maverick's account.</p>
                    </div>
                    <button
                        onClick={() => openModal('remove')}
                        className="px-5 py-2.5 bg-white dark:bg-[#111827] border border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1F2937] dark:bg-[#1F2937]:bg-slate-700 hover:text-rose-600 dark:text-rose-400 rounded-xl font-bold transition-colors whitespace-nowrap"
                    >
                        Remove Org
                    </button>
                </div>

                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-rose-50 dark:bg-rose-400/10">
                    <div>
                        <h3 className="font-bold text-rose-700">Delete Account</h3>
                        <p className="text-sm text-rose-600 dark:text-rose-400 mt-1">Permanently remove your personal account and all its data. This cannot be undone.</p>
                    </div>
                    <button
                        onClick={() => openModal('delete')}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors shadow-sm whitespace-nowrap flex items-center gap-2"
                    >
                        <Trash2 size={18} /> Delete Account
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {modal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setModal({ ...modal, isOpen: false })}></div>
                    <div className="relative bg-white dark:bg-[#111827] rounded-3xl border border-[#EAE8E4] dark:border-white/10 p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
                        <button
                            onClick={() => setModal({ ...modal, isOpen: false })}
                            className="absolute top-6 right-6 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white dark:text-white:text-slate-100 transition-colors"
                        >
                            <XCircle size={24} />
                        </button>

                        <div className="mb-6 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-rose-100 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">{modal.title}</h2>
                            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-3 font-medium">{modal.message}</p>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setModal({ ...modal, isOpen: false })}
                                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-[#374151] hover:bg-gray-200 text-gray-900 dark:text-white font-bold rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DangerZoneTab;
