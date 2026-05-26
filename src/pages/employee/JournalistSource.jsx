import React, { useState } from 'react';
import { 
    Search, 
    Mail, 
    Phone, 
    MapPin, 
    Building2, 
    Tag, 
    Plus, 
    User, 
    Copy, 
    Check, 
    Sparkles,
    Trash2,
    X,
    Filter
} from 'lucide-react';

const INITIAL_JOURNALISTS = [
    {
        id: '1',
        name: 'Sarah Jenkins',
        role: 'Senior Technology Editor',
        publication: 'TechCrunch',
        category: 'Technology & Startups',
        email: 's.jenkins@techcrunch.com',
        phone: '+1 (555) 234-5678',
        address: 'Silicon Valley Bureau, San Francisco, CA',
        bio: 'Covers early-stage SaaS, AI innovations, and venture capital funding rounds across North America.'
    },
    {
        id: '2',
        name: 'David Chen',
        role: 'Financial Correspondent',
        publication: 'Bloomberg News',
        category: 'Finance & Markets',
        email: 'david.chen@bloomberg.net',
        phone: '+1 (555) 876-5432',
        address: 'Bloomberg Tower, New York, NY',
        bio: 'Specializes in macroeconomic policy, central banking, currency markets, and corporate mergers.'
    },
    {
        id: '3',
        name: 'Elena Rostova',
        role: 'Senior Business Reporter',
        publication: 'Forbes',
        category: 'Business & Leadership',
        email: 'e.rostova@forbes.com',
        phone: '+44 20 7946 0958',
        address: 'London Office, United Kingdom',
        bio: 'Focuses on global enterprise leaders, next-generation founders, and corporate social responsibility.'
    },
    {
        id: '4',
        name: 'Marcus Vance',
        role: 'Features Editor',
        publication: 'Wired',
        category: 'AI & Tech Ethics',
        email: 'marcus.vance@wired.com',
        phone: '+1 (555) 432-1098',
        address: 'SOMA District, San Francisco, CA',
        bio: 'Writes long-form investigative reports on cybersecurity, artificial intelligence, and digital privacy policies.'
    }
];

export default function JournalistSource() {
    const [journalists, setJournalists] = useState(INITIAL_JOURNALISTS);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState(INITIAL_JOURNALISTS[0].id);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
    
    // Modal & copy states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [copiedField, setCopiedField] = useState(null);
    
    // Form state
    const [newJournalist, setNewJournalist] = useState({
        name: '',
        role: '',
        publication: '',
        category: 'Technology & Startups',
        email: '',
        phone: '',
        address: '',
        bio: ''
    });

    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleAddJournalist = (e) => {
        e.preventDefault();
        if (!newJournalist.name || !newJournalist.email) return;
        
        const added = {
            ...newJournalist,
            id: Date.now().toString()
        };
        
        setJournalists([added, ...journalists]);
        setSelectedId(added.id);
        setIsAddModalOpen(false);
        setNewJournalist({
            name: '',
            role: '',
            publication: '',
            category: 'Technology & Startups',
            email: '',
            phone: '',
            address: '',
            bio: ''
        });
    };

    const handleDeleteJournalist = (id) => {
        const remaining = journalists.filter(j => j.id !== id);
        setJournalists(remaining);
        if (selectedId === id && remaining.length > 0) {
            setSelectedId(remaining[0].id);
        }
    };

    // Filter logic
    const filteredJournalists = journalists.filter(j => {
        const matchesSearch = j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            j.publication.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            j.role.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategoryFilter === 'All' || j.category === selectedCategoryFilter;
        return matchesSearch && matchesCategory;
    });

    const selectedJournalist = journalists.find(j => j.id === selectedId) || filteredJournalists[0] || null;

    const categories = ['All', ...Array.from(new Set(journalists.map(j => j.category)))];

    return (
        <div className="space-y-6 max-w-6xl mx-auto px-4 py-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                        Journalist Directory
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Search, filter, and manage media contacts for your campaign outreach.
                    </p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer self-start md:self-auto"
                >
                    <Plus className="h-5 w-5" />
                    <span>Add Journalist</span>
                </button>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Side: Search & Directory List */}
                <div className="lg:col-span-5 space-y-4">
                    
                    {/* Search and filter controls */}
                    <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4.5 w-4.5" />
                            <input
                                type="text"
                                placeholder="Search by name, outlet, or title..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                            />
                        </div>

                        {/* Category Badges Filter */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            <Filter className="h-4 w-4 text-gray-400 shrink-0" />
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategoryFilter(cat)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                        selectedCategoryFilter === cat
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Directory List Container */}
                    <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden max-h-[500px] overflow-y-auto">
                        {filteredJournalists.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>No journalists found matching your search.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
                                {filteredJournalists.map((j) => (
                                    <div
                                        key={j.id}
                                        onClick={() => setSelectedId(j.id)}
                                        className={`p-4 flex items-center justify-between transition-all duration-250 cursor-pointer group ${
                                            selectedId === j.id
                                                ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-l-4 border-indigo-600'
                                                : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105 ${
                                                selectedId === j.id 
                                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                                                    : 'bg-gradient-to-br from-slate-400 to-slate-500'
                                            }`}>
                                                {j.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {j.name}
                                                </h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {j.role} • <span className="font-medium text-indigo-500 dark:text-indigo-400">{j.publication}</span>
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteJournalist(j.id);
                                            }}
                                            className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 cursor-pointer shrink-0"
                                            title="Delete Contact"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: High Fidelity Profile View */}
                <div className="lg:col-span-7">
                    {selectedJournalist ? (
                        <div className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl p-8 shadow-xl transition-all duration-300">
                            {/* Decorative gradient blur background inside the profile */}
                            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-3xl" />
                            
                            {/* Profile Header */}
                            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5 border-b border-gray-100 dark:border-gray-800 pb-6 mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-indigo-500/20 shrink-0">
                                    {selectedJournalist.name.charAt(0)}
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {selectedJournalist.name}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                                            <Building2 className="h-3.5 w-3.5" />
                                            {selectedJournalist.publication}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                                            <Tag className="h-3.5 w-3.5" />
                                            {selectedJournalist.category}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 pt-0.5">
                                        {selectedJournalist.role}
                                    </p>
                                </div>
                            </div>

                            {/* Contact Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                {/* Left Side: Details Card Block */}
                                <div className="space-y-5 bg-white/40 dark:bg-gray-800/40 rounded-2xl p-5 border border-gray-100/50 dark:border-gray-800/50">
                                    <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                                        Contact Information
                                    </h3>
                                    
                                    {/* Email */}
                                    <div className="flex items-center justify-between group/row">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 shrink-0">
                                                <Mail className="h-4.5 w-4.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-3xs text-gray-400 uppercase font-semibold">Email Address</p>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                                    {selectedJournalist.email}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(selectedJournalist.email, 'email')}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all duration-200 cursor-pointer shrink-0"
                                            title="Copy Email"
                                        >
                                            {copiedField === 'email' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                    </div>

                                    {/* Phone */}
                                    <div className="flex items-center justify-between group/row">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 shrink-0">
                                                <Phone className="h-4.5 w-4.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-3xs text-gray-400 uppercase font-semibold">Phone Number</p>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                                    {selectedJournalist.phone}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(selectedJournalist.phone, 'phone')}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all duration-200 cursor-pointer shrink-0"
                                            title="Copy Phone"
                                        >
                                            {copiedField === 'phone' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                    </div>

                                    {/* Address */}
                                    <div className="flex items-center justify-between group/row">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 shrink-0">
                                                <MapPin className="h-4.5 w-4.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-3xs text-gray-400 uppercase font-semibold">Location / Address</p>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                                    {selectedJournalist.address}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(selectedJournalist.address, 'address')}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all duration-200 cursor-pointer shrink-0"
                                            title="Copy Address"
                                        >
                                            {copiedField === 'address' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Right Side: Brief / Bio & Pitch actions */}
                                <div className="flex flex-col justify-between space-y-5 bg-white/40 dark:bg-gray-800/40 rounded-2xl p-5 border border-gray-100/50 dark:border-gray-800/50">
                                    <div className="space-y-3">
                                        <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                            <Sparkles className="h-4 w-4 text-indigo-500" />
                                            Outreach Insights
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                            {selectedJournalist.bio || "No custom bio or pitching insight available for this contact."}
                                        </p>
                                    </div>

                                    {/* Action button */}
                                    <a
                                        href={`mailto:${selectedJournalist.email}?subject=Exclusive pitch from Anexar`}
                                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 hover:-translate-y-0.5 transition-all duration-200 text-sm cursor-pointer"
                                    >
                                        <Mail className="h-4 w-4" />
                                        <span>Draft Pitch Email</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 p-12 text-center text-gray-400">
                            <User className="h-16 w-16 mx-auto mb-4 opacity-30" />
                            <p className="text-lg">Select a journalist from the directory list to view details.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Journalist Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
                        onClick={() => setIsAddModalOpen(false)}
                    />
                    
                    {/* Modal Content */}
                    <div className="relative bg-[#FDFBF7] dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 w-full max-w-lg overflow-hidden shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Journalist</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Populate standard contact fields to store this contact inside your workspace.
                            </p>
                        </div>

                        <form onSubmit={handleAddJournalist} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-400 mb-1">Journalist Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newJournalist.name}
                                        onChange={(e) => setNewJournalist({ ...newJournalist, name: e.target.value })}
                                        placeholder="e.g. Liam Foster"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-400 mb-1">Publication *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newJournalist.publication}
                                        onChange={(e) => setNewJournalist({ ...newJournalist, publication: e.target.value })}
                                        placeholder="e.g. VentureBeat"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-400 mb-1">Role / Job Title</label>
                                    <input
                                        type="text"
                                        value={newJournalist.role}
                                        onChange={(e) => setNewJournalist({ ...newJournalist, role: e.target.value })}
                                        placeholder="e.g. Venture Reporter"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-400 mb-1">Category</label>
                                    <select
                                        value={newJournalist.category}
                                        onChange={(e) => setNewJournalist({ ...newJournalist, category: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                                    >
                                        <option value="Technology & Startups">Technology & Startups</option>
                                        <option value="Finance & Markets">Finance & Markets</option>
                                        <option value="Business & Leadership">Business & Leadership</option>
                                        <option value="AI & Tech Ethics">AI & Tech Ethics</option>
                                        <option value="General News">General News</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-400 mb-1">Email Address *</label>
                                <input
                                    type="email"
                                    required
                                    value={newJournalist.email}
                                    onChange={(e) => setNewJournalist({ ...newJournalist, email: e.target.value })}
                                    placeholder="e.g. liam.foster@outlet.com"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-400 mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    value={newJournalist.phone}
                                    onChange={(e) => setNewJournalist({ ...newJournalist, phone: e.target.value })}
                                    placeholder="e.g. +1 (555) 901-2345"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-400 mb-1">Address / Location</label>
                                <input
                                    type="text"
                                    value={newJournalist.address}
                                    onChange={(e) => setNewJournalist({ ...newJournalist, address: e.target.value })}
                                    placeholder="e.g. Austin Bureau, Austin, TX"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-400 mb-1">Outreach Bio / Notes</label>
                                <textarea
                                    value={newJournalist.bio}
                                    onChange={(e) => setNewJournalist({ ...newJournalist, bio: e.target.value })}
                                    placeholder="What does this journalist cover? What are their areas of interest?"
                                    rows="3"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all resize-none"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all cursor-pointer text-sm text-center"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 text-white font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-sm text-center"
                                >
                                    Create Contact
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
