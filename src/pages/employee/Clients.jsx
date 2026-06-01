import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, 
    Upload, 
    CheckCircle2, 
    ChevronDown, 
    AlertCircle, 
    Sparkles, 
    Send, 
    FileText, 
    CheckSquare, 
    Trash2, 
    Clock,
    Layers,
    FileSpreadsheet,
    FileCheck
} from 'lucide-react';

const CLIENTS = ["Acura Corporate", "RedBull Racing", "Spotify", "Vercel", "Nike"];

export default function Clients() {
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedSections, setSelectedSections] = useState({
        pressReleases: false,
        tracker: false,
        annualReport: false,
        outreach: false,
        overallWork: false
    });

    // Files state
    const [files, setFiles] = useState({
        pressReleases: null,
        tracker: null,
        annualReport: null,
        outreach: null
    });

    // Submissions details state
    const [sectionData, setSectionData] = useState({
        pressReleases: null,
        tracker: null,
        annualReport: null,
        outreach: null,
        overallWork: null
    });

    const [overallText, setOverallText] = useState('');
    
    // UI feedback states
    const [uploadingState, setUploadingState] = useState({});
    const [submittingNotes, setSubmittingNotes] = useState(false);
    const [masterSubmitting, setMasterSubmitting] = useState(false);
    const [notification, setNotification] = useState(null);
    const [recentUpdates, setRecentUpdates] = useState([]);

    // Load recent updates from localStorage with schema validation
    useEffect(() => {
        const stored = localStorage.getItem('anexar_client_updates');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    // Map and normalize each entry to guarantee existence of sectionsSubmitted array
                    const validated = parsed.map(item => ({
                        id: item.id || 'upd_' + Math.random().toString(36).substring(2, 9),
                        client: item.client || 'Unknown Client',
                        timestamp: item.timestamp || new Date().toLocaleString(),
                        sectionsSubmitted: Array.isArray(item.sectionsSubmitted) ? item.sectionsSubmitted : [],
                        data: item.data || {}
                    }));
                    setRecentUpdates(validated);
                }
            } catch (e) {
                console.error("Failed to parse local storage updates:", e);
            }
        }
    }, []);

    // Helper to trigger temporary notifications
    const triggerNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleCheckboxChange = (section) => {
        setSelectedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const handleFileChange = (section, e) => {
        const file = e.target.files[0];
        if (file) {
            setFiles(prev => ({
                ...prev,
                [section]: file
            }));
        }
    };

    // Simulate individual file upload submission
    const handleIndividualSubmit = (section) => {
        const file = files[section];
        if (!file) {
            triggerNotification(`Please choose a file for ${section.replace(/([A-Z])/g, ' $1')} before submitting.`, 'error');
            return;
        }

        setUploadingState(prev => ({ ...prev, [section]: true }));

        // Simulate upload progress
        setTimeout(() => {
            setUploadingState(prev => ({ ...prev, [section]: false }));
            setSectionData(prev => ({
                ...prev,
                [section]: {
                    fileName: file.name,
                    fileSize: (file.size / 1024).toFixed(1) + ' KB',
                    timestamp: new Date().toLocaleTimeString()
                }
            }));
            triggerNotification(`${section.replace(/([A-Z])/g, ' $1')} uploaded successfully!`, 'success');
        }, 1500);
    };

    // Submit Overall Work notes
    const handleNotesSubmit = () => {
        if (!overallText.trim()) {
            triggerNotification('Please enter some updates or notes before submitting.', 'error');
            return;
        }

        setSubmittingNotes(true);

        setTimeout(() => {
            setSubmittingNotes(false);
            setSectionData(prev => ({
                ...prev,
                overallWork: {
                    text: overallText,
                    timestamp: new Date().toLocaleTimeString()
                }
            }));
            triggerNotification('Overall Work updates submitted successfully!', 'success');
        }, 1000);
    };

    // Delete a submitted section from pending master update
    const handleDeleteSectionData = (section) => {
        setSectionData(prev => ({
            ...prev,
            [section]: null
        }));
        if (section !== 'overallWork') {
            setFiles(prev => ({
                ...prev,
                [section]: null
            }));
        } else {
            setOverallText('');
        }
        triggerNotification(`Cleared data for ${section.replace(/([A-Z])/g, ' $1')}`, 'info');
    };

    // Verify if all checked sections are submitted
    const isReadyForMasterSubmit = () => {
        const activeSections = Object.keys(selectedSections).filter(key => selectedSections[key]);
        if (activeSections.length === 0) return false;
        
        // Ensure every checked section has data submitted
        return activeSections.every(section => sectionData[section] !== null);
    };

    // Master Submit action
    const handleMasterSubmit = () => {
        if (!selectedClient) {
            triggerNotification('Please select a client first.', 'error');
            return;
        }

        if (!isReadyForMasterSubmit()) {
            triggerNotification('Please submit all checked individual sections before master submission.', 'error');
            return;
        }

        setMasterSubmitting(true);

        setTimeout(() => {
            // Build the update object
            const activeSections = Object.keys(selectedSections).filter(key => selectedSections[key]);
            const finalUpdate = {
                id: 'upd_' + Math.random().toString(36).substring(2, 9),
                client: selectedClient,
                timestamp: new Date().toLocaleString(),
                sectionsSubmitted: activeSections,
                data: {
                    pressReleases: selectedSections.pressReleases ? sectionData.pressReleases : null,
                    tracker: selectedSections.tracker ? sectionData.tracker : null,
                    annualReport: selectedSections.annualReport ? sectionData.annualReport : null,
                    outreach: selectedSections.outreach ? sectionData.outreach : null,
                    overallWork: selectedSections.overallWork ? sectionData.overallWork : null
                }
            };

            const existingUpdates = JSON.parse(localStorage.getItem('anexar_client_updates') || '[]');
            const updatedList = [finalUpdate, ...existingUpdates];
            localStorage.setItem('anexar_client_updates', JSON.stringify(updatedList));

            // Reset Form State
            setSelectedClient('');
            setSelectedSections({
                pressReleases: false,
                tracker: false,
                annualReport: false,
                outreach: false,
                overallWork: false
            });
            setFiles({
                pressReleases: null,
                tracker: null,
                annualReport: null,
                outreach: null
            });
            setSectionData({
                pressReleases: null,
                tracker: null,
                annualReport: null,
                outreach: null,
                overallWork: null
            });
            setOverallText('');
            setRecentUpdates(updatedList);
            setMasterSubmitting(false);

            triggerNotification(`Master client update for ${finalUpdate.client} has been published successfully!`, 'success');
        }, 2000);
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto font-sans pb-12 text-slate-900 dark:text-slate-100 animate-fade-in">
            {/* Header banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 to-purple-600/10 rounded-3xl p-8 border border-amber-500/20 shadow-xl">
                <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <span className="px-2.5 py-0.5 bg-amber-500/15 text-amber-500 rounded-full text-4xs font-extrabold uppercase tracking-widest">
                            Manager Workspace
                        </span>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                            Client Updates & Submissions
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium">
                            Onboard files, compile weekly trackings, and push real-time campaign updates directly to the client's dashboard.
                        </p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center shrink-0 w-12 h-12">
                        <Users className="text-amber-500" size={24} />
                    </div>
                </div>
            </div>

            {/* Notification alert */}
            <AnimatePresence>
                {notification && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`p-4 rounded-2xl flex items-center gap-3 border shadow-md font-medium text-xs ${
                            notification.type === 'success' 
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                                : notification.type === 'error'
                                ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-400'
                                : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}
                    >
                        {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span>{notification.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Setup Options */}
                <div className="space-y-6 lg:col-span-1">
                    <Card className="border-none shadow-md bg-white dark:bg-slate-950 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                            <Layers size={18} className="text-amber-500" />
                            Update Configuration
                        </h2>

                        {/* Select Your Client */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Select Your Client
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedClient}
                                    onChange={(e) => {
                                        setSelectedClient(e.target.value);
                                        // Reset files/sub-submissions if client changes
                                        setFiles({ pressReleases: null, tracker: null, annualReport: null, outreach: null });
                                        setSectionData({ pressReleases: null, tracker: null, annualReport: null, outreach: null, overallWork: null });
                                        setOverallText('');
                                    }}
                                    className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium cursor-pointer"
                                >
                                    <option value="">-- Choose Client --</option>
                                    {CLIENTS.map((client) => (
                                        <option key={client} value={client}>{client}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        {/* Checkboxes List */}
                        {selectedClient && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-8 space-y-4 pt-6 border-t border-slate-100 dark:border-slate-900"
                            >
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                                    Select Sections to Update
                                </label>
                                
                                {Object.keys(selectedSections).map((key) => {
                                    const formattedName = key === 'pressReleases' ? 'Press Releases'
                                                        : key === 'tracker' ? 'Daily/Monthly Tracker'
                                                        : key === 'annualReport' ? 'Annual Report'
                                                        : key === 'outreach' ? 'Outreach'
                                                        : 'Overall Work';

                                    return (
                                        <label 
                                            key={key} 
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                                                selectedSections[key] 
                                                    ? 'bg-amber-50/20 dark:bg-amber-500/5 border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold' 
                                                    : 'bg-transparent border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedSections[key]}
                                                onChange={() => handleCheckboxChange(key)}
                                                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 cursor-pointer"
                                            />
                                            <span className="text-xs">{formattedName}</span>
                                        </label>
                                    );
                                })}
                            </motion.div>
                        )}
                    </Card>

                    {/* Master Submit Card */}
                    {selectedClient && Object.values(selectedSections).some(v => v) && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <Card className="border-none shadow-md bg-gradient-to-tr from-slate-900 to-slate-950 dark:from-slate-950 dark:to-slate-990 rounded-3xl p-6 text-white border border-slate-800">
                                <h3 className="text-md font-bold mb-2 flex items-center gap-2">
                                    <Sparkles size={16} className="text-amber-400" />
                                    Publish Updates
                                </h3>
                                <p className="text-3xs text-slate-400 leading-relaxed mb-6 font-medium">
                                    Once all checked sections show a submitted state, hit Master Submit to compile and sync.
                                </p>

                                <button
                                    onClick={handleMasterSubmit}
                                    disabled={!isReadyForMasterSubmit() || masterSubmitting}
                                    className={`w-full py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                        isReadyForMasterSubmit() && !masterSubmitting
                                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                                            : 'bg-slate-850 text-slate-500 cursor-not-allowed border border-slate-800'
                                    }`}
                                >
                                    {masterSubmitting ? (
                                        <>
                                            <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                            <span>Publishing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={14} />
                                            <span>Master Submit</span>
                                        </>
                                    )}
                                </button>
                            </Card>
                        </motion.div>
                    )}
                </div>

                {/* Right Column - Workspaces / Forms */}
                <div className="space-y-6 lg:col-span-2">
                    {!selectedClient ? (
                        <Card className="border-none shadow-md bg-white dark:bg-slate-950 rounded-3xl p-8 text-center text-slate-400 dark:text-slate-600 flex flex-col items-center justify-center py-20 border border-slate-100 dark:border-slate-900">
                            <Users size={48} className="mb-4 text-slate-300 dark:text-slate-700" />
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">
                                Setup Required
                            </h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mt-2 font-medium">
                                Select a client from the dropdown configuration list on the left to start compiling updates.
                            </p>
                        </Card>
                    ) : !Object.values(selectedSections).some(v => v) ? (
                        <Card className="border-none shadow-md bg-white dark:bg-slate-950 rounded-3xl p-8 text-center text-slate-400 dark:text-slate-600 flex flex-col items-center justify-center py-20 border border-slate-100 dark:border-slate-900">
                            <CheckSquare size={48} className="mb-4 text-slate-300 dark:text-slate-700" />
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">
                                Select Sections
                            </h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mt-2 font-medium">
                                Choose one or more update sections (e.g. Press Releases, Overall Work) to show upload forms.
                            </p>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            <AnimatePresence>
                                {/* Press Releases Upload */}
                                {selectedSections.pressReleases && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                    >
                                        <SectionUploadCard
                                            title="Press Releases"
                                            description="Upload news templates, PR drafts, or media release kits."
                                            sectionKey="pressReleases"
                                            file={files.pressReleases}
                                            submittedData={sectionData.pressReleases}
                                            uploading={uploadingState.pressReleases}
                                            onFileChange={(e) => handleFileChange('pressReleases', e)}
                                            onSubmit={() => handleIndividualSubmit('pressReleases')}
                                            onDelete={() => handleDeleteSectionData('pressReleases')}
                                        />
                                    </motion.div>
                                )}

                                {/* Daily/Monthly Tracker */}
                                {selectedSections.tracker && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                    >
                                        <SectionUploadCard
                                            title="Daily/Monthly Tracker"
                                            description="Upload tracking spreadsheets containing daily logs and stats."
                                            sectionKey="tracker"
                                            file={files.tracker}
                                            submittedData={sectionData.tracker}
                                            uploading={uploadingState.tracker}
                                            onFileChange={(e) => handleFileChange('tracker', e)}
                                            onSubmit={() => handleIndividualSubmit('tracker')}
                                            onDelete={() => handleDeleteSectionData('tracker')}
                                        />
                                    </motion.div>
                                )}

                                {/* Annual Report */}
                                {selectedSections.annualReport && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                    >
                                        <SectionUploadCard
                                            title="Annual Report"
                                            description="Upload comprehensive annual strategy, outcomes, or financial sheets."
                                            sectionKey="annualReport"
                                            file={files.annualReport}
                                            submittedData={sectionData.annualReport}
                                            uploading={uploadingState.annualReport}
                                            onFileChange={(e) => handleFileChange('annualReport', e)}
                                            onSubmit={() => handleIndividualSubmit('annualReport')}
                                            onDelete={() => handleDeleteSectionData('annualReport')}
                                        />
                                    </motion.div>
                                )}

                                {/* Outreach */}
                                {selectedSections.outreach && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                    >
                                        <SectionUploadCard
                                            title="Outreach"
                                            description="Upload journalist lists, campaign contacts, or outreach progress reports."
                                            sectionKey="outreach"
                                            file={files.outreach}
                                            submittedData={sectionData.outreach}
                                            uploading={uploadingState.outreach}
                                            onFileChange={(e) => handleFileChange('outreach', e)}
                                            onSubmit={() => handleIndividualSubmit('outreach')}
                                            onDelete={() => handleDeleteSectionData('outreach')}
                                        />
                                    </motion.div>
                                )}

                                {/* Overall Work Section */}
                                {selectedSections.overallWork && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                    >
                                        <Card className="border-none shadow-md bg-white dark:bg-slate-950 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                                            <div className="flex justify-between items-start gap-4 mb-4">
                                                <div>
                                                    <h3 className="text-md font-bold text-slate-900 dark:text-white">Overall Work</h3>
                                                    <p className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                                                        Summarize key achievements, weekly briefs, or updates on the accounts.
                                                    </p>
                                                </div>
                                                {sectionData.overallWork && (
                                                    <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-3xs font-extrabold uppercase tracking-wider rounded-full flex items-center gap-1.5 border border-emerald-250/20">
                                                        <FileCheck size={10} /> Submitted
                                                    </span>
                                                )}
                                            </div>

                                            {sectionData.overallWork ? (
                                                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-850 space-y-4">
                                                    <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed font-semibold italic">
                                                        "{sectionData.overallWork.text}"
                                                    </p>
                                                    <div className="flex justify-between items-center text-3xs text-slate-400 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                                                        <span>Logged at {sectionData.overallWork.timestamp}</span>
                                                        <button 
                                                            onClick={() => handleDeleteSectionData('overallWork')}
                                                            className="text-red-500 hover:text-red-600 flex items-center gap-1 cursor-pointer font-bold uppercase tracking-wider"
                                                        >
                                                            <Trash2 size={10} /> Clear
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <textarea
                                                        value={overallText}
                                                        onChange={(e) => setOverallText(e.target.value)}
                                                        placeholder="Enter update notes or notes describing the overall progress on this account..."
                                                        rows={4}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium text-xs"
                                                    />

                                                    <button
                                                        onClick={handleNotesSubmit}
                                                        disabled={submittingNotes || !overallText.trim()}
                                                        className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                                            overallText.trim() && !submittingNotes
                                                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md'
                                                                : 'bg-slate-100 dark:bg-slate-900 text-slate-450 dark:text-slate-600 cursor-not-allowed border border-slate-200/40 dark:border-slate-800/40'
                                                        }`}
                                                    >
                                                        {submittingNotes ? (
                                                            <>
                                                                <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                                <span>Submitting Update...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Send size={12} />
                                                                <span>Submit Overall Work Update</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </Card>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent submissions logs table at bottom */}
            {recentUpdates.length > 0 && (
                <Card className="border-none shadow-md bg-white dark:bg-slate-950 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                    <h2 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                        <Clock size={16} className="text-amber-500" />
                        Recent Master Submissions (Real-time Synced Log)
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-150 dark:border-slate-850 text-slate-450 dark:text-slate-650 uppercase font-black tracking-wider text-[10px]">
                                    <th className="py-3 px-4">Client</th>
                                    <th className="py-3 px-4">Published At</th>
                                    <th className="py-3 px-4">Submitted Sections</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentUpdates.map((update) => (
                                    <tr key={update.id} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                                        <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">{update.client}</td>
                                        <td className="py-3.5 px-4 font-medium text-slate-500 dark:text-slate-400">{update.timestamp}</td>
                                        <td className="py-3.5 px-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {(update.sectionsSubmitted || []).map((sec) => (
                                                    <span key={sec} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-650 dark:text-slate-405 rounded text-[10px] font-semibold border border-slate-200/30 dark:border-slate-805">
                                                        {sec === 'pressReleases' ? 'PR'
                                                         : sec === 'tracker' ? 'Tracker'
                                                         : sec === 'annualReport' ? 'Annual Report'
                                                         : sec === 'outreach' ? 'Outreach'
                                                         : 'Notes'}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <button 
                                                onClick={() => {
                                                    const updatedList = recentUpdates.filter(u => u.id !== update.id);
                                                    localStorage.setItem('anexar_client_updates', JSON.stringify(updatedList));
                                                    setRecentUpdates(updatedList);
                                                    triggerNotification('Submissions history deleted', 'info');
                                                }}
                                                className="text-red-500 hover:text-red-600 cursor-pointer font-semibold uppercase tracking-wider text-[10px]"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}

// Inner Component for File Upload Sections
function SectionUploadCard({ title, description, sectionKey, file, submittedData, uploading, onFileChange, onSubmit, onDelete }) {
    const formattedInputId = `file_input_${sectionKey}`;

    return (
        <Card className="border-none shadow-md bg-white dark:bg-slate-950 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start gap-4 mb-4">
                <div>
                    <h3 className="text-md font-bold text-slate-900 dark:text-white">{title}</h3>
                    <p className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">{description}</p>
                </div>
                {submittedData && (
                    <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-3xs font-extrabold uppercase tracking-wider rounded-full flex items-center gap-1.5 border border-emerald-250/20">
                        <FileCheck size={10} /> Submitted
                    </span>
                )}
            </div>

            {submittedData ? (
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-850 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0 border border-emerald-200/30">
                            <FileSpreadsheet size={16} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-850 dark:text-slate-205 truncate max-w-xs">{submittedData.fileName}</p>
                            <p className="text-4xs text-slate-400 font-semibold">{submittedData.fileSize} • Uploaded at {submittedData.timestamp}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onDelete}
                        className="text-red-500 hover:text-red-600 flex items-center gap-1 cursor-pointer text-[10px] font-bold uppercase tracking-wider hover:scale-105 transition-all shrink-0"
                    >
                        <Trash2 size={12} /> Clear
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Drag and Drop Box */}
                    <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors relative">
                        <input
                            type="file"
                            id={formattedInputId}
                            onChange={onFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <Upload size={20} className="text-slate-400 mb-2" />
                        <span className="text-2xs text-slate-600 dark:text-slate-400 font-bold">
                            {file ? file.name : "Select or drag file here"}
                        </span>
                        <span className="text-4xs text-slate-400 mt-1">PDF, DOCX, XLSX up to 10MB</span>
                    </div>

                    <button
                        onClick={onSubmit}
                        disabled={uploading || !file}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            file && !uploading
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md'
                                : 'bg-slate-100 dark:bg-slate-900 text-slate-450 dark:text-slate-600 cursor-not-allowed border border-slate-200/40 dark:border-slate-800/40'
                        }`}
                    >
                        {uploading ? (
                            <>
                                <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                <span>Uploading file...</span>
                            </>
                        ) : (
                            <>
                                <Upload size={12} />
                                <span>Submit {title}</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </Card>
    );
}
