import { db } from '../lib/firebaseClient';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Utility to log user actions in the team portal to Firestore.
 * @param {Object} user - The auth user object containing email and name.
 * @param {string} action - The action category (e.g., 'Logged In', 'PDF Scraper', 'Self-Onboarding', 'Upload Coverage').
 * @param {string} details - Additional descriptive details about the action.
 */
export const logActivity = async (user, action, details = "") => {
    if (!user || !user.email) return;
    try {
        const emailLower = user.email.toLowerCase();
        await addDoc(collection(db, "audit_logs"), {
            email: emailLower,
            action: action,
            details: details,
            timestamp: serverTimestamp()
        });
    } catch (err) {
        console.error("Failed to write audit log:", err);
    }
};
