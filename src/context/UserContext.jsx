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

    const [user, setUserState] = useState(() => ({
        name: authUser?.name || "Visionary Media",
        email: authUser?.email || "client@email.com",
        role: authUser?.role?.toLowerCase() || "client",
        clientBrand: "FUJIFILM",
        plan: (authUser?.email ? localStorage.getItem('user_plan_' + authUser.email.toLowerCase()) : null) || "basic",
        avatar: authUser?.picture || null,
        theme: getInitialTheme(),
        profile: {
            phone: '+1 (555) 000-0000',
            designation: ['employee', 'team', 'core', 'manager'].includes(authUser?.role?.toLowerCase()) ? 'Manager' : 'CEO',
            timezone: 'UTC',
            language: 'en'
        },
        organization: {
            companyName: ['employee', 'team', 'core', 'manager'].includes(authUser?.role?.toLowerCase()) ? 'Anexar Corp' : (authUser?.name || "Visionary Media Pvt Ltd"),
            industry: "Fintech",
            website: "https://visionary.media",
            companySize: "51-200",
            headquarters: "San Francisco, CA",
            taxId: "US-9988776655",
            primaryContact: authUser?.name || "Visionary Media",
            secondaryContact: "Jane Doe",
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
    }));

    // Update state when auth user changes (e.g. login/logout)
    React.useEffect(() => {
        if (authUser) {
            const email = authUser.email;
            const userPlan = (email ? localStorage.getItem('user_plan_' + email.toLowerCase()) : null) || "basic";
            setUserState(prev => ({
                ...prev,
                name: authUser.name,
                email: email,
                role: authUser.role?.toLowerCase() || 'client',
                plan: userPlan,
                avatar: authUser.picture || null,
                profile: {
                    ...prev.profile,
                    designation: ['employee', 'team', 'core', 'manager'].includes(authUser.role?.toLowerCase()) ? 'Manager' : 'CEO',
                },
                organization: {
                    ...prev.organization,
                    primaryContact: authUser.name,
                    companyName: ['employee', 'team', 'core', 'manager'].includes(authUser.role?.toLowerCase()) ? 'Anexar Corp' : (authUser.name || "Visionary Media Pvt Ltd"),
                }
            }));
        }
    }, [authUser]);

    // Resolve clientBrand from domain mapping or Firestore lookup
    React.useEffect(() => {
        const resolveBrand = async () => {
            if (!authUser || !authUser.email) return;
            
            const emailLower = authUser.email.toLowerCase();
            const isDeveloperSatyam = emailLower.includes('satyam') || emailLower.includes('test') || emailLower.includes('ss1084169');
            if (isDeveloperSatyam) {
                setUserState(prev => ({ ...prev, clientBrand: 'FUJIFILM' }));
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
