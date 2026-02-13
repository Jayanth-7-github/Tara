import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchEvents } from "../services/api";
import { checkLogin } from "../services/auth";

export default function AllRegistrations() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [registrations, setRegistrations] = useState([]);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const auth = await checkLogin();
                if (!auth.authenticated) {
                    navigate("/login");
                    return;
                }

                // Fetch events. The backend now populates `registeredStudents` if we are admin/manager.
                const evData = await fetchEvents();
                if (!mounted) return;

                const allEvents = evData.events || evData || [];
                const list = [];

                // Iterate all events (the backend handles permission filtering for the registeredStudents field)
                allEvents.forEach(ev => {
                    if (ev.registeredStudents && Array.isArray(ev.registeredStudents)) {
                        ev.registeredStudents.forEach(student => {
                            list.push({
                                regNo: student.regno,
                                name: student.name, // now we have name!
                                email: student.email,
                                department: student.department,
                                year: student.year,
                                college: student.college,
                                eventTitle: ev.title,
                                eventId: ev._id || ev.id,
                                registeredAt: student.registeredAt
                            });
                        });
                    }
                });

                setRegistrations(list);

            } catch (err) {
                console.error("Failed to load registrations:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => (mounted = false);
    }, [navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading registrations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                            All Registrations
                        </h1>
                        <p className="text-gray-400 mt-1">
                            Across all your events • {registrations.length} Records
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/events/dashboard")}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Dashboard
                    </button>
                </div>

                <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-800 text-gray-400 text-xs font-medium uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Reg No</th>
                                    <th className="px-6 py-4">Event</th>
                                    <th className="px-6 py-4">Details</th>
                                    <th className="px-6 py-4">Registered At</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {registrations.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            No registrations found.
                                        </td>
                                    </tr>
                                ) : (
                                    registrations.map((reg, index) => (
                                        <tr key={index} className="hover:bg-gray-700/30 transition">
                                            <td className="px-6 py-4 font-medium text-white">
                                                <div className="flex flex-col">
                                                    <span>{reg.name || "Unknown"}</span>
                                                    <span className="text-xs text-gray-500">{reg.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-300">
                                                {reg.regNo}
                                            </td>
                                            <td className="px-6 py-4 text-blue-400">
                                                {reg.eventTitle}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-400">
                                                {reg.department ? `${reg.department}, ` : ""}{reg.year ? `Year ${reg.year}` : ""}
                                                {reg.college ? <div className="text-gray-500">{reg.college}</div> : null}
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 text-sm">
                                                {reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString() : "-"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
