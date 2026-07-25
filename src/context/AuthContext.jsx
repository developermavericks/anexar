/* eslint-disable no-unused-vars, react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(undefined);

// For simulation, we store users and CurrentUser in localStorage
const USERS_KEY = 'anexar_users_db';
const CURRENT_USER_KEY = 'anexar_current_user';

import { supabase } from '../lib/supabaseClient';

export function AuthProvider({ children }) {
    // Lazy initialization: read cached user synchronously on first render
    const [user, setUser] = useState(() => {
        try {
            const storedUser = localStorage.getItem(CURRENT_USER_KEY);
            return storedUser ? JSON.parse(storedUser) : null;
        } catch (e) {
            console.error("Failed to parse stored user from localStorage:", e);
            return null;
        }
    });

    const [isLoading, setIsLoading] = useState(false);

    // Background profile refresh from Supabase after initial render
    useEffect(() => {
        if (user && user.email) {
            supabase
                .from('users')
                .select('id, title, role')
                .ilike('email', user.email.toLowerCase())
                .maybeSingle()
                .then(({ data, error }) => {
                    if (data) {
                        const newRole = data.role ? data.role.toLowerCase() : user.role;
                        const newTitle = data.title || "";
                        const newId = data.id || user.id;

                        // Only update state if profile fields actually changed
                        if (user.role !== newRole || user.title !== newTitle || user.id !== newId) {
                            setUser(prev => prev ? {
                                ...prev,
                                id: newId,
                                title: newTitle,
                                role: newRole
                            } : null);
                        }
                    }
                })
                .catch(err => console.error("Error refreshing profile in background:", err));
        }
    }, []);

    // Sync state changes to local storage
    useEffect(() => {
        if (user) {
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(CURRENT_USER_KEY);
        }
    }, [user]);

    // helper to get all registered users
    const getStoredUsers = () => {
        const usersStr = localStorage.getItem(USERS_KEY);
        return usersStr ? JSON.parse(usersStr) : [];
    };

    const login = (email, password) => {
        const users = getStoredUsers();
        // Simulate finding the user matching email
        const foundUser = users.find((u) => u.email === email);

        if (foundUser) {
            // If the user has a password set, verify it. Otherwise, allow it for backward compatibility.
            if (foundUser.password && foundUser.password !== password) {
                throw new Error("Invalid password. Please try again.");
            }
            setUser(foundUser);
            return foundUser;
        } else {
            throw new Error(`Account not found for ${email}. Please sign up.`);
        }
    };

    const register = (name, email, password, role) => {
        const users = getStoredUsers();

        if (users.some((u) => u.email === email)) {
            throw new Error(`An account with ${email} already exists.`);
        }

        const newUser = {
            id: Math.random().toString(36).substring(2, 9),
            name,
            email,
            password, // Save password!
            role
        };

        // Save to simulated DB
        users.push(newUser);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));

        // Auto login
        setUser(newUser);
        return newUser;
    };

    const resetPassword = (email, newPassword) => {
        const users = getStoredUsers();
        const userIndex = users.findIndex((u) => u.email === email);

        if (userIndex !== -1) {
            users[userIndex].password = newPassword;
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
            return true;
        } else {
            throw new Error(`No account found for ${email}.`);
        }
    };

    const oauthLogin = (provider) => {
        // Simulating OAuth where it auto-creates an account if not found
        // or logs you in if the email is found.
        const mockGoogleUser = {
            name: "Google User",
            email: "google.user@example.com",
            // default to Client if they don't exist
            role: "Client",
            avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Google"
        };

        const users = getStoredUsers();
        const existingUser = users.find((u) => u.email === mockGoogleUser.email);

        if (existingUser) {
            // Login
            setUser(existingUser);
            return existingUser;
        } else {
            // Auto register
            const newUser = {
                ...mockGoogleUser,
                id: Math.random().toString(36).substring(2, 9)
            };
            users.push(newUser);
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
            setUser(newUser);
            return newUser;
        }
    };

    const loginWithGoogle = async (googleUser) => {
        const userEmail = googleUser.email?.toLowerCase() || '';
        let role = googleUser.role || "Client";

        // Enforce Maverick email domain restriction
        if ((role === 'Team' || role === 'Employee' || role === 'core' || role === 'manager' || role === 'team') && 
            !userEmail.endsWith('@themavericksindia.com')) {
            throw new Error("Access Restricted: Only @themavericksindia.com accounts are allowed to log in as Mavericks.");
        }

        let title = "";
        let dbId = null;

        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, title, role')
                .ilike('email', googleUser.email.toLowerCase())
                .maybeSingle();

            if (error) {
                console.error("Supabase user lookup error:", error);
            } else if (data) {
                dbId = data.id;
                if (data.title) title = data.title;
                // Map to the specific Supabase role if they log in as Mavericks
                if (data.role) {
                    role = data.role.toLowerCase();
                } else if (googleUser.role === 'Team' || googleUser.role === 'Employee' || googleUser.role === 'core') {
                    role = 'team';
                }
            }
        } catch (e) {
            console.error("Failed to query Supabase user profile:", e);
        }

        const userData = {
            id: dbId,
            name: googleUser.name,
            email: googleUser.email,
            picture: googleUser.picture,
            provider: "google",
            role: role,
            title: title
        };

        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, resetPassword, oauthLogin, loginWithGoogle, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
