import React from 'react';
import { useUser } from '../../context/UserContext';
import { Check, Star, Zap, Shield } from 'lucide-react';

const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const Subscription = () => {
    const { user, setUser } = useUser();

    const handleUpgrade = async (planValue) => {
        let amount = 99900; // in cents/paisa
        let planName = 'Basic Plan';
        if (planValue === 'pro') {
            amount = 249900;
            planName = 'Pro Plan';
        } else if (planValue === 'enterprise') {
            amount = 500000;
            planName = 'Enterprise Plan';
        }

        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
            alert('Failed to load Razorpay payment portal SDK. Please check your internet connection.');
            return;
        }

        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount: amount,
            currency: 'USD',
            name: 'Anexar PR Portal',
            description: `Upgrade subscription to ${planName}`,
            image: 'https://cdn-icons-png.flaticon.com/512/3405/3405244.png',
            handler: function (response) {
                alert(`Upgrade Payment Successful!\nPayment ID: ${response.razorpay_payment_id}\nYour account has been upgraded to ${planName}.`);
                setUser({ ...user, plan: planValue });
            },
            prefill: {
                name: user.name || '',
                email: user.email || '',
            },
            notes: {
                subscription: planValue
            },
            theme: {
                color: '#F59E0B' // Amber color matching corporate theme
            }
        };

        try {
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                alert(`Payment Transaction Failed: ${response.error.description}`);
            });
            rzp.open();
        } catch (err) {
            console.error("Error launching Razorpay checkout modal:", err);
            alert("Error initiating payment transaction.");
        }
    };

    const plans = [
        {
            name: 'Basic',
            value: 'basic',
            price: '$999',
            period: '/month',
            description: 'Essential PR tracking and campaign overviews.',
            icon: Star,
            features: [
                'Active Campaign Tracking',
                'Basic Press Release Monitoring',
                'Standard Goal Tracking',
                'Monthly Reports',
                'Email Support'
            ],
            highlight: false
        },
        {
            name: 'Pro',
            value: 'pro',
            price: '$2,499',
            period: '/month',
            description: 'Advanced reputation intelligence and analytics.',
            icon: Zap,
            features: [
                'Everything in Basic',
                'Reputation Intelligence Dashboard',
                'Real-time Sentiment Analysis',
                'Media Volume Tracking',
                'Dedicated Account Manager',
                'Priority Event Matching'
            ],
            highlight: true
        },
        {
            name: 'Enterprise',
            value: 'enterprise',
            price: 'Custom',
            period: '',
            description: 'Full-service PR machine with dedicated agency team.',
            icon: Shield,
            features: [
                'Everything in Pro',
                'Custom API Integrations',
                'Daily Executive Briefings',
                'Crisis Management Ready',
                'Bespoke Thought Leadership',
                '24/7 Phone Support'
            ],
            highlight: false
        }
    ];

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Upgrade Your Impact</h1>
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    Unlock powerful tools and advanced analytics to take your public relations strategy to the next level.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                {plans.map((plan) => (
                    <div
                        key={plan.value}
                        className={`relative rounded-2xl border bg-white dark:bg-[#111827] shadow-xl overflow-hidden transition-transform ${plan.highlight
                            ? 'border-amber-500 md:-translate-y-4 shadow-black/20 shadow-2xl z-10'
                            : 'border-[#EAE8E4] dark:border-white/10 hover:border-gray-200'
                            }`}
                    >
                        {plan.highlight && (
                            <div className="bg-amber-400 text-gray-900 dark:text-white text-xs font-bold uppercase tracking-widest text-center py-1.5">
                                Most Popular
                            </div>
                        )}

                        <div className="p-8">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h2>
                                    <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mt-1 h-10">{plan.description}</p>
                                </div>
                                <div className={`p-3 rounded-3xl ${plan.highlight ? 'bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] text-amber-500 dark:text-amber-400' : 'bg-gray-50 dark:bg-[#1F2937] text-gray-700 dark:text-gray-300'}`}>
                                    <plan.icon size={24} />
                                </div>
                            </div>

                            <div className="mb-8 flex items-end gap-1">
                                <span className="text-4xl font-black text-gray-900 dark:text-white">{plan.price}</span>
                                <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-1">{plan.period}</span>
                            </div>

                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <Check size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-gray-700 dark:text-gray-300 text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleUpgrade(plan.value)}
                                disabled={user.plan === plan.value}
                                className={`w-full py-3 px-4 rounded-3xl font-bold text-sm transition-all ${user.plan === plan.value
                                    ? 'bg-gray-100 dark:bg-[#374151] text-gray-500 dark:text-gray-400 dark:text-gray-500 cursor-not-allowed border-none'
                                    : plan.highlight
                                        ? 'bg-gradient-to-r from-[#1A1A1A] to-black hover:from-black hover:to-black text-white shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-black/25'
                                        : 'bg-gray-50 dark:bg-[#1F2937] hover:bg-gray-100 dark:hover:bg-[#374151] dark:bg-[#374151] text-gray-900 dark:text-white border border-gray-200 hover:border-slate-500'
                                    }`}
                            >
                                {user.plan === plan.value ? 'Current Plan' : `Upgrade to ${plan.name}`}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Subscription;
