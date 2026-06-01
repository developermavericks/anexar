import React, { createContext, useState, useContext } from 'react';
import { useAuth } from './AuthContext';

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
        role: (authUser?.role?.toLowerCase() === 'employee' ? 'team' : authUser?.role?.toLowerCase()) || "client",
        plan: "basic",
        avatar: authUser?.picture || null,
        theme: getInitialTheme(),
        profile: {
            phone: '+1 (555) 000-0000',
            designation: (authUser?.role === 'Employee' || authUser?.role === 'Team') ? 'Manager' : 'CEO',
            timezone: 'UTC',
            language: 'en'
        },
        organization: {
            companyName: (authUser?.role === 'Employee' || authUser?.role === 'Team') ? 'Anexar Corp' : (authUser?.name || "Visionary Media Pvt Ltd"),
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
            setUserState(prev => ({
                ...prev,
                name: authUser.name,
                email: authUser.email,
                role: authUser.role?.toLowerCase() === 'employee' ? 'team' : authUser.role?.toLowerCase(),
                avatar: authUser.picture || null,
                profile: {
                    ...prev.profile,
                    designation: (authUser.role === 'Employee' || authUser.role === 'Team') ? 'Manager' : 'CEO',
                },
                organization: {
                    ...prev.organization,
                    primaryContact: authUser.name,
                    companyName: (authUser.role === 'Employee' || authUser.role === 'Team') ? 'Anexar Corp' : (authUser.name || "Visionary Media Pvt Ltd"),
                }
            }));
        }
    }, [authUser]);

    React.useEffect(() => {
        if (user.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', user.theme);
    }, [user.theme]);

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
