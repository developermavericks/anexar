import React from 'react';
import { cn } from '../../lib/utils';

export function Button({
    variant = 'primary',
    size = 'md',
    className,
    children,
    ...props
}) {

    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber disabled:pointer-events-none disabled:opacity-50 active:scale-95";

    const variants = {
        primary: "bg-brand-charcoal text-white hover:bg-black hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-charcoal/30 radius-button shadow-soft border border-transparent",
        secondary: "bg-brand-amber text-brand-charcoal hover:bg-yellow-400 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-amber/40 radius-button shadow-soft border border-transparent",
        outline: "border-2 border-brand-border bg-transparent hover:bg-brand-charcoal hover:text-white hover:-translate-y-1 hover:shadow-md text-brand-charcoal radius-button",
        ghost: "bg-transparent hover:bg-black/5 text-brand-charcoal radius-button hover:scale-105",
        pill: "bg-white text-brand-charcoal hover:bg-brand-amber/10 hover:border-brand-amber/50 hover:-translate-y-1 hover:shadow-md radius-pill shadow-soft border border-brand-border/50"
    };

    const sizes = {
        sm: "h-9 px-4 text-sm radius-small",
        md: "h-11 px-6 text-base radius-button",
        lg: "h-14 px-8 text-lg radius-button"
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            {...props}
        >
            {children}
        </button>
    );
}
