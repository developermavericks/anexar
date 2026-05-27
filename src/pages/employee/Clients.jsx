import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';

export default function Clients() {
    return (
        <div className="space-y-8 max-w-5xl mx-auto font-sans pb-8 text-slate-900 dark:text-slate-100 animate-fade-in">
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 to-purple-600/10 rounded-3xl p-8 border border-amber-500/20 shadow-xl">
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    Client Management
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium">
                    Clean directory slate. Add custom onboarding forms and database lists here.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card className="border-none shadow-md bg-white dark:bg-slate-950 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 p-8 text-center text-slate-450 dark:text-slate-550">
                    <CardContent className="py-12 space-y-2">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">Empty Slate</p>
                        <p className="text-2xs text-slate-400 dark:text-slate-500 font-medium">Ready for your custom brand directory forms and customer profile lists.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
