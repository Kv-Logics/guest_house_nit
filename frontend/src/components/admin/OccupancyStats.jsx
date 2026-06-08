import React, { useState, useEffect } from 'react';
import { Home, Users, CheckCircle, Clock, AlertTriangle, CalendarDays } from 'lucide-react';
import api from '../../services/api';

export default function OccupancyStats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/reception/occupancy');
                if (res.success) {
                    setStats(res.data);
                }
            } catch (error) {
                console.error("Failed to fetch occupancy stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="text-slate-500 font-bold p-4">Loading stats...</div>;
    if (!stats) return <div className="text-rose-500 font-bold p-4">Failed to load occupancy data</div>;

    const statCards = [
        { label: 'Total Rooms', value: stats.totalRooms, icon: Home, color: 'indigo' },
        { label: 'Occupied', value: stats.occupiedRooms, icon: Users, color: 'rose' },
        { label: 'Available', value: stats.availableRooms, icon: CheckCircle, color: 'emerald' },
        { label: "Today's Arrivals", value: stats.todaysArrivals, icon: CalendarDays, color: 'blue' },
        { label: "Today's Departures", value: stats.todaysDepartures, icon: Clock, color: 'amber' },
        { label: 'No Shows', value: stats.noShows, icon: AlertTriangle, color: 'red' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">
            {statCards.map((stat, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className={`p-3 rounded-xl mb-3 ${
                        stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                        stat.color === 'rose' ? 'bg-rose-50 text-rose-600' :
                        stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                        stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                        stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                        'bg-red-50 text-red-600'
                    }`}>
                        <stat.icon className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-black text-slate-800">{stat.value}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{stat.label}</span>
                </div>
            ))}
        </div>
    );
}
