import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../components/AdminNavbar";
import { fetchEvents, updateEvent } from "../../services/api";
import { ADMIN_TOKEN } from "../../services/constants";

export default function ManageSessions() {
    const navigate = useNavigate();

    useEffect(() => {
        if (sessionStorage.getItem("adminUnlocked") !== "1") {
            navigate(`/admin/secret/${ADMIN_TOKEN}`);
        }
    }, [navigate]);

    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState("");
    const [sessions, setSessions] = useState([]);
    const [newSessionName, setNewSessionName] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [editingIdx, setEditingIdx] = useState(null);
    const [editingName, setEditingName] = useState("");

    useEffect(() => {
        loadEvents();
    }, []);

    useEffect(() => {
        if (selectedEventId) {
            const ev = events.find((e) => e._id === selectedEventId);
            if (ev) {
                setSessions(ev.sessions ? JSON.parse(JSON.stringify(ev.sessions)) : []);
            }
        }
    }, [selectedEventId, events]);

    const loadEvents = async () => {
        try {
            const res = await fetchEvents();
            const items = res.events || [];
            setEvents(items);
            if (items.length > 0 && !selectedEventId) {
                setSelectedEventId(items[0]._id);
            }
        } catch (err) {
            console.error("Failed to load events", err);
        }
    };

    const handleToggle = (index) => {
        const next = sessions.map((s, i) => ({
            ...s,
            isActive: i === index ? !s.isActive : (i !== index && !sessions[index].isActive ? false : s.isActive)
        }));

        // Single active logic: if we are turning this ONE on, turn others OFF
        if (!sessions[index].isActive) {
            next.forEach((s, i) => {
                if (i !== index) s.isActive = false;
            });
        }

        setSessions(next);
        autoSave(next);
    };

    const handleAdd = () => {
        if (!newSessionName.trim()) return;
        // Check duplicate
        if (
            sessions.some(
                (s) => s.name.toLowerCase() === newSessionName.trim().toLowerCase(),
            )
        ) {
            setMessage("Session name already exists.");
            setTimeout(() => setMessage(""), 3000);
            return;
        }

        const newSession = { name: newSessionName.trim(), isActive: true };
        // If we add an active session, deactivate others
        const next = sessions.map(s => ({ ...s, isActive: false }));
        const updatedSessions = [...next, newSession];

        setSessions(updatedSessions);
        setNewSessionName("");
        autoSave(updatedSessions);
    };

    const checkDuplicateEdit = (name, idx) => {
        return sessions.some(
            (s, i) => i !== idx && s.name.toLowerCase() === name.trim().toLowerCase(),
        );
    };

    const startEdit = (idx) => {
        setEditingIdx(idx);
        setEditingName(sessions[idx].name);
    };

    const saveEdit = (idx) => {
        if (!editingName.trim()) return;
        if (checkDuplicateEdit(editingName, idx)) {
            setMessage("Session name already exists.");
            setTimeout(() => setMessage(""), 3000);
            return;
        }
        const next = [...sessions];
        next[idx].name = editingName.trim();
        setSessions(next);
        setEditingIdx(null);
        setEditingName("");
        autoSave(next);
    };

    const cancelEdit = () => {
        setEditingIdx(null);
        setEditingName("");
    };

    const handleDelete = (index) => {
        if (!window.confirm("Are you sure you want to remove this session?")) return;
        const next = [...sessions];
        next.splice(index, 1);
        setSessions(next);
        autoSave(next);
    };

    const autoSave = async (currentSessions) => {
        if (!selectedEventId) return;
        setLoading(true);
        try {
            // Strip _id to ensure clean update of subdocs (re-create them)
            const cleanedSessions = currentSessions.map(({ _id, ...rest }) => rest);
            await updateEvent(selectedEventId, { sessions: cleanedSessions });

            // Subtle success indication
            setMessage("Saved...");
            setTimeout(() => setMessage(prev => prev === "Saved..." ? "" : prev), 2000);

            // reload events to ensure sync
            const res = await fetchEvents();
            const items = res.events || [];
            setEvents(items);
        } catch (err) {
            console.error(err);
            setMessage(err.message || "Auto-save failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white font-sans py-10 px-5">
            <AdminNavbar />
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="max-w-4xl mx-auto bg-gray-800/50 backdrop-blur-xl border border-gray-700 shadow-2xl rounded-2xl overflow-hidden"
            >
                <div className="bg-gray-800/50 px-6 pb-6 border-b border-gray-700">
                    <h1 className="text-3xl font-extrabold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent mb-2">
                        Manage Sessions
                    </h1>
                    <p className="text-sm text-gray-400">
                        Enable, disable, or add attendance sessions for events.
                    </p>
                </div>

                <div className="p-8">
                    <div className="mb-6">
                        <label className="text-sm text-gray-400 block mb-2">
                            Select Event
                        </label>
                        <select
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 text-white text-sm px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            {events.length === 0 && <option value="">No events found</option>}
                            {events.map((ev) => (
                                <option key={ev._id} value={ev._id}>
                                    {ev.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-4 mb-8">
                        <label className="text-sm text-gray-400 block">Sessions</label>
                        {sessions.length === 0 ? (
                            <div className="text-gray-500 italic text-sm p-4 border border-gray-700 border-dashed rounded-lg text-center">
                                No sessions configured. Add one below.
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {sessions.map((s, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between bg-gray-900/40 border border-gray-700 p-4 rounded-lg"
                                    >
                                        {editingIdx === idx ? (
                                            <div className="flex-1 flex items-center gap-2 mr-4">
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    className="flex-1 bg-gray-800 border border-gray-600 text-white text-sm px-2 py-1 rounded focus:outline-none focus:border-blue-500"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") saveEdit(idx);
                                                        if (e.key === "Escape") cancelEdit();
                                                    }}
                                                />
                                                <button
                                                    onClick={() => saveEdit(idx)}
                                                    className="text-green-400 hover:text-green-300"
                                                    title="Save"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="text-gray-400 hover:text-gray-300"
                                                    title="Cancel"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium text-gray-200">
                                                    {s.name}
                                                </span>
                                                <button
                                                    onClick={() => startEdit(idx)}
                                                    className="text-gray-500 hover:text-blue-400 transition-colors text-sm"
                                                    title="Rename"
                                                >
                                                    ✎
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4">
                                            {/* Custom Toggle Switch */}
                                            <button
                                                onClick={() => handleToggle(idx)}
                                                className={`relative w-14 h-7 rounded-full transition-colors duration-200 focus:outline-none ${s.isActive ? "bg-green-500" : "bg-gray-700"
                                                    }`}
                                                title={
                                                    s.isActive ? "Turn OFF session" : "Turn ON session"
                                                }
                                            >
                                                <span
                                                    className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${s.isActive ? "translate-x-7" : "translate-x-0"
                                                        }`}
                                                />
                                                <span
                                                    className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold pointer-events-none transition-opacity duration-200 ${s.isActive
                                                        ? "opacity-100 text-white pr-6" // Text on left when ON
                                                        : "opacity-0"
                                                        }`}
                                                >
                                                    ON
                                                </span>
                                                <span
                                                    className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold pointer-events-none transition-opacity duration-200 ${!s.isActive
                                                        ? "opacity-100 text-gray-300 pl-6" // Text on right when OFF
                                                        : "opacity-0"
                                                        }`}
                                                >
                                                    OFF
                                                </span>
                                            </button>

                                            <button
                                                onClick={() => handleDelete(idx)}
                                                className="text-red-400 hover:text-red-300 text-lg opacity-80 hover:opacity-100 transition-opacity p-1"
                                                title="Delete session"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mb-8">
                        <input
                            type="text"
                            value={newSessionName}
                            onChange={(e) => setNewSessionName(e.target.value)}
                            placeholder="New session name (e.g. 'Session 2', 'Lunch Break')"
                            className="flex-1 bg-gray-900 border border-gray-700 text-white text-sm px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newSessionName.trim()}
                            className="px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Add Session
                        </button>
                    </div>

                    {message && (
                        <div
                            className={`mb-6 p-4 rounded-lg text-sm border ${message.includes("success") || message.includes("Saved")
                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                : "bg-red-500/10 border-red-500/30 text-red-400"
                                }`}
                        >
                            {message}
                        </div>
                    )}

                    {/* Save button removed as it's now automatic */}
                </div>
            </motion.div>
        </div>
    );
}
