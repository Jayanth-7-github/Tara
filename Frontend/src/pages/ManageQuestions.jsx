import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchEvents, updateEvent } from "../services/api";
import { checkLogin } from "../services/auth";

export default function ManageQuestions() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEventId, setSelectedEventId] = useState("");
    const [questions, setQuestions] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [user, setUser] = useState(null);

    // New Question Form State
    const [editingIndex, setEditingIndex] = useState(-1); // -1 means new, else index
    const [formData, setFormData] = useState({
        type: "mcq",
        text: "",
        marks: 1,
        options: ["", "", "", ""],
        correctAnswer: 0,
        initialCode: "",
        testCases: [{ input: "", expected: "" }],
        language: "c++",
    });

    useEffect(() => {
        const init = async () => {
            try {
                const auth = await checkLogin();
                if (!auth.authenticated || (auth.user.role !== "admin" && auth.user.role !== "member")) {
                    navigate("/main");
                    return;
                }
                setUser(auth.user);
                const data = await fetchEvents();
                const allEvents = data.events || [];
                // Filter events managed by this user
                const userEmail = (auth.user.email || "").toLowerCase().trim();
                const myEvents = allEvents.filter(e => (e.managerEmail || "").toLowerCase().trim() === userEmail);
                setEvents(myEvents);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [navigate]);

    useEffect(() => {
        if (selectedEventId) {
            const ev = events.find(e => e._id === selectedEventId || e.id === selectedEventId);
            if (ev) {
                setQuestions(ev.questions || []);
            }
        } else {
            setQuestions([]);
        }
    }, [selectedEventId, events]);

    const handleSaveQuestions = async () => {
        if (!selectedEventId) return;
        setIsSaving(true);
        setMessage({ text: "", type: "" });
        try {
            await updateEvent(selectedEventId, { questions });
            setMessage({ text: "Questions saved successfully!", type: "success" });
            updateLocalEvent(selectedEventId, questions);
        } catch (err) {
            console.error(err);
            setMessage({ text: "Failed to save questions.", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    const updateLocalEvent = (id, newQuestions) => {
        setEvents(prev => prev.map(e => (e._id === id || e.id === id) ? { ...e, questions: newQuestions } : e));
    };

    const resetForm = () => {
        setEditingIndex(-1);
        setFormData({
            type: "mcq",
            text: "",
            marks: 1,
            options: ["", "", "", ""],
            correctAnswer: 0,
            initialCode: "",
            testCases: [{ input: "", expected: "" }],
            language: "c++",
        });
    };

    const handleAddOrUpdate = () => {
        if (!formData.text) return;

        const newQ = { ...formData, id: Date.now().toString() };
        // Clean up based on type
        if (newQ.type === 'mcq') {
            delete newQ.initialCode;
            delete newQ.testCases;
            delete newQ.language;
        } else {
            delete newQ.options;
            delete newQ.correctAnswer;
        }

        if (editingIndex >= 0) {
            const updated = [...questions];
            updated[editingIndex] = newQ;
            setQuestions(updated);
        } else {
            setQuestions([...questions, newQ]);
        }
        resetForm();
    };

    const handleEdit = (index) => {
        setEditingIndex(index);
        const q = questions[index];
        setFormData({
            type: q.type || "mcq",
            text: q.text || "",
            marks: q.marks || 1,
            options: q.options || ["", "", "", ""],
            correctAnswer: q.correctAnswer || 0,
            initialCode: q.initialCode || "",
            testCases: q.testCases || [{ input: "", expected: "" }],
            language: q.language || "c++"
        });
    };

    const handleDelete = (index) => {
        const updated = questions.filter((_, i) => i !== index);
        setQuestions(updated);
    };

    if (loading) return <div className="text-white p-10">Loading...</div>;

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                        Manage Test Questions
                    </h1>
                    <button onClick={() => navigate("/events/dashboard")} className="text-gray-400 hover:text-white">
                        Back to Dashboard
                    </button>
                </div>

                {/* Event Selector */}
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 mb-8">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Select Event to Manage</label>
                    <select
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                    >
                        <option value="">-- Select an Event --</option>
                        {events.map(ev => (
                            <option key={ev._id || ev.id} value={ev._id || ev.id}>{ev.title}</option>
                        ))}
                    </select>
                </div>

                {selectedEventId && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left: Questions List */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold">Current Questions ({questions.length})</h2>
                                <button
                                    onClick={handleSaveQuestions}
                                    disabled={isSaving}
                                    className={`px-4 py-2 rounded-lg font-medium transition ${isSaving ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                >
                                    {isSaving ? "Saving..." : "Save Changes to DB"}
                                </button>
                            </div>
                            {message.text && (
                                <div className={`p-3 rounded ${message.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="space-y-3 h-[600px] overflow-y-auto pr-2">
                                {questions.length === 0 && <p className="text-gray-500">No questions added yet.</p>}
                                {questions.map((q, idx) => (
                                    <div key={idx} className="bg-gray-800 p-4 rounded-lg border border-gray-700 group hover:border-blue-500/50 transition relative">
                                        <div className="absolute top-2 right-2 space-x-2 opacity-0 group-hover:opacity-100 transition">
                                            <button onClick={() => handleEdit(idx)} className="text-blue-400 hover:text-blue-300">Edit</button>
                                            <button onClick={() => handleDelete(idx)} className="text-red-400 hover:text-red-300">Delete</button>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${q.type === 'coding' ? 'bg-purple-900 text-purple-300' : 'bg-blue-900 text-blue-300'}`}>
                                                {q.type}
                                            </span>
                                            <span className="text-xs text-gray-500">Marks: {q.marks}</span>
                                        </div>
                                        <p className="font-medium text-gray-200 line-clamp-2">{q.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Question Editor */}
                        <div className="bg-gray-800/80 p-6 rounded-xl border border-gray-700 h-fit sticky top-8">
                            <h2 className="text-xl font-semibold mb-6">{editingIndex >= 0 ? "Edit Question" : "Add New Question"}</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Question Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                                    >
                                        <option value="mcq">Multiple Choice (MCQ)</option>
                                        <option value="coding">Coding Problem</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Question Text</label>
                                    <textarea
                                        value={formData.text}
                                        onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white h-24"
                                        placeholder="Enter question here..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Marks</label>
                                    <input
                                        type="number"
                                        value={formData.marks}
                                        onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) || 1 })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                                    />
                                </div>

                                {formData.type === 'mcq' && (
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-gray-400">Options</label>
                                        {formData.options.map((opt, i) => (
                                            <div key={i} className="flex gap-2 items-center">
                                                <input
                                                    type="radio"
                                                    name="correctAnswer"
                                                    checked={formData.correctAnswer === i}
                                                    onChange={() => setFormData({ ...formData, correctAnswer: i })}
                                                />
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => {
                                                        const newOpts = [...formData.options];
                                                        newOpts[i] = e.target.value;
                                                        setFormData({ ...formData, options: newOpts });
                                                    }}
                                                    className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                                                    placeholder={`Option ${i + 1}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {formData.type === 'coding' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Test Cases</label>
                                            {formData.testCases.map((tc, i) => (
                                                <div key={i} className="flex gap-2 mb-2">
                                                    <input
                                                        placeholder="Input"
                                                        value={tc.input}
                                                        onChange={(e) => {
                                                            const newTCs = [...formData.testCases];
                                                            newTCs[i].input = e.target.value;
                                                            setFormData({ ...formData, testCases: newTCs });
                                                        }}
                                                        className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs"
                                                    />
                                                    <input
                                                        placeholder="Expected Output"
                                                        value={tc.expected}
                                                        onChange={(e) => {
                                                            const newTCs = [...formData.testCases];
                                                            newTCs[i].expected = e.target.value;
                                                            setFormData({ ...formData, testCases: newTCs });
                                                        }}
                                                        className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newTCs = formData.testCases.filter((_, idx) => idx !== i);
                                                            setFormData({ ...formData, testCases: newTCs });
                                                        }}
                                                        className="text-red-400"
                                                    >x</button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setFormData({ ...formData, testCases: [...formData.testCases, { input: "", expected: "" }] })}
                                                className="text-xs text-blue-400 mt-1"
                                            >
                                                + Add Test Case
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={handleAddOrUpdate}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition"
                                    >
                                        {editingIndex >= 0 ? "Update Question" : "Add Question"}
                                    </button>
                                    {editingIndex >= 0 && (
                                        <button
                                            onClick={resetForm}
                                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
