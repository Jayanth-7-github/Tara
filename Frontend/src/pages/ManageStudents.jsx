import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    searchStudents,
    fetchEvents,
    updateStudent,
    createStudent,
    createStudentsBulk,
    registerForEvent,
    API_BASE
} from "../services/api";
import { checkLogin } from "../services/auth";

export default function ManageStudents() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [user, setUser] = useState(null);
    const [students, setStudents] = useState([]);
    const [events, setEvents] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEventId, setSelectedEventId] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    // UI States
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [bulkMode, setBulkMode] = useState(false);
    const [bulkJson, setBulkJson] = useState("");
    const [notification, setNotification] = useState(null);

    // Form State
    const [formState, setFormState] = useState({
        regno: "",
        name: "",
        email: "",
        department: "",
        year: "",
        phone: "",
        teamName: "",
        role: "",
    });

    useEffect(() => {
        const verify = async () => {
            try {
                const res = await checkLogin();
                if (!res.authenticated) {
                    navigate("/login", { replace: true });
                    return;
                }
                const userData = res.user || {};
                setUser(userData);
                if (userData.role === "admin" || userData.role === "member") {
                    setAuthorized(true);
                } else {
                    navigate("/main", { replace: true });
                }
            } catch (err) {
                navigate("/login", { replace: true });
            } finally {
                setLoading(false);
            }
        };
        verify();
    }, [navigate]);

    useEffect(() => {
        if (authorized) {
            loadInitialData();
        }
    }, [authorized]);

    const loadInitialData = async () => {
        try {
            const evData = await fetchEvents();
            const allEvents = evData.events || evData || [];

            // Filter events based on logged-in user's managed events
            const userEmail = (user?.email || "").toLowerCase().trim();
            const isAdmin = user?.role === "admin";

            const managedEvents = isAdmin ? allEvents : allEvents.filter(ev => {
                const managerEmail = (ev.managerEmail || "").toLowerCase().trim();
                return managerEmail === userEmail;
            });

            setEvents(managedEvents);

            // If an event manager has events, automatically select the first one to scope the view
            let initialEvId = "";
            if (!isAdmin && managedEvents.length > 0) {
                initialEvId = managedEvents[0]._id || managedEvents[0].id;
                setSelectedEventId(initialEvId);
            }

            // Load initial students
            handleSearch("", initialEvId);
        } catch (err) {
            console.error("Failed to load data:", err);
        }
    };

    const handleSearch = async (query = searchQuery, evId = selectedEventId) => {
        setIsSearching(true);
        try {
            const data = await searchStudents(query, evId);
            setStudents(Array.isArray(data) ? data : data.students || []);
        } catch (err) {
            showNotification("Search failed", "error");
        } finally {
            setIsSearching(false);
        }
    };

    const showNotification = (message, type = "success") => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const resetForm = () => {
        setFormState({
            regno: "",
            name: "",
            email: "",
            department: "",
            year: "",
            phone: "",
            teamName: "",
            role: "",
        });
        setEditingStudent(null);
        setBulkMode(false);
        setBulkJson("");
    };

    const handleEdit = (student) => {
        setEditingStudent(student);
        setFormState({
            regno: student.regno || "",
            name: student.name || "",
            email: student.email || "",
            department: student.department || "",
            year: student.year || "",
            phone: student.phone || "",
            teamName: student.teamName || "",
            role: student.role || "",
        });
        setShowAddModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingStudent) {
                await updateStudent(formState.regno, formState);
                showNotification("Student updated successfully");
            } else {
                const res = await createStudent(formState);
                showNotification("Student created successfully");
                // If an event is selected, register the student for it
                if (selectedEventId) {
                    try {
                        await registerForEvent(selectedEventId, {
                            regno: formState.regno,
                            name: formState.name,
                            email: formState.email
                        });
                        showNotification("Student created & registered for event");
                    } catch (regErr) {
                        console.error("Registration failed:", regErr);
                        showNotification("Created but registration failed", "error");
                    }
                }
            }
            setShowAddModal(false);
            resetForm();
            handleSearch();
        } catch (err) {
            showNotification(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkSubmit = async () => {
        setLoading(true);
        try {
            const data = JSON.parse(bulkJson);
            const items = Array.isArray(data) ? data : [data];
            await createStudentsBulk(items);

            // If an event is selected, register all students for it
            if (selectedEventId) {
                try {
                    await Promise.all(
                        items.map(stu =>
                            registerForEvent(selectedEventId, {
                                regno: stu.regno || stu.rollNumber || stu.rollno,
                                name: stu.name,
                                email: stu.email
                            })
                        )
                    );
                    showNotification(`Uploaded and registered ${items.length} students`);
                } catch (regErr) {
                    console.error("Bulk registration failed:", regErr);
                    showNotification("Upload successful, but some registrations might have failed", "error");
                }
            } else {
                showNotification("Bulk upload successful");
            }

            setShowAddModal(false);
            resetForm();
            handleSearch();
        } catch (err) {
            showNotification("Invalid JSON or Upload failed", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleQuickRegister = async (student) => {
        if (!selectedEventId) return;
        try {
            await registerForEvent(selectedEventId, {
                regno: student.regno,
                name: student.name,
                email: student.email
            });
            showNotification(`${student.name} registered successfully`);
            handleSearch();
        } catch (err) {
            showNotification(err.message, "error");
        }
    };

    if (loading && !authorized) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white pb-12">
            {/* Header Section */}
            <div className="bg-gray-900/50 backdrop-blur-md border-b border-gray-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                                Student Management
                            </h1>
                            <p className="text-sm text-gray-400">View and manage all registered students</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => { resetForm(); setShowAddModal(true); }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-lg shadow-blue-500/20"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Student
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-blue-500/10 rounded-xl">
                                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <span className="text-xs font-medium text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">+12%</span>
                        </div>
                        <h3 className="text-gray-400 text-sm font-medium">Total Students</h3>
                        <p className="text-3xl font-bold mt-1">{students.length}</p>
                    </div>

                    <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-emerald-500/10 rounded-xl">
                                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">Active</span>
                        </div>
                        <h3 className="text-gray-400 text-sm font-medium">Events Registered</h3>
                        <p className="text-3xl font-bold mt-1">{events.length}</p>
                    </div>

                    <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-purple-500/10 rounded-xl">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className="text-xs font-medium text-purple-400 bg-purple-400/10 px-2 py-1 rounded-full">Recent</span>
                        </div>
                        <h3 className="text-gray-400 text-sm font-medium">New Listings</h3>
                        <p className="text-3xl font-bold mt-1">Recently Updated</p>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-4 mb-8">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search by Register Number or Name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-500"
                            />
                            <svg className="w-5 h-5 text-gray-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <select
                                value={selectedEventId}
                                onChange={(e) => setSelectedEventId(e.target.value)}
                                className="bg-gray-900/50 border border-gray-700 rounded-xl py-2.5 px-4 text-sm focus:border-blue-500 outline-none min-w-[200px]"
                            >
                                {user?.role === "admin" && <option value="">All Events</option>}
                                {events.map(ev => (
                                    <option key={ev._id} value={ev._id}>{ev.title}</option>
                                ))}
                                {user?.role !== "admin" && events.length === 0 && (
                                    <option value="" disabled>No events assigned</option>
                                )}
                            </select>
                            <button
                                onClick={() => handleSearch()}
                                disabled={isSearching}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl transition-all text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 min-w-[120px]"
                            >
                                {isSearching ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : "Filter"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-900/60 border-b border-gray-700/50">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Student Info</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Academic Details</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Registrations</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {students.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 bg-gray-900/50 rounded-full">
                                                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                    </svg>
                                                </div>
                                                <p className="text-gray-500 font-medium">No students found matching your search</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    students.map((student) => (
                                        <tr key={student._id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-600 to-cyan-400 flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/20">
                                                        {student.name ? student.name.charAt(0).toUpperCase() : "?"}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-white group-hover:text-blue-400 transition-colors uppercase">{student.name}</div>
                                                        <div className="text-xs text-blue-400 font-mono mt-0.5">{student.regno}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-sm text-gray-300">{student.department || "N/A"}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">{student.year ? `Year ${student.year}` : "Batch not specified"}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {student.registrations && student.registrations.length > 0 ? (
                                                        student.registrations.slice(0, 2).map((reg, i) => (
                                                            <span key={i} className="text-[10px] bg-gray-700/50 border border-gray-600 text-gray-300 px-2 py-0.5 rounded-full">
                                                                {reg.eventName || "Event"}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-[10px] text-gray-600 italic">No events</span>
                                                    )}
                                                    {student.registrations && student.registrations.length > 2 && (
                                                        <span className="text-[10px] text-blue-400">+{student.registrations.length - 2} more</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right flex items-center justify-end gap-2 text-right">
                                                {selectedEventId && student.registrations && !student.registrations.some(r => r.event === selectedEventId) && (
                                                    <button
                                                        onClick={() => handleQuickRegister(student)}
                                                        className="px-3 py-1 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white text-[10px] font-bold rounded-lg transition-all border border-blue-500/20"
                                                        title="Register for selected event"
                                                    >
                                                        REGISTER
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(student)}
                                                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                                                    title="Edit Student"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                                <h3 className="text-xl font-bold">
                                    {editingStudent ? "Edit Student" : "Add New Student"}
                                </h3>
                                <div className="flex gap-2">
                                    {!editingStudent && (
                                        <button
                                            onClick={() => setBulkMode(!bulkMode)}
                                            className="text-xs font-medium text-blue-400 hover:underline"
                                        >
                                            {bulkMode ? "Switch to Manual" : "Switch to Bulk JSON"}
                                        </button>
                                    )}
                                    <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 max-h-[70vh] overflow-y-auto">
                                {!editingStudent && selectedEventId && (
                                    <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Target Event</div>
                                                <div className="text-sm font-medium text-white italic">
                                                    {events.find(e => e._id === selectedEventId)?.title || "Selected Event"}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-blue-400 font-medium bg-blue-400/10 px-2 py-0.5 rounded-full">Register Mode</div>
                                    </div>
                                )}
                                {bulkMode ? (
                                    <div className="space-y-4">
                                        <p className="text-sm text-gray-400 mb-4">
                                            Paste a JSON array of student objects.
                                            Required fields: <code className="text-blue-400 text-xs font-mono">regno</code>,
                                            <code className="text-blue-400 text-xs font-mono">name</code>
                                        </p>
                                        <textarea
                                            value={bulkJson}
                                            onChange={(e) => setBulkJson(e.target.value)}
                                            placeholder='[{"regno": "123", "name": "John"}, ...]'
                                            className="w-full h-64 bg-black/50 border border-gray-800 rounded-xl p-4 font-mono text-sm text-blue-300 outline-none focus:border-blue-500"
                                        />
                                        <button
                                            onClick={handleBulkSubmit}
                                            disabled={loading || !bulkJson.trim()}
                                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-all disabled:opacity-50"
                                        >
                                            {loading ? "Processing..." : "Import Bulk Data"}
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Register Number *</label>
                                                <input
                                                    required
                                                    readOnly={!!editingStudent}
                                                    value={formState.regno}
                                                    onChange={(e) => setFormState({ ...formState, regno: e.target.value })}
                                                    className={`w-full bg-black/50 border border-gray-800 rounded-xl py-2 px-4 outline-none focus:border-blue-500 transition-all ${editingStudent ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name *</label>
                                                <input
                                                    required
                                                    value={formState.name}
                                                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                                                    className="w-full bg-black/50 border border-gray-800 rounded-xl py-2 px-4 outline-none focus:border-blue-500 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</label>
                                                <input
                                                    type="email"
                                                    value={formState.email}
                                                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                                                    className="w-full bg-black/50 border border-gray-800 rounded-xl py-2 px-4 outline-none focus:border-blue-500 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</label>
                                                <input
                                                    value={formState.phone}
                                                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                                                    className="w-full bg-black/50 border border-gray-800 rounded-xl py-2 px-4 outline-none focus:border-blue-500 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Department</label>
                                                <input
                                                    value={formState.department}
                                                    onChange={(e) => setFormState({ ...formState, department: e.target.value })}
                                                    className="w-full bg-black/50 border border-gray-800 rounded-xl py-2 px-4 outline-none focus:border-blue-500 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Year</label>
                                                <input
                                                    value={formState.year}
                                                    onChange={(e) => setFormState({ ...formState, year: e.target.value })}
                                                    className="w-full bg-black/50 border border-gray-800 rounded-xl py-2 px-4 outline-none focus:border-blue-500 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-gray-800 flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowAddModal(false)}
                                                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex-2 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
                                            >
                                                {loading ? "Saving..." : (editingStudent ? "Save Changes" : "Create Student")}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Notifications */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 ${notification.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
                            }`}
                    >
                        <span className="font-medium text-white">{notification.message}</span>
                        <button onClick={() => setNotification(null)} className="text-white/50 hover:text-white">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
