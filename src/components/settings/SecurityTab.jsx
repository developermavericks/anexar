import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { Shield, Smartphone, Monitor, Globe, CheckCircle } from 'lucide-react';

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

const SecurityTab = () => {
    const { user, setUser } = useUser();

    // In actual implementation, this depends on auth provider logic.
    const isGoogleAuth = user.email?.includes('gmail.com') || false;

    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [twoFactor, setTwoFactor] = useState(user.security?.twoFactor || false);
    const [showToast, setShowToast] = useState(false);

    const handleUpdatePassword = (e) => {
        e.preventDefault();
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        setPasswords({ current: '', new: '', confirm: '' });
    };

    const handleTwoFactorChange = (val) => {
        setTwoFactor(val);
        setUser({ ...user, security: { ...user.security, twoFactor: val } });
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const mockSessions = [
        { id: 1, device: 'MacBook Pro 16"', browser: 'Chrome', location: 'San Francisco, US', active: true, icon: Monitor },
        { id: 2, device: 'iPhone 14 Pro', browser: 'Safari', location: 'San Jose, US', active: false, icon: Smartphone },
        { id: 3, device: 'Windows PC', browser: 'Edge', location: 'New York, US', active: false, icon: Monitor }
    ];

    return (
        <div className="p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Account Security</h2>

            <div className="space-y-10">
                {/* Password Management */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Change Password</h3>

                    {isGoogleAuth ? (
                        <div className="bg-gray-50 dark:bg-[#1F2937] border border-[#EAE8E4] dark:border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4">
                            <div className="p-3 bg-white dark:bg-[#111827] rounded-full shadow-sm">
                                <Globe size={28} className="text-blue-500" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white text-lg">Managed by Google Authentication</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">Your password is managed through your connected Google Workspace account. Please change your password directly in Google.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
                                <input
                                    type="password"
                                    required
                                    value={passwords.current}
                                    onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                                    className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={passwords.new}
                                    onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                                    className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={passwords.confirm}
                                    onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                    className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!passwords.current || !passwords.new}
                                className="mt-2 bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] hover:bg-black dark:hover:bg-amber-400:bg-cyan-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
                            >
                                Update Password
                            </button>
                        </form>
                    )}
                </div>

                {/* Two Factor Authentication */}
                <div className="pt-8 border-t border-[#EAE8E4] dark:border-white/10">
                    <div className="flex items-center justify-between bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 rounded-2xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white dark:bg-[#111827] rounded-full shadow-sm text-emerald-500 dark:text-emerald-400">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Two-Factor Authentication (2FA)</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">Add an extra layer of security to your account using an authenticator app.</p>
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                            <Toggle enabled={twoFactor} onChange={handleTwoFactorChange} />
                        </div>
                    </div>
                </div>

                {/* Active Sessions */}
                <div className="pt-8 border-t border-[#EAE8E4] dark:border-white/10">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Active Sessions</h3>
                        <button className="text-sm font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400">
                            Log out all devices
                        </button>
                    </div>

                    <div className="space-y-4">
                        {mockSessions.map(session => (
                            <div key={session.id} className="flex items-center justify-between p-4 border border-[#EAE8E4] dark:border-white/10 rounded-xl bg-white dark:bg-[#111827]">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-gray-50 dark:bg-[#1F2937] rounded-lg text-gray-500 dark:text-gray-400 dark:text-gray-500">
                                        <session.icon size={20} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {session.device} <span className="text-gray-400 dark:text-gray-500 font-normal">({session.browser})</span>
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">{session.location}</p>
                                    </div>
                                </div>
                                <div>
                                    {session.active ? (
                                        <span className="text-xs font-bold px-2 py-1 bg-emerald-50 text-emerald-600 dark:text-emerald-400 rounded">Current Session</span>
                                    ) : (
                                        <button className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white dark:text-white:text-slate-100 font-medium">Log out</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Toast */}
            {showToast && (
                <div className="fixed bottom-6 right-6 bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] text-white dark:bg-amber-500 dark:text-[#0B0F19] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
                    <CheckCircle className="text-emerald-400" size={20} />
                    <span className="font-medium">Security settings updated.</span>
                </div>
            )}
        </div>
    );
};

export default SecurityTab;
