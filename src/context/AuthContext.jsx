/* eslint-disable no-unused-vars, react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(undefined);

// For simulation, we store users and CurrentUser in localStorage
const USERS_KEY = 'mavericks_users_db';
const CURRENT_USER_KEY = 'mavericks_current_user';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user from local storage on mount
    useEffect(() => {
        const storedUser = localStorage.getItem(CURRENT_USER_KEY);
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user", e);
            }
        }
        setIsLoading(false);
    }, []);

    // Sync current user to local storage whenever it changes state
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
        // Simulate finding the user matching email (and assuming password is correct)
        const foundUser = users.find((u) => u.email === email);

        if (foundUser) {
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
            role
        };

        // Save to simulated DB
        users.push(newUser);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));

        // Auto login
        setUser(newUser);
        return newUser;
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

    const loginWithGoogle = (googleUser) => {
        const userData = {
            name: googleUser.name,
            email: googleUser.email,
            picture: googleUser.picture,
            provider: "google",
            role: googleUser.role || "Client"
        };

        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, oauthLogin, loginWithGoogle, logout, isLoading }}>
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
