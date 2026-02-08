import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';
import { CheckCircleIcon, ClockIcon, CameraIcon, PhotoIcon, DocumentTextIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ClientPortal = () => {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                // Fetch from public endpoint
                const res = await api.get(`/events/public/${id}`);
                setEvent(res.data);
            } catch (err) {
                console.error(err);
                // Fallback for demo if API fails
                if (!event) {
                    setEvent({
                        name: "Event Not Found",
                        event_date: "",
                        description: "Please check the link and try again.",
                        status: "planned",
                        invoices: []
                    });
                }
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
        try {
            const res = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice_${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            toast.error("Failed to download PDF");
        }
    };

    if (loading) return <div className="text-center mt-20 text-slate-400">Loading...</div>;
    if (!event) return <div className="text-center mt-20 text-red-400">Event not found.</div>;

    const steps = [
        { id: 'planned', label: 'Booked', icon: ClockIcon },
        { id: 'shooting', label: 'Shooting', icon: CameraIcon },
        { id: 'editing', label: 'Editing', icon: PhotoIcon },
        { id: 'completed', label: 'Ready', icon: CheckCircleIcon },
    ];

    const currentStepIndex = steps.findIndex(s => s.id === (event.status || 'planned'));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 max-w-4xl mx-auto"
        >
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold font-outfit text-white">{event.name}</h1>
                <p className="text-slate-400">{event.event_date} • {event.description}</p>
            </div>

            {/* Status Tracker */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20" />

                <h2 className="text-xl font-bold text-white mb-8 text-center">Project Status</h2>

                <div className="relative flex justify-between items-center max-w-lg mx-auto">
                    {/* Progress Bar Background */}
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/10 -z-10 -translate-y-1/2 rounded-full" />

                    {/* Active Progress Bar */}
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="absolute top-1/2 left-0 h-1 bg-indigo-500 -z-10 -translate-y-1/2 rounded-full"
                    />

                    {steps.map((step, idx) => {
                        const isActive = idx <= currentStepIndex;

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-3">
                                <motion.div
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: isActive ? 1 : 0.8 }}
                                    className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center border-4 transition-colors z-10",
                                        isActive ? "bg-indigo-600 border-indigo-900 text-white shadow-lg shadow-indigo-500/50" : "bg-slate-800 border-slate-700 text-slate-500"
                                    )}
                                >
                                    <step.icon className="w-5 h-5" />
                                </motion.div>
                                <span className={cn(
                                    "text-xs font-bold uppercase tracking-wider transition-colors",
                                    isActive ? "text-indigo-300" : "text-slate-600"
                                )}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-10 text-center">
                    {event.status === 'completed' ? (
                        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
                            Download Photos
                        </button>
                    ) : (
                        <div className="inline-block px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 text-sm">
                            We are currently working on this stage.
                        </div>
                    )}
                </div>
            </div>

            {/* Invoices Section */}
            {event.invoices && event.invoices.length > 0 && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <DocumentTextIcon className="w-6 h-6 text-pumpkin" />
                        Invoices
                    </h2>
                    <div className="grid gap-4">
                        {event.invoices.map((inv) => (
                            <div key={inv.id} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 hover:border-pumpkin/30 transition-colors">
                                <div>
                                    <p className="text-white font-mono font-bold">{inv.invoice_number}</p>
                                    <p className="text-sm text-slate-400">Total: RM {inv.total_amount.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={cn(
                                        "px-2 py-1 rounded text-xs font-bold uppercase tracking-wider",
                                        inv.status === 'PAID' ? "bg-emerald-500/20 text-emerald-400" : "bg-pumpkin/20 text-pumpkin"
                                    )}>
                                        {inv.status}
                                    </span>
                                    <button
                                        onClick={() => handleDownloadPDF(inv.id, inv.invoice_number)}
                                        className="p-2 bg-slate-800 hover:bg-white/20 text-white rounded-lg transition-colors"
                                        title="Download PDF"
                                    >
                                        <ArrowDownTrayIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <p className="text-center text-slate-500 text-xs pb-10">
                &copy; 2024 BizPhoto. All rights reserved.
            </p>
        </motion.div>
    );
};

export default ClientPortal;
