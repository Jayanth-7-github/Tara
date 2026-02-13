import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchEventById } from "../services/api";

export default function EventRegistrations() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const ev = await fetchEventById(eventId);
                if (!mounted) return;
                setEvent(ev);

                if (ev && ev.registeredStudents && Array.isArray(ev.registeredStudents)) {
                    setRegistrations(ev.registeredStudents);
                } else {
                    setRegistrations([]);
                }

            } catch (err) {
                console.error("Failed to load registrations:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => (mounted = false);
    }, [eventId]);

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

    if (!event) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
                <p className="text-red-400">Event not found.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                            {event.title}
                        </h1>
                        <p className="text-gray-400 mt-1">
                            Event Registrations • {registrations.length} Students
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
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {registrations.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                            No students found for this event.
                                        </td>
                                    </tr>
                                ) : (
                                    registrations.map((student, index) => (
                                        <tr key={index} className="hover:bg-gray-700/30 transition">
                                            <td className="px-6 py-4 font-medium text-white">
                                                {student.name || "Unknown"}
                                            </td>
                                            <td className="px-6 py-4 text-blue-400">
                                                {student.regno}
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 text-sm">
                                                {student.email}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500">
                                                {student.department ? `${student.department}, ` : ""}{student.year ? `Year ${student.year}` : ""}
                                                {student.college ? <div className="text-gray-600">{student.college}</div> : null}
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
