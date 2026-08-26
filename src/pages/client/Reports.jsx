import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Calendar, BarChart2, PieChart, FileSpreadsheet, ExternalLink, Link2 } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { db } from '../../lib/firebaseClient';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

const DEFAULT_CLIENT_MASTER_LINKS = {
    'Scapia': {
        cumulativeSheetUrl: 'https://docs.google.com/spreadsheets/d/1AurFLe0YYeM81fYoMCJF_b70UjgGVe-A/edit?usp=drivesdk&ouid=111134406246031913275&rtpof=true&sd=true',
        filteredDocUrl: 'https://docs.google.com/document/d/1PteVNfa7xF9szNX2eGcq3lMqI7B2lcBMs0GFGjaijm4/edit?usp=drivesdk',
        masterDocUrl: 'https://docs.google.com/document/d/16XWEakARxprnrsf2fHgHm8GGqqFdN5hYwZH_gvjZm-Y/edit?usp=drivesdk'
    },
    'Wadhwani AI': {
        cumulativeSheetUrl: 'https://docs.google.com/spreadsheets/d/1PQCIQM8yU-luDNmfT35pO5zk5jI4Ib0y/edit?usp=drivesdk&ouid=111134406246031913275&rtpof=true&sd=true',
        filteredDocUrl: 'https://docs.google.com/document/d/1ZszkbDi7kFLIOMLYAmaUijctT8IddlY7NPCf68tANBg/edit?usp=drivesdk',
        masterDocUrl: 'https://docs.google.com/document/d/1qQpENdja3Tg1O-ED4jzKuaHkq5wgZit1lbIGOdJBZ8o/edit?usp=drivesdk'
    },
    'Wadhwani': {
        cumulativeSheetUrl: 'https://docs.google.com/spreadsheets/d/1PQCIQM8yU-luDNmfT35pO5zk5jI4Ib0y/edit?usp=drivesdk&ouid=111134406246031913275&rtpof=true&sd=true',
        filteredDocUrl: 'https://docs.google.com/document/d/1ZszkbDi7kFLIOMLYAmaUijctT8IddlY7NPCf68tANBg/edit?usp=drivesdk',
        masterDocUrl: 'https://docs.google.com/document/d/1qQpENdja3Tg1O-ED4jzKuaHkq5wgZit1lbIGOdJBZ8o/edit?usp=drivesdk'
    },
    'E3 Electric AI': {
        cumulativeSheetUrl: 'https://docs.google.com/spreadsheets/d/16AbQMygKpWhYmvhmyFc7oxcz5WNsYacs/edit?usp=drivesdk&ouid=111134406246031913275&rtpof=true&sd=true',
        filteredDocUrl: 'https://docs.google.com/document/d/1_VCUF7QaCtsqiS5nz191RVZ0ayt0Paves52OMo4EmOY/edit?usp=drivesdk',
        masterDocUrl: 'https://docs.google.com/document/d/1RHG8y63xEVd-N4o5Kb0pThgXTpu4yfSzGvAlELu2788/edit?usp=drivesdk'
    },
    'E3 Electric.AI': {
        cumulativeSheetUrl: 'https://docs.google.com/spreadsheets/d/16AbQMygKpWhYmvhmyFc7oxcz5WNsYacs/edit?usp=drivesdk&ouid=111134406246031913275&rtpof=true&sd=true',
        filteredDocUrl: 'https://docs.google.com/document/d/1_VCUF7QaCtsqiS5nz191RVZ0ayt0Paves52OMo4EmOY/edit?usp=drivesdk',
        masterDocUrl: 'https://docs.google.com/document/d/1RHG8y63xEVd-N4o5Kb0pThgXTpu4yfSzGvAlELu2788/edit?usp=drivesdk'
    },
    'Murf AI': {
        cumulativeSheetUrl: '',
        filteredDocUrl: 'https://docs.google.com/document/d/11o3qSpOeuPRwAHNdhHNqHTLLctMSPLTIDhwitajq9TA/edit?usp=drivesdk',
        masterDocUrl: 'https://docs.google.com/document/d/1qCxg--XA89qV1luwtJA5K0GMg9NOGfQInW3B4wBwkTw/edit?usp=drivesdk'
    }
};

const getGoogleExportUrl = (url, format = 'xlsx') => {
    if (!url) return '#';
    if (url.includes('/spreadsheets/d/')) {
        const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (idMatch && idMatch[1]) {
            return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=${format}`;
        }
    }
    if (url.includes('/document/d/')) {
        const idMatch = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
        if (idMatch && idMatch[1]) {
            return `https://docs.google.com/document/d/${idMatch[1]}/export?format=${format === 'xlsx' ? 'docx' : format}`;
        }
    }
    return url;
};

const Reports = () => {
    const { user } = useUser();
    const [dynamicReports, setDynamicReports] = useState([]);
    const [selectedTab, setSelectedTab] = useState('daily'); // 'daily', 'weekly', 'monthly', 'annual', 'outreach'
    const [masterLinks, setMasterLinks] = useState(null);

    const clientName = user?.clientBrand || 'FUJIFILM';

    useEffect(() => {
        if (!clientName) return;

        const docRef = doc(db, "client_master_links", clientName);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setMasterLinks(docSnap.data());
            } else {
                setMasterLinks(null);
            }
        });

        return () => unsubscribe();
    }, [clientName]);

    useEffect(() => {
        if (!clientName) return;

        const q = query(
            collection(db, "client_documents"),
            where("client", "==", clientName)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                list.push({
                    id: docSnap.id,
                    title: data.fileName,
                    date: data.reportDate ? data.reportDate : `${data.month || ''} ${data.year || ''}`,
                    type: data.type || 'Report',
                    icon: data.type === 'Daily Tracker' || data.type === 'Weekly Tracker' || data.type === 'Monthly Tracker' 
                           ? BarChart2 
                           : data.type === 'Annual Report' 
                           ? PieChart 
                           : FileText,
                    color: data.type === 'Daily Tracker' 
                           ? 'text-amber-500 dark:text-amber-400'
                           : data.type === 'Weekly Tracker'
                           ? 'text-blue-500 dark:text-blue-400'
                           : data.type === 'Monthly Tracker'
                           ? 'text-rose-500 dark:text-rose-400'
                           : data.type === 'Annual Report' 
                           ? 'text-purple-400' 
                           : 'text-emerald-450',
                    bg: data.type === 'Daily Tracker' 
                        ? 'bg-amber-500/10'
                        : data.type === 'Weekly Tracker'
                        ? 'bg-blue-500/10'
                        : data.type === 'Monthly Tracker'
                        ? 'bg-rose-500/10'
                        : data.type === 'Annual Report' 
                        ? 'bg-purple-500/10' 
                        : 'bg-emerald-500/10',
                    size: data.fileSize || 'Unknown size',
                    uploadedBy: data.uploadedBy || 'Team Partner',
                    fileData: data.fileData || null,
                    reportDate: data.reportDate || '',
                    createdAt: data.createdAt || '',
                    content: data.content || null,
                    rows: data.rows || null,
                    headers: data.headers || null,
                    isDynamic: true
                });
            });
            // Sort chronologically descending
            list.sort((a, b) => {
                const dateA = new Date(a.reportDate || a.createdAt || 0).getTime();
                const dateB = new Date(b.reportDate || b.createdAt || 0).getTime();
                return dateB - dateA;
            });
            setDynamicReports(list);
        }, (err) => {
            console.error("Error listening to client documents:", err);
        });

        return () => unsubscribe();
    }, [clientName]);

    const dailyList = dynamicReports.filter(r => r.type === 'Daily Tracker');
    const weeklyList = dynamicReports.filter(r => r.type === 'Weekly Tracker');
    const monthlyList = dynamicReports.filter(r => r.type === 'Monthly Tracker');
    const annualReportsList = dynamicReports.filter(r => r.type === 'Annual Report');
    const outreachList = dynamicReports.filter(r => r.type === 'Outreach');

    const activeList = selectedTab === 'daily' ? dailyList
                     : selectedTab === 'weekly' ? weeklyList
                     : selectedTab === 'monthly' ? monthlyList
                     : selectedTab === 'annual' ? annualReportsList
                     : outreachList;

    const handleDownload = (report) => {
        if (report?.fileData) {
            const link = document.createElement('a');
            link.href = report.fileData;
            link.download = report.title || report.fileName || 'daily_report';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (report?.type === 'excel' || (report?.rows && report?.headers)) {
            const dataToExport = report.rows.map(row => {
                const cleanRow = {};
                report.headers.forEach(h => {
                    if (row[h] !== undefined) {
                        cleanRow[h] = row[h];
                    }
                });
                return cleanRow;
            });
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Tracker");
            XLSX.writeFile(workbook, `${report.title || 'Tracker'}.xlsx`);
        } else if (report?.content) {
            const blob = new Blob([report.content], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${report.title || 'Document'}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else {
            console.log(`Downloading: ${report?.title || report}`);
            alert(`No download source available for this item.`);
        }
    };

    const handleView = (report) => {
        if (report?.fileData) {
            window.open(report.fileData, '_blank');
        } else if (report?.type === 'excel' || (report?.rows && report?.headers)) {
            const newWindow = window.open();
            if (newWindow) {
                let tableHtml = `
                    <html>
                    <head>
                        <title>${report.title}</title>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 25px; background: #f8fafc; color: #1e293b; }
                            .header { margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                            h3 { margin: 0; font-size: 16px; font-weight: 800; color: #0f172a; }
                            p { margin: 5px 0 0 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
                            .table-container { overflow-x: auto; border: 1px solid #cbd5e1; border-radius: 12px; background: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                            table { border-collapse: collapse; width: 100%; }
                            th, td { border-bottom: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; font-size: 12px; }
                            th { background: #f1f5f9; font-weight: bold; color: #334155; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
                            tr:last-child td { border-bottom: none; }
                            tr:hover { background: #f8fafc; }
                            a { color: #3b82f6; text-decoration: none; font-weight: 600; }
                            a:hover { text-decoration: underline; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h3>${report.title}</h3>
                            <p>Ingested via Gmail</p>
                        </div>
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        ${report.headers.map(h => `<th>${h}</th>`).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${report.rows.map(row => `
                                        <tr>
                                            ${report.headers.map(h => {
                                                const val = row[h] !== undefined ? row[h] : '';
                                                if (h === 'Link' && val) {
                                                    return `<td><a href="${val}" target="_blank" rel="noopener noreferrer">View Link</a></td>`;
                                                }
                                                return `<td>${val}</td>`;
                                            }).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </body>
                    </html>
                `;
                newWindow.document.write(tableHtml);
                newWindow.document.close();
            }
        } else if (report?.content) {
            const blob = new Blob([report.content], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } else {
            console.log(`Viewing: ${report?.title || report}`);
            alert(`No preview source available for this item.`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-8 animate-fade-in">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports Gallery</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Access and download your comprehensive PR reports, performance trackers, and analytics.</p>
            </div>

            {/* Custom Tab Selection Header */}
            <div className="flex border-b border-gray-200 dark:border-white/10 gap-8 mb-8 overflow-x-auto pb-1">
                <button
                    onClick={() => setSelectedTab('daily')}
                    className={`pb-4 text-sm font-semibold tracking-wide flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                        selectedTab === 'daily'
                            ? 'border-amber-500 text-amber-500 font-bold'
                            : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <BarChart2 size={16} />
                    <span>Daily Trackers</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                        selectedTab === 'daily'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-gray-100 dark:bg-[#1E293B] text-gray-500'
                    }`}>
                        {dailyList.length}
                    </span>
                </button>

                <button
                    onClick={() => setSelectedTab('weekly')}
                    className={`pb-4 text-sm font-semibold tracking-wide flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                        selectedTab === 'weekly'
                            ? 'border-blue-500 text-blue-500 font-bold'
                            : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <BarChart2 size={16} />
                    <span>Weekly Trackers</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                        selectedTab === 'weekly'
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-gray-100 dark:bg-[#1E293B] text-gray-500'
                    }`}>
                        {weeklyList.length}
                    </span>
                </button>

                <button
                    onClick={() => setSelectedTab('monthly')}
                    className={`pb-4 text-sm font-semibold tracking-wide flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                        selectedTab === 'monthly'
                            ? 'border-rose-500 text-rose-500 font-bold'
                            : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <BarChart2 size={16} />
                    <span>Monthly Trackers</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                        selectedTab === 'monthly'
                            ? 'bg-rose-500/10 text-rose-500'
                            : 'bg-gray-100 dark:bg-[#1E293B] text-gray-500'
                    }`}>
                        {monthlyList.length}
                    </span>
                </button>

                <button
                    onClick={() => setSelectedTab('annual')}
                    className={`pb-4 text-sm font-semibold tracking-wide flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                        selectedTab === 'annual'
                            ? 'border-purple-500 text-purple-500 font-bold'
                            : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <PieChart size={16} />
                    <span>Annual Reports</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                        selectedTab === 'annual'
                            ? 'bg-purple-500/10 text-purple-500'
                            : 'bg-gray-100 dark:bg-[#1E293B] text-gray-500'
                    }`}>
                        {annualReportsList.length}
                    </span>
                </button>

                <button
                    onClick={() => setSelectedTab('outreach')}
                    className={`pb-4 text-sm font-semibold tracking-wide flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                        selectedTab === 'outreach'
                            ? 'border-emerald-500 text-emerald-500 font-bold'
                            : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <FileText size={16} />
                    <span>Outreach Pipelines</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                        selectedTab === 'outreach'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-gray-100 dark:bg-[#1E293B] text-gray-500'
                    }`}>
                        {outreachList.length}
                    </span>
                </button>
            </div>

            {/* Dynamic Grid Display */}
            {activeList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#111827] rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.02)] p-8">
                    <FileText size={48} className="text-gray-300 dark:text-gray-700 mb-4 animate-pulse" />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        No Documents Published
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-2 font-medium">
                        Your account manager hasn't published any documents in this category for {clientName} yet.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {activeList.map((report) => (
                        <div key={report.id} className="bg-white dark:bg-[#111827] rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col transition-transform hover:-translate-y-1 animate-fade-in">
                            <div className={`p-6 flex items-center justify-center border-b border-[#EAE8E4] dark:border-white/10 ${report.bg}`}>
                                <report.icon size={48} className={report.color} />
                            </div>

                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                                        {report.type}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        <Calendar size={12} /> {report.date}
                                    </span>
                                </div>

                                <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-2 leading-tight flex-1">
                                    {report.title}
                                </h3>

                                <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-6 flex justify-between font-medium">
                                    <span>Size: {report.size}</span>
                                    <span>By: {report.uploadedBy}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-auto">
                                    <button
                                        onClick={() => handleView(report)}
                                        className="flex items-center justify-center gap-2 py-2 bg-gray-100 dark:bg-[#374151] hover:bg-gray-200 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-semibold transition-colors border border-gray-200/50 dark:border-gray-800/50 cursor-pointer"
                                    >
                                        <Eye size={14} /> View
                                    </button>
                                    <button
                                        onClick={() => handleDownload(report)}
                                        className="flex items-center justify-center gap-2 py-2 bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] hover:opacity-90 text-amber-500 dark:text-amber-400 border border-amber-500/30 hover:border-amber-500 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                        <Download size={14} /> Download
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Reports;
