import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { Blocks, Calendar, Mail, MessageSquare, BarChart2, CheckCircle, XCircle } from 'lucide-react';

const IntegrationCard = ({ name, description, icon: Icon, integrationKey, date }) => {
    const { user, setUser } = useUser();
    // Default to false if user.integrations or the specific key is undefined
    const isConnected = user.integrations?.[integrationKey] || false;

    const toggleConnection = () => {
        setUser({
            ...user,
            integrations: {
                ...user.integrations,
                [integrationKey]: !isConnected
            }
        });
    };

    return (
        <div className="border border-[#EAE8E4] dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#111827] hover:shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#1F2937] border border-[#EAE8E4] dark:border-white/10">
                        <Icon size={24} className="text-gray-700 dark:text-gray-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{description}</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#EAE8E4] dark:border-white/10 mt-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                    {isConnected ? (
                        <>
                            <CheckCircle size={16} className="text-emerald-500 dark:text-emerald-400" />
                            <span className="text-emerald-600 dark:text-emerald-400">Connected</span>
                            {date && (
                                <>
                                    <span className="text-gray-400 dark:text-gray-500 mx-1">•</span>
                                    <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 font-normal">Synced {date}</span>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <XCircle size={16} className="text-gray-400 dark:text-gray-500" />
                            <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Not Connected</span>
                        </>
                    )}
                </div>

                <button
                    onClick={toggleConnection}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isConnected
                        ? 'bg-rose-50 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
                        : 'bg-gray-100 dark:bg-[#374151] text-gray-900 dark:text-white hover:bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] hover:text-white'
                        }`}
                >
                    {isConnected ? 'Disconnect' : 'Connect'}
                </button>
            </div>
        </div>
    );
};

const IntegrationTab = () => {
    return (
        <div className="p-6 md:p-8">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Connected Integrations</h2>
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">Connect your workspace tools to sync data across your ecosystem.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <IntegrationCard
                    name="Google Analytics"
                    description="Sync website traffic and conversion data."
                    icon={BarChart2}
                    integrationKey="googleAnalytics"
                    date="Today, 9:41 AM"
                />
                <IntegrationCard
                    name="Slack"
                    description="Receive immediate task alerts in your channels."
                    icon={MessageSquare}
                    integrationKey="slack"
                    date="Yesterday"
                />
                <IntegrationCard
                    name="HubSpot"
                    description="Sync CRM contacts and lead tracking."
                    icon={Blocks}
                    integrationKey="hubspot"
                    date=""
                />
                <IntegrationCard
                    name="Mailchimp"
                    description="Export audience lists for pressing releases."
                    icon={Mail}
                    integrationKey="mailchimp"
                    date=""
                />
                <IntegrationCard
                    name="Google Calendar"
                    description="Sync speaking events and webinars seamlessly."
                    icon={Calendar}
                    integrationKey="googleCalendar"
                    date="Today, 10:00 AM"
                />
            </div>
        </div>
    );
};

export default IntegrationTab;
