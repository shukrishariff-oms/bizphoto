
import { useEffect, useState } from 'react';
import api from '../api/axios';
import { motion } from 'framer-motion';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyDollarIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

const Finance = () => {
    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState({
        totalCredit: 0,
        totalDebit: 0,
        netProfit: 0
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'Credit',
        category: 'Capital',
        amount: '',
        description: ''
    });

    const fetchTransactions = async () => {
        try {
            const res = await api.get('/finance/transactions');
            setTransactions(res.data);

            // Calculate stats
            let credit = 0;
            let debit = 0;
            res.data.forEach(t => {
                if (t.type === 'Credit') credit += t.amount;
                if (t.type === 'Debit') debit += t.amount;
            });

            setStats({
                totalCredit: credit,
                totalDebit: debit,
                netProfit: credit - debit
            });
        } catch (err) {
            toast.error("Failed to load financial data");
        }
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();

        const amountValue = parseFloat(formData.amount);
        if (isNaN(amountValue) || amountValue <= 0) {
            toast.error("Please enter a valid positive amount");
            return;
        }

        try {
            if (editingTransaction) {
                await api.put(`/finance/transaction/${editingTransaction.id}`, {
                    ...formData,
                    amount: amountValue
                });
                toast.success("Transaction updated successfully");
            } else {
                await api.post('/finance/transaction', {
                    ...formData,
                    amount: amountValue
                });
                toast.success("Transaction added successfully");
            }
            setIsModalOpen(false);
            setEditingTransaction(null);
            setFormData({
                date: new Date().toISOString().split('T')[0],
                type: 'Credit',
                category: 'Capital',
                amount: '',
                description: ''
            });
            fetchTransactions();
        } catch (err) {
            console.error(err);
            const errorMessage = err.response?.data?.detail || err.message || "Failed to save transaction";
            toast.error(errorMessage);
        }
    };

    const handleEditTransaction = (transaction) => {
        setEditingTransaction(transaction);
        setFormData({
            date: transaction.date,
            type: transaction.type,
            category: transaction.category || 'Other',
            amount: transaction.amount,
            description: transaction.description
        });
        setIsModalOpen(true);
    };

    const handleDeleteTransaction = async (id) => {
        if (!window.confirm("Are you sure you want to delete this transaction?")) return;
        try {
            await api.delete(`/finance/transaction/${id}`);
            toast.success("Transaction deleted successfully");
            fetchTransactions();
        } catch (err) {
            toast.error("Failed to delete transaction");
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
        >
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white">Financial Overview</h1>
                    <p className="text-slate-400 mt-1">Track your income and expenses</p>
                </div>
                <button
                    onClick={() => {
                        setEditingTransaction(null);
                        setFormData({
                            date: new Date().toISOString().split('T')[0],
                            type: 'Credit',
                            category: 'Capital',
                            amount: '',
                            description: ''
                        });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/25 font-medium"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add Transaction
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/5 backdrop-blur-sm border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                            <ArrowTrendingUpIcon className="w-6 h-6 text-emerald-400" />
                        </div>
                        <span className="text-sm font-medium text-emerald-400 uppercase tracking-wider">Total Credit</span>
                    </div>
                    <div className="text-3xl font-bold text-white">RM {stats.totalCredit.toLocaleString()}</div>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/5 backdrop-blur-sm border border-rose-500/20 rounded-3xl p-6 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                            <ArrowTrendingDownIcon className="w-6 h-6 text-rose-400" />
                        </div>
                        <span className="text-sm font-medium text-rose-400 uppercase tracking-wider">Total Debit</span>
                    </div>
                    <div className="text-3xl font-bold text-white">RM {stats.totalDebit.toLocaleString()}</div>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/5 backdrop-blur-sm border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                            <CurrencyDollarIcon className="w-6 h-6 text-indigo-400" />
                        </div>
                        <span className="text-sm font-medium text-indigo-400 uppercase tracking-wider">Net Profit</span>
                    </div>
                    <div className={cn("text-3xl font-bold", stats.netProfit >= 0 ? "text-white" : "text-rose-400")}>
                        RM {stats.netProfit.toLocaleString()}
                    </div>
                </motion.div>
            </div>

            {/* Transactions Table */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden shadow-xl"
            >
                <div className="p-6 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions.map((t, i) => (
                                <tr key={t.id + i} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {new Date(t.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white font-medium">
                                        {t.description}
                                        {t.category && <span className="ml-2 text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{t.category}</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
                                            t.type === 'Credit'
                                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                        )}>
                                            {t.type}
                                        </span>
                                    </td>
                                    <td className={cn(
                                        "px-6 py-4 whitespace-nowrap text-sm font-bold font-mono",
                                        t.type === 'Credit' ? "text-emerald-400" : "text-rose-400"
                                    )}>
                                        {t.type === 'Credit' ? '+' : '-'} RM {t.amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 capitalize">
                                        {t.status}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {t.source === 'manual' && (
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditTransaction(t)}
                                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTransaction(t.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        No transactions found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            <Modal isOpen={isModalOpen} closeModal={() => setIsModalOpen(false)} title={editingTransaction ? "Edit Transaction" : "Add Transaction"}>
                <form onSubmit={handleAddTransaction} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Date</label>
                            <input
                                type="date"
                                required
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Type</label>
                            <select
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="Credit">Credit (Income)</option>
                                <option value="Debit">Debit (Expense)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Category</label>
                        <select
                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option value="Capital">Capital Injection</option>
                            <option value="Equipment">Equipment Purchase</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Operating">Operating Expenses</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Amount (RM)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Description</label>
                        <input
                            type="text"
                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                            placeholder="Optional details..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all"
                        >
                            {editingTransaction ? "Update Transaction" : "Add Transaction"}
                        </button>
                    </div>
                </form>
            </Modal>
        </motion.div>
    );
};

export default Finance;
