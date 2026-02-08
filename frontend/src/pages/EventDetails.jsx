import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeftIcon, CalendarIcon, BanknotesIcon, ChartBarIcon, PencilSquareIcon, CameraIcon } from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';
import CostList from '../components/CostList';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const EventDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [totalExpenses, setTotalExpenses] = useState(0);

    // Shutter Tracking State
    const [cameras, setCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState('');
    const [shutterCount, setShutterCount] = useState('');
    const [calculatingCost, setCalculatingCost] = useState(false);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await api.get(`/events/${id}`);
                setEvent(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        const fetchCameras = async () => {
            try {
                const res = await api.get('/cameras/');
                setCameras(res.data);
            } catch (err) {
                console.error("Failed to load cameras");
            }
        };

        fetchEvent();
        fetchCameras();
    }, [id]);

    const netProfit = event ? event.base_price - totalExpenses : 0;
    const profitMargin = event && event.base_price > 0 ? (netProfit / event.base_price) * 100 : 0;

    const handleUpdateRevenue = async () => {
        const newRevenue = prompt("Enter total revenue from PhotoHawk (RM):", event.base_price);
        if (newRevenue !== null && !isNaN(newRevenue)) {
            try {
                await api.patch(`/events/${event.id}/financials`, { base_price: parseFloat(newRevenue) });
                setEvent({ ...event, base_price: parseFloat(newRevenue) });
                toast.success("Revenue updated");
            } catch (err) {
                toast.error("Failed to update revenue");
            }
        }
    };

    const handleSaveShutterCost = async (e) => {
        e.preventDefault();
        if (!selectedCamera || !shutterCount) return;

        setCalculatingCost(true);
        try {
            const res = await api.post(`/events/${id}/shutter`, {
                camera_id: selectedCamera,
                shutter_count: parseInt(shutterCount)
            });

            toast.success(`Added shutter cost: RM ${res.data.cost.toFixed(2)}`);
            setShutterCount('');
            setSelectedCamera('');
            // Trigger refresh of expenses
            // Ideally we lift state or use context, but for now we reload the page or trigger a callback if we had one
            // A simple hack is to force update the total expenses component or just reload
            window.location.reload();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save shutter cost");
        } finally {
            setCalculatingCost(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading details...</div>;
    if (!event) return <div className="p-8 text-center text-slate-400">Event not found.</div>;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto space-y-8 pb-12"
        >
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/events')}
                    className="p-2 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-white">{event.name}</h1>
                    <div className="flex items-center gap-4 text-slate-400 text-sm mt-1">
                        <span className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            {event.event_date}
                        </span>
                        <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-semibold border uppercase",
                            event.status === 'completed' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10' :
                                event.status === 'shooting' ? 'border-pumpkin/20 text-pumpkin bg-pumpkin/10' :
                                    'border-blue-500/20 text-blue-400 bg-blue-500/10'
                        )}>
                            {event.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative group">
                    <p className="text-slate-400 text-sm mb-1">Total Revenue</p>
                    <div className="flex items-center gap-3">
                        <p className="text-2xl font-bold text-white font-mono">RM {event.base_price.toFixed(2)}</p>
                        <button
                            onClick={handleUpdateRevenue}
                            className="p-1.5 bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Update Revenue"
                        >
                            <PencilSquareIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <p className="text-slate-400 text-sm mb-1">Total Expenses</p>
                    <p className="text-2xl font-bold text-pumpkin font-mono">
                        RM {totalExpenses.toFixed(2)}
                    </p>
                </div>
                <div className={cn(
                    "border rounded-2xl p-6",
                    netProfit >= 0
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : "bg-rose-500/10 border-rose-500/20"
                )}>
                    <p className={cn("text-sm mb-1", netProfit >= 0 ? "text-emerald-300" : "text-rose-300")}>
                        Net Profit ({profitMargin.toFixed(1)}%)
                    </p>
                    <p className={cn(
                        "text-2xl font-bold font-mono",
                        netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                        RM {netProfit.toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Costs */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Shutter Tracking Section */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <CameraIcon className="w-5 h-5 text-indigo-400" />
                            <h3 className="font-bold text-white">Shutter Wear Tracking</h3>
                        </div>
                        <form onSubmit={handleSaveShutterCost} className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Select Camera</label>
                                <select
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                                    value={selectedCamera}
                                    onChange={(e) => setSelectedCamera(e.target.value)}
                                    required
                                >
                                    <option value="">Choose Camera...</option>
                                    {cameras.map(cam => (
                                        <option key={cam.id} value={cam.id}>
                                            {cam.model_name} (RM {(cam.purchase_price || 0).toLocaleString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-32">
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Shutter Count</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                                    placeholder="0"
                                    value={shutterCount}
                                    onChange={(e) => setShutterCount(e.target.value)}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={calculatingCost}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {calculatingCost ? "Saving..." : "Calculate Cost"}
                            </button>
                        </form>
                    </div>

                    <CostList eventId={event.id} onTotalChange={setTotalExpenses} />
                </div>

                {/* Right: Info & Client Portal */}
                <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                        <h3 className="font-bold text-white">Event Details</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            {event.description || "No description provided."}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/20 rounded-2xl p-6">
                        <h3 className="font-bold text-white mb-2">Client Portal</h3>
                        <p className="text-indigo-200 text-sm mb-4">
                            Share this link with your client to verify status.
                        </p>
                        <button
                            onClick={() => {
                                const url = `${window.location.origin}/p/${event.id}`;
                                navigator.clipboard.writeText(url);
                                toast.success("Link copied!");
                            }}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            Copy Client Link
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default EventDetails;
