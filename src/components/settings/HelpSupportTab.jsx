import React, { useState } from 'react';
import {
    Search,
    MessageSquare,
    Lightbulb,
    Mail,
    User,
    Plus,
    ChevronDown,
    ChevronUp,
    Upload,
    CheckCircle,
    Loader2
} from 'lucide-react';

const HelpSupportTab = () => {
    // FAQ State
    const [openFaq, setOpenFaq] = useState(null);

    // Form States
    const [issueForm, setIssueForm] = useState({ category: '', title: '', description: '', priority: 'Medium' });
    const [featureForm, setFeatureForm] = useState({ title: '', description: '', reason: '', benefit: '' });

    // Submission States
    const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
    const [issueSuccess, setIssueSuccess] = useState(false);
    const [isSubmittingFeature, setIsSubmittingFeature] = useState(false);
    const [featureSuccess, setFeatureSuccess] = useState(false);

    const faqs = [
        { id: 1, question: 'How do I upgrade my plan?', answer: 'Navigate to the "Billing & Subscription" tab in Settings. Choose your desired tier and click "Upgrade".' },
        { id: 2, question: 'Why is some data locked?', answer: 'Certain advanced analytics and reports are exclusive to Pro and Enterprise plans. Upgrade to unlock these features.' },
        { id: 3, question: 'How often are events updated?', answer: 'Event tracking is updated in real-time as our system scrapes and processes new information.' },
        { id: 4, question: 'How can I export my reports?', answer: 'Go to the "Reports" page and click the "Export" button in the top right. You can select PDF or CSV formats depending on your plan.' }
    ];

    const supportContacts = [
        { name: 'Pooja Rana', role: 'Support Team Lead', email: 'pooja.r@visionarymedia.com' },
        { name: 'Satyam Kumar Singh', role: 'Technical Support', email: 'satyam.s@visionarymedia.com' },
        { name: 'Divyansh Sharma', role: 'Account Details', email: 'divyansh.s@visionarymedia.com' },
        { name: 'Arun Kumar', role: 'Billing Support', email: 'arun.k@visionarymedia.com' }
    ];

    const handleIssueSubmit = (e) => {
        e.preventDefault();
        setIsSubmittingIssue(true);
        // Simulate API call
        setTimeout(() => {
            setIsSubmittingIssue(false);
            setIssueSuccess(true);
            setIssueForm({ category: '', title: '', description: '', priority: 'Medium' });
            setTimeout(() => setIssueSuccess(false), 4000);
        }, 1200);
    };

    const handleFeatureSubmit = (e) => {
        e.preventDefault();
        setIsSubmittingFeature(true);
        // Simulate API call
        setTimeout(() => {
            setIsSubmittingFeature(false);
            setFeatureSuccess(true);
            setFeatureForm({ title: '', description: '', reason: '', benefit: '' });
            setTimeout(() => setFeatureSuccess(false), 4000);
        }, 1200);
    };

    return (
        <div className="p-6 md:p-8 space-y-12">
            {/* Header & Search */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Help & Support</h2>
                <div className="relative max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search for help topics..."
                        className="w-full pl-12 pr-4 py-3 bg-[#FDFBF7] dark:bg-[#0F172A] border border-[#EAE8E4] dark:border-slate-800 text-gray-900 dark:text-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* 1. Report an Issue */}
                <div className="bg-[#FDFBF7] dark:bg-[#1E293B] p-6 rounded-2xl border border-[#EAE8E4] dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-6">
                        <MessageSquare className="text-rose-500" size={24} />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Report a Platform Issue</h3>
                    </div>

                    <form onSubmit={handleIssueSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Issue Category *</label>
                            <select
                                required
                                value={issueForm.category}
                                onChange={(e) => setIssueForm({ ...issueForm, category: e.target.value })}
                                className="w-full bg-white dark:bg-[#0F172A] border border-[#EAE8E4] dark:border-slate-800 text-gray-900 dark:text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
                            >
                                <option value="" disabled>Select category...</option>
                                <option value="bug">Bug / Technical Issue</option>
                                <option value="error">Dashboard Error</option>
                                <option value="payment">Payment Issue</option>
                                <option value="data">Data Mismatch</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Issue Title *</label>
                            <input
                                required
                                type="text"
                                placeholder="E.g., Dashboard not loading data"
                                value={issueForm.title}
                                onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                                className="w-full bg-white dark:bg-[#0F172A] border border-[#EAE8E4] dark:border-slate-800 text-gray-900 dark:text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Detailed Description *</label>
                            <textarea
                                required
                                rows={4}
                                placeholder="Please describe what happened, steps to reproduce, etc."
                                value={issueForm.description}
                                onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                                className="w-full bg-white dark:bg-[#0F172A] border border-[#EAE8E4] dark:border-slate-800 text-gray-900 dark:text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-all resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Priority Level</label>
                                <select
                                    value={issueForm.priority}
                                    onChange={(e) => setIssueForm({ ...issueForm, priority: e.target.value })}
                                    className="w-full bg-white dark:bg-[#0F172A] border border-[#EAE8E4] dark:border-slate-800 text-gray-900 dark:text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High (Critical)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2 text-transparent select-none">Attachment</label>
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-center gap-2 bg-white dark:bg-[#0F172A] border border-dashed border-[#EAE8E4] dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 hover:border-cyan-500 rounded-xl px-4 py-3 transition-colors font-medium"
                                >
                                    <Upload size={18} />
                                    <span>Attach Screenshot</span>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmittingIssue}
                            className="w-full mt-4 flex items-center justify-center gap-2 px-5 py-3 bg-[#1A1A1A] dark:bg-cyan-500 text-white dark:text-[#0B0F19] hover:bg-black dark:hover:bg-cyan-400 text-sm font-bold rounded-xl transition-colors shadow-sm disabled:opacity-70"
                        >
                            {isSubmittingIssue ? <Loader2 className="animate-spin" size={20} /> : 'Submit Issue'}
                        </button>
                    </form>
                </div>

                {/* 2. Request a Feature */}
                <div className="bg-[#FDFBF7] dark:bg-[#1E293B] p-6 rounded-2xl border border-[#EAE8E4] dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-6">
                        <Lightbulb className="text-amber-500" size={24} />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Request a New Feature</h3>
                    </div>

                    <form onSubmit={handleFeatureSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Feature Title *</label>
                            <input
                                required
                                type="text"
                                placeholder="Brief name for your idea"
                                value={featureForm.title}
                                onChange={(e) => setFeatureForm({ ...featureForm, title: e.target.value })}
                                className="w-full bg-white dark:bg-[#0F172A] border border-[#EAE8E4] dark:border-slate-800 text-gray-900 dark:text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Feature Description *</label>
                            <textarea
                                required
                                rows={3}
                                placeholder="How exactly should this feature work?"
                                value={featureForm.description}
                                onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })}
                                className="w-full bg-white dark:bg-[#0F172A] border border-[#EAE8E4] dark:border-slate-800 text-gray-900 dark:text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-all resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Why is this important? <span className="text-gray-400 font-normal">(Optional)</span></label>
                            <input
                                type="text"
                                placeholder="What problem does it solve for you?"
                                value={featureForm.reason}
                                onChange={(e) => setFeatureForm({ ...featureForm, reason: e.target.value })}
                                className="w-full bg-white dark:bg-[#0F172A] border border-[#EAE8E4] dark:border-slate-800 text-gray-900 dark:text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Expected Benefit *</label>
                            <select
                                required
                                value={featureForm.benefit}
                                onChange={(e) => setFeatureForm({ ...featureForm, benefit: e.target.value })}
                                className="w-full bg-white dark:bg-[#0F172A] border border-[#EAE8E4] dark:border-slate-800 text-gray-900 dark:text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
                            >
                                <option value="" disabled>Select expected benefit...</option>
                                <option value="efficiency">Efficiency / Speed</option>
                                <option value="analytics">Better Analytics</option>
                                <option value="automation">Automation</option>
                                <option value="reporting">New Reporting Metrics</option>
                                <option value="integration">Custom Integration</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmittingFeature}
                            className="w-full mt-4 flex items-center justify-center gap-2 px-5 py-3 bg-[#1A1A1A] dark:bg-cyan-500 text-white dark:text-[#0B0F19] hover:bg-black dark:hover:bg-cyan-400 text-sm font-bold rounded-xl transition-colors shadow-sm disabled:opacity-70"
                        >
                            {isSubmittingFeature ? <Loader2 className="animate-spin" size={20} /> : 'Submit Request'}
                        </button>
                    </form>
                </div>
            </div>

            {/* 3. Support Contacts */}
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <User className="text-emerald-500" size={24} />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Support Contacts</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {supportContacts.map((contact, index) => (
                        <div key={index} className="flex items-center justify-between bg-white dark:bg-[#1E293B] border border-[#EAE8E4] dark:border-slate-800 p-5 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg dark:hover:border-slate-600">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 flex items-center justify-center font-bold text-lg border border-cyan-200 dark:border-cyan-500/20">
                                    {contact.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{contact.name}</h4>
                                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{contact.role}</p>
                                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{contact.email}</p>
                                </div>
                            </div>
                            <button className="p-3 text-gray-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 rounded-xl transition-colors">
                                <Mail size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* FAQs Accordion */}
            <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Frequently Asked Questions</h3>
                <div className="space-y-3">
                    {faqs.map((faq) => (
                        <div key={faq.id} className="border border-[#EAE8E4] dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-[#1E293B] transition-all">
                            <button
                                className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
                                onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                            >
                                <span className="font-bold text-gray-900 dark:text-white">{faq.question}</span>
                                {openFaq === faq.id ? (
                                    <ChevronUp className="text-gray-500 dark:text-slate-400 flex-shrink-0 ml-4" size={20} />
                                ) : (
                                    <ChevronDown className="text-gray-500 dark:text-slate-400 flex-shrink-0 ml-4" size={20} />
                                )}
                            </button>
                            <div className={`px-6 pb-4 text-gray-600 dark:text-slate-300 font-medium ${openFaq === faq.id ? 'block' : 'hidden'}`}>
                                {faq.answer}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Toasts */}
            {issueSuccess && (
                <div className="fixed bottom-6 right-6 bg-[#1A1A1A] dark:bg-emerald-500 text-white dark:text-[#0B0F19] px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
                    <CheckCircle className="text-emerald-400 dark:text-[#0B0F19]" size={20} />
                    <div>
                        <span className="font-bold block">Issue Submitted</span>
                        <span className="text-sm opacity-90">Your issue has been submitted successfully.</span>
                    </div>
                </div>
            )}

            {featureSuccess && (
                <div className="fixed bottom-6 right-6 bg-[#1A1A1A] dark:bg-cyan-500 text-white dark:text-[#0B0F19] px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
                    <CheckCircle className="text-cyan-400 dark:text-[#0B0F19]" size={20} />
                    <div>
                        <span className="font-bold block">Feature Requested</span>
                        <span className="text-sm opacity-90">We've received your request. Thanks for the feedback!</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HelpSupportTab;
