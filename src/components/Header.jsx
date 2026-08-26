import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/Button';
import { ChevronDown } from 'lucide-react';

export default function Header() {
    const [showSignIn, setShowSignIn] = useState(false);
    const [showSignUp, setShowSignUp] = useState(false);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-brand-beige/80 backdrop-blur-md border-b border-brand-border/30">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

                {/* Left: Logo */}
                <div className="flex-1 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white shrink-0 shadow-sm flex items-center justify-center p-1">
                        <img src="/anexar_collapsed.png" alt="Logo" className="w-full h-full object-contain rounded" />
                    </div>
                    <Link to="/" className="font-bold text-xl tracking-tight text-brand-charcoal">
                        The Anexar Dashboard
                    </Link>
                </div>

                {/* Center: Navigation - Centered & Highlighted */}
                <nav className="hidden md:flex flex-1 items-center justify-center gap-6">
                    <a href="#platform" className="px-5 py-2 rounded-full font-semibold text-brand-charcoal bg-brand-amber/10 hover:bg-brand-amber hover:text-white hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-amber/30 transition-all duration-300 ease-out">
                        Platform
                    </a>
                    <a href="#solutions" className="px-5 py-2 rounded-full font-semibold text-brand-charcoal bg-brand-amber/10 hover:bg-brand-amber hover:text-white hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-amber/30 transition-all duration-300 ease-out">
                        Solutions
                    </a>
                    <a href="#company" className="px-5 py-2 rounded-full font-semibold text-brand-charcoal bg-brand-amber/10 hover:bg-brand-amber hover:text-white hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-amber/30 transition-all duration-300 ease-out">
                        Company
                    </a>
                </nav>

                {/* Right: Auth Actions */}
                <div className="flex-1 flex items-center justify-end gap-6 relative">
                    <Link 
                        to="/login?role=anexar" 
                        className="flex items-center gap-1.5 text-sm font-semibold text-white bg-brand-charcoal hover:bg-brand-amber px-6 py-2.5 rounded-full shadow-soft transition-all duration-300 cursor-pointer"
                    >
                        Sign In
                    </Link>
                </div>

            </div>
        </header>
    );
}
