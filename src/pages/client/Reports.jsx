import React from 'react';
import { FileText, Download, Eye, Calendar, BarChart2, PieChart } from 'lucide-react';

const reports = [
    { id: 1, title: 'Monthly Performance Report', date: 'Feb 2026', type: 'Comprehensive', icon: BarChart2, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19]' },
    { id: 2, title: 'Q1 Campaign Breakdown', date: 'Jan 2026', type: 'Campaign', icon: PieChart, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { id: 3, title: 'Annual Budget Audit', date: 'Dec 2025', type: 'Financial', icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500 dark:bg-emerald-500/90' },
    { id: 4, title: 'Media Sentiment Analysis', date: 'Nov 2025', type: 'Analytics', icon: BarChart2, color: 'text-rose-400', bg: 'bg-rose-500/10' },
];

const Reports = () => {
    const handleDownload = (title) => {
        console.log(`Downloading: ${title}`);
        alert(`Downloading ${title}.pdf`);
    };

    const handleView = (title) => {
        console.log(`Viewing: ${title}`);
        alert(`Opening ${title} in viewer.`);
    };

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports Gallery</h1>
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Access and download your comprehensive PR reports and analytics.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {reports.map((report) => (
                    <div key={report.id} className="bg-white dark:bg-[#111827] rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col transition-transform hover:-translate-y-1">
                        <div className={`p-6 flex items-center justify-center border-b border-[#EAE8E4] dark:border-white/10 ${report.bg}`}>
                            <report.icon size={48} className={report.color} />
                        </div>

                        <div className="p-6 flex-1 flex flex-col">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-[#374151] text-gray-700 dark:text-gray-300">
                                    {report.type}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
                                    <Calendar size={12} /> {report.date}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 leading-tight flex-1">
                                {report.title}
                            </h3>

                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                <button
                                    onClick={() => handleView(report.title)}
                                    className="flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-[#374151] hover:bg-gray-200 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                                >
                                    <Eye size={16} /> View
                                </button>
                                <button
                                    onClick={() => handleDownload(report.title)}
                                    className="flex items-center justify-center gap-2 py-2.5 bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] hover:bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] hover:text-white text-amber-500 dark:text-amber-400 border border-amber-500/30 hover:border-amber-500 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Download size={16} /> PDF
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Reports;
