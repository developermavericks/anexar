import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { Lock, CheckCircle } from 'lucide-react';

const Toggle = ({ enabled, onChange, disabled }) => {
    return (
        <button
            type="button"
            className={`${enabled ? 'bg-emerald-500 dark:bg-emerald-500/90' : 'bg-gray-200'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
            role="switch"
            aria-checked={enabled}
            onClick={() => !disabled && onChange(!enabled)}
            disabled={disabled}
        >
            <span
                aria-hidden="true"
                className={`${enabled ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-[#111827] shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    );
};

const NotificationTab = () => {
    const { user, setUser } = useUser();
    const isBasic = user.plan === 'basic';

    const [emailSettings, setEmailSettings] = useState(user.notifications?.email || {
        campaign: true,
        press: true,
        events: false,
        performance: true,
        crisis: false
    });

    const [appSettings, setAppSettings] = useState(user.notifications?.app || {
        completion: true,
        goals: true,
        budget: false,
        team: true
    });

    const [showToast, setShowToast] = useState(false);

    const handleSave = () => {
        setUser({
            ...user,
            notifications: {
                email: emailSettings,
                app: appSettings
            }
        });
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    return (
        <div className="p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notification Preferences</h2>
                <button
                    onClick={handleSave}
                    className="px-5 py-2.5 bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] hover:bg-black dark:hover:bg-amber-400:bg-cyan-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                >
                    Save Preferences
                </button>
            </div>

            <div className="space-y-8">
                {/* Email Notifications */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-[#EAE8E4] dark:border-white/10">Email Notifications</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Campaign Updates</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Receive alerts when campaign status changes.</p>
                            </div>
                            <Toggle enabled={emailSettings.campaign} onChange={(val) => setEmailSettings({ ...emailSettings, campaign: val })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Press Release Status</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Notifications for drafts, approvals, and distributions.</p>
                            </div>
                            <Toggle enabled={emailSettings.press} onChange={(val) => setEmailSettings({ ...emailSettings, press: val })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Event Reminders</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Reminders for upcoming webinars and speaking slots.</p>
                            </div>
                            <Toggle enabled={emailSettings.events} onChange={(val) => setEmailSettings({ ...emailSettings, events: val })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Weekly Performance Report</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">A weekly digest of your KPIs and PR metrics.</p>
                            </div>
                            <Toggle enabled={emailSettings.performance} onChange={(val) => setEmailSettings({ ...emailSettings, performance: val })} />
                        </div>

                        {/* Premium Setting */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1F2937] rounded-xl border border-[#EAE8E4] dark:border-white/10">
                            <div className="flex items-start gap-3">
                                {isBasic && <Lock className="text-amber-500 dark:text-amber-400 mt-0.5" size={18} />}
                                <div>
                                    <p className={`font-medium ${isBasic ? 'text-gray-500 dark:text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                                        Crisis Alerts
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Immediate SMS/Email alerts for negative brand mentions.</p>
                                    {isBasic && (
                                        <span className="text-xs font-bold text-amber-500 dark:text-amber-400 mt-1 inline-block">PRO FEATURE</span>
                                    )}
                                </div>
                            </div>
                            <Toggle
                                disabled={isBasic}
                                enabled={emailSettings.crisis}
                                onChange={(val) => setEmailSettings({ ...emailSettings, crisis: val })}
                            />
                        </div>
                    </div>
                </div>

                {/* In-App Notifications */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-[#EAE8E4] dark:border-white/10">In-App Notifications</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Deliverable Completion</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Ping when team members complete task deliverables.</p>
                            </div>
                            <Toggle enabled={appSettings.completion} onChange={(val) => setAppSettings({ ...appSettings, completion: val })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Goal Updates</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Notifies you of progress changes in your commitment goals.</p>
                            </div>
                            <Toggle enabled={appSettings.goals} onChange={(val) => setAppSettings({ ...appSettings, goals: val })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Budget Alerts</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">When campaigns near 90% of allocated ad-spend.</p>
                            </div>
                            <Toggle enabled={appSettings.budget} onChange={(val) => setAppSettings({ ...appSettings, budget: val })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Team Messages</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Direct messages from your dedicated account managers.</p>
                            </div>
                            <Toggle enabled={appSettings.team} onChange={(val) => setAppSettings({ ...appSettings, team: val })} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast */}
            {showToast && (
                <div className="fixed bottom-6 right-6 bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] text-white dark:bg-amber-500 dark:text-[#0B0F19] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
                    <CheckCircle className="text-emerald-400" size={20} />
                    <span className="font-medium">Notification preferences saved.</span>
                </div>
            )}
        </div>
    );
};

export default NotificationTab;
