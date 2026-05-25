import React, { useState } from 'react';
import { teamMembers } from '../../mock/clientData';
import { Mail, Calendar as CalendarIcon, X } from 'lucide-react';

const MeetTeam = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);

    const handleBookMeeting = (member) => {
        setSelectedMember(member);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedMember(null), 300);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        alert(`Meeting requested with ${selectedMember.name}.`);
        handleCloseModal();
    };

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meet Your Team</h1>
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">The dedicated professionals managing your account.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {teamMembers.map((member) => (
                    <div key={member.id} className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex flex-col items-center text-center transition-transform hover:-translate-y-1">
                        <div className="relative mb-4">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 to-amber-500 p-1">
                                <img
                                    src={member.avatar}
                                    alt={member.name}
                                    className="w-full h-full rounded-full border-2 border-white object-cover bg-gray-100 dark:bg-[#374151]"
                                />
                            </div>
                            <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 dark:bg-emerald-500/90 border-2 border-white rounded-full"></div>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{member.name}</h3>
                        <p className="text-amber-500 dark:text-amber-400 text-sm font-medium mb-4">{member.role}</p>

                        <div className="w-full pt-4 mt-auto border-t border-[#EAE8E4] dark:border-white/10 flex flex-col gap-2">
                            <a
                                href={`mailto:${member.email}`}
                                className="flex items-center justify-center gap-2 w-full py-2 bg-gray-50 dark:bg-[#1F2937] hover:bg-gray-100 dark:hover:bg-[#374151] dark:bg-[#374151] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                            >
                                <Mail size={16} /> Email
                            </a>
                            <button
                                onClick={() => handleBookMeeting(member)}
                                className="flex items-center justify-center gap-2 w-full py-2 bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] hover:bg-black dark:hover:bg-amber-400:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.05)] shadow-black/20"
                            >
                                <CalendarIcon size={16} /> Book Meeting
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Booking Modal */}
            {isModalOpen && selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-[#FDFBF7] dark:bg-[#0B0F19] backdrop-blur-sm" onClick={handleCloseModal}></div>
                    <div className="relative bg-white dark:bg-[#111827] rounded-2xl border border-[#EAE8E4] dark:border-white/10 p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
                        <button
                            onClick={handleCloseModal}
                            className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white dark:text-white:text-slate-100 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="mb-6 text-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Schedule Meeting</h2>
                            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mt-1">Book time with {selectedMember.name}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
                                <input
                                    type="time"
                                    required
                                    className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-colors [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic</label>
                                <textarea
                                    rows={3}
                                    required
                                    className="w-full bg-[#FDFBF7] dark:bg-[#0B0F19] border border-[#EAE8E4] dark:border-white/10 text-gray-900 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                                    placeholder="What would you like to discuss?"
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-[#1A1A1A] to-black hover:from-black hover:to-black text-white font-medium py-3 rounded-3xl transition-all shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-black/25 mt-2"
                            >
                                Confirm Booking
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MeetTeam;
