import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const Input = forwardRef(
    ({ className, type = "text", label, error, ...props }, ref) => {
        return (
            <div className="flex flex-col space-y-2 w-full">
                {label && (
                    <label className="text-sm font-medium text-brand-charcoal">
                        {label}
                    </label>
                )}
                <input
                    type={type}
                    className={cn(
                        "flex h-12 w-full bg-white px-5 py-2 text-base transition-colors",
                        "border border-brand-border radius-pill",
                        "file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-brand-gray/60",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber focus-visible:border-transparent",
                        "disabled:cursor-not-allowed disabled:opacity-50 shadow-soft",
                        error && "border-red-500 focus-visible:ring-red-500",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {error && (
                    <span className="text-sm text-red-500 pl-2">{error}</span>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";
