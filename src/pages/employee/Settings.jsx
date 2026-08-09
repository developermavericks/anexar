import React, { useState } from 'react';
import {
    User,
    Building2,
    Bell,
    Shield
} from 'lucide-react';
import ProfileTab from '../../components/settings/ProfileTab';
import OrganizationTab from '../../components/settings/OrganizationTab';
import NotificationTab from '../../components/settings/NotificationTab';
import SecurityTab from '../../components/settings/SecurityTab';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('profile');

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'organization', label: 'Organization', icon: Building2 },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield }
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'profile': return <ProfileTab />;
            case 'organization': return <OrganizationTab />;
            case 'notifications': return <NotificationTab />;
            case 'security': return <SecurityTab />;
            default: return <ProfileTab />;
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your strategic preferences, notifications, security credentials, and organization metadata.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Vertical Tab Navigation */}
                <div className="lg:w-64 flex-shrink-0">
                    <nav className="flex flex-col space-y-1 bg-white dark:bg-[#111827] p-2 rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-medium cursor-pointer ${activeTab === tab.id
                                    ? tab.isDanger
                                        ? 'bg-rose-50 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400'
                                        : 'bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] text-white shadow-md'
                                    : tab.isDanger
                                        ? 'text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:bg-rose-400/10'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F2937]'
                                    }`}
                            >
                                <tab.icon size={18} className={activeTab === tab.id ? '' : 'text-gray-400 dark:text-gray-500'} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content Container */}
                <div className="flex-1">
                    <div className="bg-white dark:bg-[#111827] rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)] h-full">
                        {renderTabContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
