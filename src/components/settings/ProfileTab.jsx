import React, { useState, useRef } from 'react';
import { useUser } from '../../context/UserContext';
import { Camera, CheckCircle } from 'lucide-react';

const ProfileTab = () => {
    const { user, setUser } = useUser();
    const fileInputRef = useRef(null);
    const [formData, setFormData] = useState({
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        phone: user.profile?.phone || '+1 (555) 000-0000',
        designation: user.profile?.designation || 'CEO',
        timezone: user.profile?.timezone || 'UTC',
        language: user.profile?.language || 'en'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [showToast, setShowToast] = useState(false);

    const isGoogleLogin = user.email?.includes('gmail.com') || false; // Mock requirement

    // Check if form changed
    const hasChanges = formData.name !== user.name || formData.avatar !== user.avatar || formData.phone !== user.profile?.phone || formData.designation !== user.profile?.designation || formData.timezone !== user.profile?.timezone || formData.language !== user.profile?.language;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, avatar: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = (e) => {
        e.preventDefault();
        setIsSaving(true);
        setTimeout(() => {
            setUser({
                ...user,
                name: formData.name,
                avatar: formData.avatar,
                profile: {
                    phone: formData.phone,
                    designation: formData.designation,
                    timezone: formData.timezone,
                    language: formData.language
                }
            });
            setIsSaving(false);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }, 800);
    };

    return (
        <div className="p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Personal Information</h2>

            <form onSubmit={handleSave} className="space-y-8">
                {/* Profile Picture Upload */}
                <div className="flex items-center gap-6">
                    <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-[#374151] border-4 border-white shadow-sm flex items-center justify-center text-2xl font-bold text-amber-500 dark:text-amber-400 overflow-hidden group-hover:opacity-80 transition-opacity">
                            {formData.avatar ? (
                                <img src={formData.avatar} alt="Avatar Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            ) : (
                                formData.name.charAt(0)
                            )}
                        </div>
                        <button type="button" className="absolute bottom-0 right-0 p-2 bg-white dark:bg-[#111827] border border-[#EAE8E4] dark:border-white/10 rounded-full text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-amber-500 dark:text-amber-400 hover:border-amber-500 transition-colors shadow-sm z-10">
                            <Camera size={16} />
                        </button>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                    </div>
                    <div>
                        <h3 className="text-gray-900 dark:text-white font-medium">Profile Picture</h3>
                        <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mt-1">PNG, JPG up to 5MB</p>
                    </div>
                </div>

                {/* Form Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            disabled={isGoogleLogin}
                            className={`w-full border text-gray-900 dark:text-white rounded-xl px-4 py-2.5 font-medium ${isGoogleLogin ? 'bg-gray-100 dark:bg-[#374151] border-gray-200 text-gray-500 dark:text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-[#FDFBF7] dark:bg-[#0B0F19] border-[#EAE8E4] dark:border-white/10'}`}
                        />
                        {isGoogleLogin && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Managed by Google Authentication</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number *</label>
                        <input
                            type="tel"
                            required
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Designation</label>
                        <input
                            type="text"
                            value={formData.designation}
                            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                            className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timezone</label>
                        <select
                            value={formData.timezone}
                            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                            className="w-full bg-white dark:bg-[#111827] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium cursor-pointer"
                        >
                            <option value="UTC">UTC (GMT+0)</option>
                            <option value="EST">EST (GMT-5)</option>
                            <option value="PST">PST (GMT-8)</option>
                            <option value="IST">IST (GMT+5:30)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Language</label>
                        <select
                            value={formData.language}
                            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                            className="w-full bg-white dark:bg-[#111827] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium cursor-pointer"
                        >
                            <option value="en">English (US)</option>
                            <option value="es">Español</option>
                            <option value="fr">Français</option>
                        </select>
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
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>

            {/* Toast */}
            {showToast && (
                <div className="fixed bottom-6 right-6 bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] text-white dark:bg-amber-500 dark:text-[#0B0F19] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
                    <CheckCircle className="text-emerald-400" size={20} />
                    <span className="font-medium">Profile updated successfully.</span>
                </div>
            )}
        </div>
    );
};

export default ProfileTab;
