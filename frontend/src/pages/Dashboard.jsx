import { useEffect, useState } from 'react';
import api from '../api/axios';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

const Dashboard = () => {
    const [summary, setSummary] = useState(null);
    const [chartsData, setChartsData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Mock data fallback if API fails (for pure UI check)
                const [summaryRes, chartsRes] = await Promise.all([
                    api.get('/dashboard/summary').catch(() => ({ data: { total_revenue: 0, total_expenses: 0, total_profit: 0, event_count: 0 } })),
                    api.get('/dashboard/charts').catch(() => ({ data: { financial_trend: [], camera_health: [] } }))
                ]);
                setSummary(summaryRes.data);
                setChartsData(chartsRes.data);
            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <div className="flex h-full items-center justify-center">
            <div className="animate-pulse bg-white/10 h-10 w-10 rounded-full"></div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="flex justify-between items-end border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight">Dashboard</h1>
                    <p className="text-slate-400 mt-2">Financial Overview & Health Check</p>
                </div>
                <span className="text-sm px-4 py-2 bg-white/5 rounded-full border border-white/10 text-slate-300">
                    {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <SummaryCard title="Total Revenue" value={`RM ${summary?.total_revenue?.toLocaleString()}`} color="text-softSage" border="border-softSage/20" />
                <SummaryCard title="Total Expenses" value={`RM ${summary?.total_expenses?.toLocaleString()}`} color="text-pumpkin" border="border-pumpkin/20" />
                <SummaryCard title="Net Profit" value={`RM ${summary?.total_profit?.toLocaleString()}`} color="text-oceanBlue" border="border-oceanBlue/20" />
                <SummaryCard title="Total Events" value={summary?.event_count} color="text-white" border="border-white/10" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm p-8 rounded-3xl border border-white/10 shadow-xl">
                    <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-pumpkin"></span>
                        Financial Trends
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartsData?.financial_trend}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ACC8A2" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ACC8A2" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FD802E" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#FD802E" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="month"
                                    stroke="#94a3b8"
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `RM ${value}`}
                                />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#233D4C', border: '1px solid #FD802E', borderRadius: '12px' }}
                                    itemStyle={{ color: '#e2e8f0' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#ACC8A2" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                <Area type="monotone" dataKey="expenses" stroke="#FD802E" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Camera Health */}
                <div className="bg-white/5 backdrop-blur-sm p-8 rounded-3xl border border-white/10 shadow-xl">
                    <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-pumpkin"></span>
                        Gear Status
                    </h3>
                    <div className="space-y-6">
                        {chartsData?.camera_health?.map((cam) => (
                            <div key={cam.name} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-slate-300">{cam.name}</span>
                                    <span className={cn(
                                        "font-bold",
                                        cam.status === 'Critical' ? "text-pumpkin" :
                                            cam.status === 'Warning' ? "text-lemonChiffon" : "text-softSage"
                                    )}>{cam.percentage}%</span>
                                </div>
                                <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${cam.percentage}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={cn(
                                            "h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                                            cam.status === 'Critical' ? "bg-pumpkin shadow-pumpkin/50" :
                                                cam.status === 'Warning' ? "bg-lemonChiffon shadow-lemonChiffon/50" : "bg-softSage shadow-softSage/50"
                                        )}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 text-right font-mono">
                                    {cam.usage.toLocaleString()} / <span className="text-slate-600">200k</span>
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

function SummaryCard({ title, value, color, border }) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className={cn("bg-white/5 backdrop-blur-md p-6 rounded-2xl border shadow-lg", border)}
        >
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">{title}</h3>
            <p className={cn("text-3xl font-bold mt-3 tracking-tight", color)}>{value}</p>
        </motion.div>
    )
}

export default Dashboard;
