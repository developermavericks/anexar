import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { Lock, CheckCircle, Moon, Sun, Check } from 'lucide-react';

const PreferencesTab = () => {
    const { user, setUser } = useUser();
    const isBasic = user.plan === 'basic';

    const [prefs, setPrefs] = useState({
        theme: user.theme || 'light',
        view: 'comprehensive',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
        reports: 'standard'
    });

    const [showToast, setShowToast] = useState(false);

    const handleSave = () => {
        setUser({ ...user, theme: prefs.theme });
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    return (
        <div className="p-6 md:p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Application Preferences</h2>
                    <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">Customize your dashboard experience.</p>
                </div>
                <button
                    onClick={handleSave}
                    className="px-5 py-2.5 bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] hover:bg-black dark:hover:bg-amber-400:bg-cyan-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                >
                    Save Preferences
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Theme Toggle */}
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-3">Theme Preference</label>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setPrefs({ ...prefs, theme: 'light' })}
                            className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                                prefs.theme === 'light'
                                    ? 'border-brand-amber bg-gray-50 dark:bg-[#1F2937]'
                                    : 'border-[#EAE8E4] dark:border-white/10 bg-white dark:bg-[#1E293B] hover:border-gray-300'
                            }`}
                        >
                            <div className="w-12 h-12 bg-[#FDFBF7] dark:bg-[#0B0F19] rounded-full border border-[#EAE8E4] dark:border-white/10 flex items-center justify-center text-amber-500 dark:text-amber-400">
                                <Sun size={24} />
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                Soft Light {prefs.theme === 'light' && <Check size={16} className="text-emerald-500 dark:text-emerald-400" />}
                            </span>
                        </button>

                        <button
                            onClick={() => setPrefs({ ...prefs, theme: 'dark' })}
                            className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                                prefs.theme === 'dark'
                                    ? 'border-brand-amber bg-gray-50 dark:bg-[#1F2937]'
                                    : 'border-[#EAE8E4] dark:border-white/10 bg-white dark:bg-[#1E293B] hover:border-gray-300 dark:hover:border-slate-600'
                            }`}
                        >
                            <div className="w-12 h-12 bg-slate-900 dark:bg-[#0F172A] rounded-full border border-slate-700 dark:border-slate-800 flex items-center justify-center text-cyan-400">
                                <Moon size={24} />
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                Midnight Dark {prefs.theme === 'dark' && <Check size={16} className="text-emerald-500 dark:text-emerald-400" />}
                            </span>
                        </button>
                    </div>
                </div>

                {/* General Settings */}
                <div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Default Dashboard View</label>
                    <select
                        value={prefs.view}
                        onChange={(e) => setPrefs({ ...prefs, view: e.target.value })}
                        className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium cursor-pointer"
                    >
                        <option value="comprehensive">Comprehensive Overview</option>
                        <option value="compact">Compact Data Grid</option>
                        <option value="charts">Charts Heavy</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Date Format</label>
                    <select
                        value={prefs.dateFormat}
                        onChange={(e) => setPrefs({ ...prefs, dateFormat: e.target.value })}
                        className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium cursor-pointer"
                    >
                        <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Currency Format</label>
                    <select
                        value={prefs.currency}
                        onChange={(e) => setPrefs({ ...prefs, currency: e.target.value })}
                        className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium cursor-pointer"
                    >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="INR">INR (₹)</option>
                    </select>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <label className="block text-sm font-bold text-gray-900 dark:text-white">Default Report Type</label>
                        {isBasic && <Lock size={14} className="text-amber-500 dark:text-amber-400" />}
                    </div>
                    <select
                        value={prefs.reports}
                        onChange={(e) => setPrefs({ ...prefs, reports: e.target.value })}
                        disabled={isBasic}
                        className={`w-full border rounded-xl px-4 py-3 focus:outline-none transition-all font-medium ${isBasic
                            ? 'bg-gray-100 dark:bg-[#374151] border-gray-200 text-gray-500 dark:text-gray-400 dark:text-gray-500 cursor-not-allowed hidden-dropdown-arrow'
                            : 'bg-[#FDFBF7] dark:bg-[#0B0F19] border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer'
                            }`}
                    >
                        <option value="standard">Standard PDF</option>
                        <option value="advanced" disabled={isBasic}>Advanced Analytics (Pro)</option>
                        <option value="raw" disabled={isBasic}>Raw CSV Export (Pro)</option>
                    </select>
                    {isBasic && <p className="text-xs text-amber-600 mt-1 font-medium">Upgrade to Pro for advanced data formats.</p>}
                </div>
            </div>

            {/* Toast */}
            {showToast && (
                <div className="fixed bottom-6 right-6 bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] text-white dark:bg-amber-500 dark:text-[#0B0F19] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
                    <CheckCircle className="text-emerald-400" size={20} />
                    <span className="font-medium">Preferences saved successfully.</span>
                </div>
            )}
        </div>
    );
};

export default PreferencesTab;
