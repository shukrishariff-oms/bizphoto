import { useEffect, useState } from 'react';
import api from '../api/axios';
import { TrashIcon, PlusIcon, BanknotesIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

const CostList = ({ eventId, onTotalChange }) => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [form, setForm] = useState({
        cost_type: 'Photographer Fee',
        amount: '',
        description: '',
        rate_type: 'flat', // 'flat', 'per_hour', 'per_person'
        unit_price: '',
        quantity: '1'
    });

    const [editingId, setEditingId] = useState(null);

    const fetchExpenses = async () => {
        try {
            const res = await api.get(`/expenses/event/${eventId}`);
            setExpenses(res.data);

            // Calculate total and notify parent
            const total = res.data.reduce((sum, item) => sum + item.amount, 0);
            if (onTotalChange) onTotalChange(total);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load expenses");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, [eventId]);

    // Auto-calculate amount when rate details change
    useEffect(() => {
        if (form.rate_type !== 'flat') {
            const price = parseFloat(form.unit_price) || 0;
            const qty = parseFloat(form.quantity) || 0;
            const total = price * qty;
            setForm(prev => ({ ...prev, amount: total > 0 ? total.toFixed(2) : '' }));
        }
    }, [form.rate_type, form.unit_price, form.quantity]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                event_id: eventId,
                cost_type: form.cost_type,
                amount: parseFloat(form.amount || 0),
                description: form.description,
                rate_type: form.rate_type,
                unit_price: parseFloat(form.unit_price) || 0,
                quantity: parseFloat(form.quantity) || 1
            };

            if (editingId) {
                // Update existing
                await api.put(`/expenses/${editingId}`, payload);
                toast.success("Expense updated");
                setEditingId(null);
            } else {
                // Create new
                await api.post('/expenses/', payload);
                toast.success("Expense added");
            }

            // Reset form
            setForm({
                cost_type: 'Photographer Fee',
                amount: '',
                description: '',
                rate_type: 'flat',
                unit_price: '',
                quantity: '1'
            });

            fetchExpenses();
        } catch (err) {
            toast.error(editingId ? "Failed to update expense" : "Failed to add expense");
        }
    };

    const handleEdit = (cost) => {
        setForm({
            cost_type: cost.cost_type,
            amount: cost.amount,
            description: cost.description || '',
            rate_type: cost.rate_type || 'flat',
            unit_price: cost.unit_price || '',
            quantity: cost.quantity || '1'
        });
        setEditingId(cost.id);
    };

    const handleCancelEdit = () => {
        setForm({
            cost_type: 'Photographer Fee',
            amount: '',
            description: '',
            rate_type: 'flat',
            unit_price: '',
            quantity: '1'
        });
        setEditingId(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this expense?")) return;
        try {
            await api.delete(`/expenses/${id}`);
            toast.success("Expense removed");
            fetchExpenses(); // Refresh list to update total
        } catch (err) {
            toast.error("Failed to delete expense");
        }
    };

    const costTypes = [
        'Photographer Fee', 'Videographer Fee', 'Assistant Fee',
        'Transport/Travel', 'Equipment Rental', 'Food & Beverage',
        'Marketing/Ads', 'Printing/Album', 'Software/Editing', 'Other'
    ];

    if (loading) return <div className="text-slate-400 text-sm">Loading costs...</div>;

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BanknotesIcon className="w-5 h-5 text-pumpkin" />
                Cost Breakdown
            </h3>

            {/* List */}
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 uppercase bg-white/5 border-b border-white/5">
                        <tr>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 w-20 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                        {expenses.map((cost) => (
                            <tr key={cost.id} className={cn("transition-colors", editingId === cost.id ? "bg-indigo-500/10" : "hover:bg-white/5")}>
                                <td className="px-4 py-3 font-medium text-white">
                                    {cost.cost_type}
                                    {cost.cost_type === 'Shutter Wear' && <span className="ml-2 text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">Auto</span>}
                                    {cost.rate_type === 'per_hour' && <span className="ml-2 text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">Hourly</span>}
                                    {cost.rate_type === 'per_person' && <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">Per Pax</span>}
                                </td>
                                <td className="px-4 py-3 text-slate-400">
                                    <div className="flex flex-col">
                                        <span>{cost.description || '-'}</span>
                                        {cost.rate_type !== 'flat' && cost.unit_price > 0 && (
                                            <span className="text-xs text-slate-500">
                                                {cost.rate_type === 'per_hour' ? `${cost.quantity} hrs @ RM ${cost.unit_price}/hr` : `${cost.quantity} pax @ RM ${cost.unit_price}/pax`}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-pumpkin">
                                    RM {cost.amount.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => handleEdit(cost)}
                                            className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <PencilSquareIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cost.id)}
                                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {expenses.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-4 py-8 text-center text-slate-500 italic">
                                    No expenses recorded yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Form */}
            <form onSubmit={handleSubmit} className={cn(
                "p-4 rounded-xl border space-y-4 transition-all",
                editingId ? "bg-indigo-900/20 border-indigo-500/30" : "bg-slate-800/50 border-white/5"
            )}>
                <div className="flex items-center justify-between mb-2">
                    <h4 className={cn("text-xs font-bold uppercase tracking-wider", editingId ? "text-indigo-400" : "text-slate-400")}>
                        {editingId ? "Editing Expense" : "Add New Expense"}
                    </h4>
                    {editingId && (
                        <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                        >
                            <XMarkIcon className="w-3 h-3" /> Cancel
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Type Selection */}
                    <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-slate-400 mb-1">Expense Type</label>
                        <select
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pumpkin/50"
                            value={form.cost_type}
                            onChange={(e) => setForm({ ...form, cost_type: e.target.value })}
                        >
                            {costTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    {/* Calculation Method */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-400 mb-1">Billing</label>
                        <select
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pumpkin/50"
                            value={form.rate_type}
                            onChange={(e) => setForm({ ...form, rate_type: e.target.value })}
                        >
                            <option value="flat">Flat Fee</option>
                            <option value="per_hour">Per Hour</option>
                            <option value="per_person">Per Person</option>
                        </select>
                    </div>

                    {/* Dynamic Fields based on Billing Type */}
                    {form.rate_type !== 'flat' ? (
                        <>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                    {form.rate_type === 'per_hour' ? 'Rate/Hr (RM)' : 'Rate/Pax (RM)'}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pumpkin/50"
                                    placeholder="0.00"
                                    value={form.unit_price}
                                    onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                    {form.rate_type === 'per_hour' ? 'Hours' : 'Pax Count'}
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pumpkin/50"
                                    value={form.quantity}
                                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Total (RM)</label>
                                <input
                                    type="number"
                                    readOnly
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-pumpkin font-mono text-sm focus:outline-none cursor-not-allowed"
                                    value={form.amount}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="md:col-span-3">
                            <label className="block text-xs font-medium text-slate-400 mb-1">Amount (RM)</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pumpkin/50"
                                placeholder="0.00"
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            />
                        </div>
                    )}

                    {/* Description & Action */}
                    <div className="md:col-span-12 flex gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pumpkin/50"
                                placeholder="Description (Optional)"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                        <button
                            type="submit"
                            className={cn(
                                "text-white px-4 py-2 rounded-lg transition-colors shadow-lg flex items-center gap-2",
                                editingId ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20" : "bg-pumpkin hover:bg-pumpkin/90 shadow-pumpkin/20"
                            )}
                        >
                            {editingId ? <><PencilSquareIcon className="w-4 h-4" /> Update</> : <><PlusIcon className="w-4 h-4" /> Add Expense</>}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CostList;
