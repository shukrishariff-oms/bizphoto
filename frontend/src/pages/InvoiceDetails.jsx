import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { PlusIcon, TrashIcon, ArrowDownTrayIcon, PrinterIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

const InvoiceDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [clients, setClients] = useState([]);

    const [invoice, setInvoice] = useState({
        client_id: '',
        invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        issued_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'DRAFT',
        notes: '',
        items: []
    });

    const [items, setItems] = useState([
        { description: 'Photography Services', quantity: 1, unit_price: 0, amount: 0 }
    ]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const clientsRes = await api.get('/clients/');
                setClients(clientsRes.data);

                if (!isNew) {
                    const invoiceRes = await api.get(`/invoices/${id}`);
                    const inv = invoiceRes.data.invoice;
                    const invItems = invoiceRes.data.items;

                    setInvoice({
                        ...inv,
                        // Ensure dates are formatted for input[type="date"]
                        issued_date: inv.issued_date.split('T')[0],
                        due_date: inv.due_date.split('T')[0]
                    });
                    setItems(invItems);
                }
            } catch (err) {
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, isNew]);

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        // Auto-calculate amount
        if (field === 'quantity' || field === 'unit_price') {
            newItems[index].amount = newItems[index].quantity * newItems[index].unit_price;
        }

        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, unit_price: 0, amount: 0 }]);
    };

    const removeItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + item.amount, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = {
                ...invoice,
                items: items,
                total_amount: calculateTotal()
            };

            if (isNew) {
                await api.post('/invoices/', data);
                toast.success("Invoice created");
                navigate('/invoices');
            } else {
                await api.put(`/invoices/${id}`, data);
                toast.success("Invoice updated");
            }
        } catch (err) {
            toast.error("Failed to save invoice");
        }
    };

    const handleDownloadPDF = async () => {
        try {
            const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice_${invoice.invoice_number}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            toast.error("Failed to generate PDF");
        }
    };

    if (loading) return <div className="text-center text-slate-400 mt-20">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/invoices')}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            {isNew ? 'New Invoice' : `Invoice ${invoice.invoice_number}`}
                        </h1>
                        <p className="text-slate-400 text-sm">{isNew ? 'Create a new invoice' : 'View and edit invoice details'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isNew && (
                        <button
                            onClick={handleDownloadPDF}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors border border-white/10"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            PDF
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        className="flex items-center gap-2 bg-pumpkin hover:bg-pumpkin/90 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-pumpkin/20"
                    >
                        Save Invoice
                    </button>
                </div>
            </div>

            {/* Form */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-8">
                {/* Meta Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Client</label>
                        <select
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pumpkin/50"
                            value={invoice.client_id}
                            onChange={(e) => setInvoice({ ...invoice, client_id: e.target.value })}
                            required
                            disabled={!isNew}
                        >
                            <option value="">Select a client...</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Invoice Number</label>
                        <input
                            type="text"
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pumpkin/50 font-mono"
                            value={invoice.invoice_number}
                            onChange={(e) => setInvoice({ ...invoice, invoice_number: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                        <select
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pumpkin/50"
                            value={invoice.status}
                            onChange={(e) => setInvoice({ ...invoice, status: e.target.value })}
                        >
                            <option value="DRAFT">Draft</option>
                            <option value="SENT">Sent</option>
                            <option value="PAID">Paid</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Issued Date</label>
                        <input
                            type="date"
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pumpkin/50"
                            value={invoice.issued_date}
                            onChange={(e) => setInvoice({ ...invoice, issued_date: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Due Date</label>
                        <input
                            type="date"
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pumpkin/50"
                            value={invoice.due_date}
                            onChange={(e) => setInvoice({ ...invoice, due_date: e.target.value })}
                            required
                        />
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <h3 className="text-lg font-bold text-white">Items</h3>
                        <button
                            type="button"
                            onClick={addItem}
                            className="text-xs text-pumpkin hover:text-pumpkin/80 font-medium flex items-center gap-1"
                        >
                            <PlusIcon className="w-3 h-3" /> Add Item
                        </button>
                    </div>

                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-4 items-start bg-slate-800/30 p-3 rounded-lg border border-white/5">
                                <div className="col-span-5">
                                    <input
                                        type="text"
                                        placeholder="Description"
                                        className="w-full bg-transparent border-b border-white/10 px-2 py-1 text-white text-sm focus:outline-none focus:border-pumpkin/50"
                                        value={item.description}
                                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input
                                        type="number"
                                        placeholder="Qty"
                                        className="w-full bg-transparent border-b border-white/10 px-2 py-1 text-white text-right text-sm focus:outline-none focus:border-pumpkin/50"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                        min="1"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input
                                        type="number"
                                        placeholder="Price"
                                        className="w-full bg-transparent border-b border-white/10 px-2 py-1 text-white text-right text-sm focus:outline-none focus:border-pumpkin/50"
                                        value={item.unit_price}
                                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                        step="0.01"
                                    />
                                </div>
                                <div className="col-span-2 text-right py-1 font-mono text-pumpkin text-sm">
                                    RM {item.amount.toFixed(2)}
                                </div>
                                <div className="col-span-1 text-right">
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="text-slate-500 hover:text-rose-400 p-1"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-4 border-t border-white/10">
                        <div className="text-right">
                            <p className="text-xs text-slate-400 uppercase tracking-wider">Total Amount</p>
                            <p className="text-3xl font-bold text-white font-mono mt-1">RM {calculateTotal().toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
                    <textarea
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pumpkin/50 min-h-[100px]"
                        placeholder="Additional notes..."
                        value={invoice.notes}
                        onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetails;
