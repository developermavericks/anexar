import React, { useState, useRef } from 'react';
import { useUser } from '../../context/UserContext';
import { UploadCloud, CheckCircle, Image as ImageIcon, X } from 'lucide-react';

const OrganizationTab = () => {
    const { user, setUser } = useUser();
    const fileInputRef = useRef(null);

    // Fallback if organization isn't in context yet
    const initialOrg = user.organization || {
        companyName: 'The Mavericks Communications LLP',
        industry: 'PR and Communications',
        website: 'https://themavericksindia.com',
        companySize: '51-200',
        headquarters: 'New Delhi, India',
        logo: null
    };

    const [formData, setFormData] = useState(initialOrg);
    const [isSaving, setIsSaving] = useState(false);
    const [showToast, setShowToast] = useState(false);

    // Upload States
    const [isDragging, setIsDragging] = useState(false);
    const [uploadError, setUploadError] = useState('');

    const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialOrg);

    // File Handling
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    };

    const handleFileSelect = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    };

    const processFile = (file) => {
        setUploadError('');

        // Validate type
        if (!file.type.match(/^image\/(jpeg|png|gif|svg\+xml)$/)) {
            setUploadError('Invalid file type. Please upload a JPG, PNG, GIF, or SVG.');
            return;
        }

        // Validate size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setUploadError('File size exceeds 5MB limit.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setFormData({ ...formData, logo: e.target.result });
        };
        reader.readAsDataURL(file);
    };

    const removeLogo = (e) => {
        e.stopPropagation();
        setFormData({ ...formData, logo: null });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSave = (e) => {
        e.preventDefault();
        setIsSaving(true);
        setTimeout(() => {
            setUser({ ...user, organization: formData });
            setIsSaving(false);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }, 800);
    };

    return (
        <div className="p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Company Information</h2>

            <form onSubmit={handleSave} className="space-y-8">
                {/* Logo Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Company Logo</label>
                    <div
                        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden group
                            ${isDragging ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'border-[#EAE8E4] dark:border-white/10 bg-gray-50 dark:bg-[#1F2937] hover:bg-[#FDFBF7] dark:hover:bg-[#0B0F19] hover:border-amber-300 dark:hover:border-slate-600'}
                        `}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/jpeg, image/png, image/gif, image/svg+xml"
                            className="hidden"
                        />

                        {formData.logo ? (
                            <div className="relative w-full max-w-[200px] h-32 flex items-center justify-center">
                                <img src={formData.logo} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                                <button
                                    type="button"
                                    onClick={removeLogo}
                                    className="absolute -top-3 -right-3 bg-white dark:bg-[#111827] text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-rose-500 p-1.5 rounded-full shadow-md border border-[#EAE8E4] dark:border-white/10 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                                <div className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg backdrop-blur-sm">
                                    <span className="text-sm font-medium flex items-center gap-2">
                                        <UploadCloud size={16} /> Change Logo
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={`p-3 rounded-full shadow-sm mb-3 transition-transform ${isDragging ? 'bg-amber-100 dark:bg-amber-500/20 scale-110' : 'bg-white dark:bg-[#111827] group-hover:scale-110'}`}>
                                    {isDragging ? <ImageIcon className="text-amber-600 dark:text-amber-400" size={24} /> : <UploadCloud className="text-amber-500 dark:text-amber-400" size={24} />}
                                </div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {isDragging ? 'Drop image here' : 'Drop logo here or click to browse'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">SVG, PNG, JPG or GIF (max. 5MB)</p>
                            </>
                        )}
                    </div>
                    {uploadError && <p className="text-xs font-semibold text-rose-500 mt-2">{uploadError}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Name *</label>
                        <input
                            type="text"
                            required
                            value={formData.companyName}
                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                            className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Industry</label>
                        <input
                            type="text"
                            value={formData.industry}
                            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                            className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Website URL</label>
                        <input
                            type="url"
                            value={formData.website}
                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Size</label>
                        <select
                            value={formData.companySize}
                            onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                            className="w-full bg-white dark:bg-[#111827] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium cursor-pointer"
                        >
                            <option value="1-10">1-10 team members</option>
                            <option value="11-50">11-50 team members</option>
                            <option value="51-200">51-200 team members</option>
                            <option value="201-500">201-500 team members</option>
                            <option value="500+">500+ team members</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Headquarters Location</label>
                        <input
                            type="text"
                            value={formData.headquarters}
                            onChange={(e) => setFormData({ ...formData, headquarters: e.target.value })}
                            className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#EAE8E4] dark:border-white/10">
                    <button type="button" className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white dark:text-white:text-slate-100 bg-white dark:bg-[#111827] border border-[#EAE8E4] dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#1F2937] dark:bg-[#1F2937]:bg-slate-700 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!hasChanges || isSaving}
                        className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 ${hasChanges && !isSaving
                            ? 'bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] hover:bg-black dark:hover:bg-amber-400:bg-cyan-600 text-white'
                            : 'bg-gray-100 dark:bg-[#374151] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        {isSaving ? 'Saving...' : 'Save Organization'}
                    </button>
                </div>
            </form>

            {/* Toast */}
            {showToast && (
                <div className="fixed bottom-6 right-6 bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] text-white dark:bg-amber-500 dark:text-[#0B0F19] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
                    <CheckCircle className="text-emerald-400" size={20} />
                    <span className="font-medium">Organization details updated.</span>
                </div>
            )}
        </div>
    );
};

export default OrganizationTab;
