import React from 'react';
import { Clock, ExternalLink } from 'lucide-react';

export default function TimeAllocation() {
    return (
        <div className="space-y-6 max-w-6xl mx-auto px-4 py-6">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-5">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Time Allocation
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Manage and log your client project hours efficiently.
                </p>
            </div>

            <div className="relative group overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl p-8 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-indigo-500/30">
                {/* Background decorative glow */}
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-3xl transition-all duration-500 group-hover:from-indigo-500/20 group-hover:to-purple-500/20" />
                
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-3 text-white shadow-lg shadow-indigo-500/20">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Allocate Client Hours
                            </h2>
                            <p className="mt-2 text-base text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
                                To allocate the hours you spent on client projects, please fill out your weekly efforts and log them in our time allocation portal.
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0">
                        <a
                            href="https://mavs-tracker.vercel.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                            <span>Go to Clocked</span>
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
