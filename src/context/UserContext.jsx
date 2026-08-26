import React, { createContext, useState, useContext } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const { user: authUser } = useAuth();

    // Read theme from local storage or default to light
    const getInitialTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme ? savedTheme : 'light';
    };

    const [user, setUserState] = useState(() => {
        const email = authUser?.email || "client@email.com";
        const role = authUser?.role?.toLowerCase() || "client";
        const title = authUser?.title;

        let savedProfile = null;
        try {
            const stored = localStorage.getItem('user_profile_' + email.toLowerCase());
            if (stored) {
                savedProfile = JSON.parse(stored);
            }
        } catch (e) {}

        const profile = savedProfile || {
            phone: '+91 93040 47238',
            designation: title || (['employee', 'team', 'core', 'manager'].includes(role) ? 'Management Trainee-Tech' : 'CEO'),
            timezone: 'IST',
            language: 'en'
        };

        return {
            name: authUser?.name || "The Mavericks",
            email: email,
            role: role,
            clientBrand: "FUJIFILM",
            plan: (authUser?.email ? localStorage.getItem('user_plan_' + authUser.email.toLowerCase()) : null) || "basic",
            avatar: authUser?.picture || null,
            theme: getInitialTheme(),
            profile: profile,
            organization: {
                companyName: 'The Mavericks Communications LLP',
                industry: "PR and Communications",
                website: "https://themavericksindia.com",
                companySize: "51-200",
                headquarters: "New Delhi, India",
                logo: null
            },
            notifications: {
                email: { campaign: true, press: true, events: false, performance: true, crisis: false },
                app: { completion: true, goals: true, budget: false, team: true }
            },
            security: {
                twoFactor: false
            },
            integrations: {
                googleAnalytics: true,
                slack: true,
                hubspot: false,
                mailchimp: false,
                googleCalendar: true
            }
        };
    });

    // Update state when auth user changes (e.g. login/logout)
    React.useEffect(() => {
        if (authUser) {
            const email = authUser.email;
            const userPlan = (email ? localStorage.getItem('user_plan_' + email.toLowerCase()) : null) || "basic";

            let savedProfile = null;
            try {
                const stored = localStorage.getItem('user_profile_' + email.toLowerCase());
                if (stored) {
                    savedProfile = JSON.parse(stored);
                }
            } catch (e) {}

            // Set cookie for extension lookup
            try {
                document.cookie = `anexar_user_email=${encodeURIComponent(email)}; path=/; max-age=31536000; Secure; SameSite=Lax`;
            } catch (e) {
                console.error("Error setting email cookie:", e);
            }

            setUserState(prev => ({
                ...prev,
                name: authUser.name,
                email: email,
                role: authUser.role?.toLowerCase() || 'client',
                plan: userPlan,
                avatar: authUser.picture || null,
                profile: savedProfile || {
                    phone: prev.profile?.phone || '+91 93040 47238',
                    designation: authUser.title || (['employee', 'team', 'core', 'manager'].includes(authUser.role?.toLowerCase()) ? 'Management Trainee-Tech' : 'CEO'),
                    timezone: prev.profile?.timezone || 'IST',
                    language: prev.profile?.language || 'en'
                },
                organization: {
                    ...prev.organization,
                    primaryContact: authUser.name,
                    companyName: 'The Mavericks Communications LLP',
                }
            }));
        } else {
            // Clear cookie on logout
            try {
                document.cookie = `anexar_user_email=; path=/; max-age=0; Secure; SameSite=Lax`;
            } catch (e) {}
        }
    }, [authUser]);

    // Resolve clientBrand from domain mapping or Firestore lookup
    React.useEffect(() => {
        const resolveBrand = async () => {
            if (!authUser || !authUser.email) return;
            
            const emailLower = authUser.email.toLowerCase();
            if (emailLower.includes('ss1084169')) {
                setUserState(prev => ({ ...prev, clientBrand: 'Scapia' }));
                return;
            }

            // Step 1: Automated domain mapping
            const domainMappings = {
                'fujifilm.com': 'FUJIFILM',
                'fujifilm.co.in': 'FUJIFILM',
                'google.com': 'Google',
                'google.co.in': 'Google',
                'spotify.com': 'Spotify',
                'plumgoodness.com': 'Plum',
                'nike.com': 'Nike',
                'udaiti.org': 'Udaiti',
                'scapia.com': 'Scapia',
                'musashi.com': 'Musashi-D'
            };

            const domain = emailLower.split('@')[1];
            if (domain && domainMappings[domain]) {
                const brand = domainMappings[domain];
                setUserState(prev => ({ ...prev, clientBrand: brand }));
                return;
            }

            // Step 2: Firestore Explicit Mapping Lookup (Fallback)
            try {
                const docRef = doc(db, "client_mappings", emailLower);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().brand) {
                    setUserState(prev => ({ ...prev, clientBrand: docSnap.data().brand }));
                    return;
                }
            } catch (err) {
                console.error("Error checking client_mappings in Firestore:", err);
            }

            // Default fallback
            setUserState(prev => ({ ...prev, clientBrand: authUser.name || 'FUJIFILM' }));
        };

        resolveBrand();
    }, [authUser]);

    React.useEffect(() => {
        // We only persist the theme setting locally; layout components will apply '.dark' to themselves locally.
        localStorage.setItem('theme', user.theme);
    }, [user.theme]);

    React.useEffect(() => {
        if (user.email && user.plan) {
            localStorage.setItem('user_plan_' + user.email.toLowerCase(), user.plan);
            localStorage.setItem('user_plan', user.plan);
        }
    }, [user.email, user.plan]);

    React.useEffect(() => {
        if (user.email && user.profile) {
            localStorage.setItem('user_profile_' + user.email.toLowerCase(), JSON.stringify(user.profile));
        }
    }, [user.email, user.profile]);

    const setUser = (updater) => {
        setUserState(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            return next;
        });
    };

    return (
        <UserContext.Provider value={{ user, setUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
