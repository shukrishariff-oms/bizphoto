import { useState, useEffect } from 'react';
import api from '../api/axios';
import { PlusIcon, DocumentTextIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const fetchInvoices = async () => {
        try {
            const res = await api.get('/invoices/');
            if (Array.isArray(res.data)) {
                setInvoices(res.data);
            } else {
                console.error("API returned non-array:", res.data);
                setInvoices([]);
            }
        } catch (err) {
            console.error("Failed to load invoices", err);
            setInvoices([]); // Ensure it's an array on error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'PAID': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'SENT': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'DRAFT': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
            case 'CANCELLED': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
            default: return 'bg-slate-500/20 text-slate-400';
        }
    };

    const handleDownloadPDF = async (e, id, number) => {
        e.stopPropagation();
        try {
            const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice_${number}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Failed to download PDF");
        }
    };

    // Defensive filtering
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    const filteredInvoices = safeInvoices.filter(inv => {
        if (!inv) return false;
        const numberMatch = inv.invoice_number ? inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) : false;
        const clientMatch = inv.client_name ? inv.client_name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
        return numberMatch || clientMatch;
    });

    if (loading) return <div className="text-center text-slate-400 mt-20">Loading invoices...</div>;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <DocumentTextIcon className="w-8 h-8 text-pumpkin" />
                        Invoices
                    </h1>
                    <p className="text-slate-400 mt-1">Manage billing and payments.</p>
                </div>
                <button
                    onClick={() => navigate('/invoices/new')}
                    className="flex items-center gap-2 bg-pumpkin hover:bg-pumpkin/90 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-pumpkin/20"
                >
                    <PlusIcon className="w-5 h-5" />
                    Create Invoice
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                    type="text"
                    placeholder="Search invoices..."
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-pumpkin/50 transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* List */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-slate-400 text-xs uppercase">
                        <tr>
                            <th className="px-6 py-4">Number</th>
                            <th className="px-6 py-4">Client</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300 text-sm">
                        {filteredInvoices.map((inv) => (
                            <tr
                                key={inv.id}
                                onClick={() => navigate(`/invoices/${inv.id}`)}
                                className="hover:bg-white/5 transition-colors cursor-pointer group"
                            >
                                <td className="px-6 py-4 font-mono text-white">{inv.invoice_number || '-'}</td>
                                <td className="px-6 py-4 font-medium text-white">{inv.client_name || '-'}</td>
                                <td className="px-6 py-4 text-slate-400">{inv.issued_date || '-'}</td>
                                <td className="px-6 py-4 font-mono text-pumpkin">RM {(inv.total_amount || 0).toFixed(2)}</td>
                                <td className="px-6 py-4">
                                    <span className={cn("px-2.5 py-1 rounded text-xs border uppercase tracking-wider font-semibold", getStatusColor(inv.status))}>
                                        {inv.status || 'UNKNOWN'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={(e) => handleDownloadPDF(e, inv.id, inv.invoice_number)}
                                        className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-white/10 rounded-lg transition-colors"
                                        title="Download PDF"
                                    >
                                        <ArrowDownTrayIcon className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredInvoices.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-slate-500 italic">
                                    No invoices found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Invoices;
