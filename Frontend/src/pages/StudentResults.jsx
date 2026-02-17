import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { checkLogin } from "../services/auth";
import { getAllTestResults, fetchEvents } from "../services/api";

export default function StudentResults() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const eventParam = searchParams.get("event");

    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState([]);
    const [events, setEvents] = useState([]);
    const [filteredResults, setFilteredResults] = useState([]);
    const [selectedEventTitle, setSelectedEventTitle] = useState(eventParam || "All");
    const [expandedRows, setExpandedRows] = useState(new Set());

    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedRows(newExpanded);
    };

    useEffect(() => {
        let mounted = true;
        const verify = async () => {
            try {
                const res = await checkLogin();
                if (!mounted) return;
                if (!res.authenticated) {
                    navigate("/login", { replace: true });
                    return;
                }
                const user = res.user || {};
                if (user.role !== "admin" && user.role !== "member") {
                    navigate("/main", { replace: true });
                    return;
                }

                // Fetch Data
                try {
                    const [resultsResp, eventsResp] = await Promise.all([
                        getAllTestResults(),
                        fetchEvents()
                    ]);

                    const allResults = resultsResp.results || [];
                    const allEvents = eventsResp.events || eventsResp || [];

                    // Filter logic based on role
                    const userEmail = (user.email || "").toLowerCase().trim();
                    const isAdmin = user.role === "admin";

                    let visibleEvents = allEvents;
                    let visibleResults = allResults;

                    if (!isAdmin) {
                        // Event Managers only see their own events
                        visibleEvents = allEvents.filter(ev =>
                            (ev.managerEmail || "").toLowerCase().trim() === userEmail
                        );

                        // Filter results to only those belonging to managed events
                        const eventIds = new Set(visibleEvents.map(e => e._id || e.id));
                        const eventTitles = new Set(visibleEvents.map(e => (e.title || "").toLowerCase().trim()));

                        visibleResults = allResults.filter(r => {
                            // Match by ID if available
                            if (r.eventId && eventIds.has(r.eventId)) return true;
                            // Fallback: Match by title
                            const rTitle = (r.testTitle || "").toLowerCase().trim();
                            // Only match if title is non-empty and in our set
                            if (rTitle && eventTitles.has(rTitle)) return true;
                            return false;
                        });
                    }

                    setResults(visibleResults);
                    setEvents(visibleEvents);
                } catch (err) {
                    console.error("Data fetch failed:", err);
                }

            } catch (err) {
                console.error("Auth check failed:", err);
                navigate("/login", { replace: true });
            } finally {
                if (mounted) setLoading(false);
            }
        };
        verify();
        return () => (mounted = false);
    }, [navigate]);

    useEffect(() => {
        if (selectedEventTitle === "All") {
            setFilteredResults(results);
        } else {
            // Filter results where testTitle matches the selected event Title
            // NOTE: backend saves testTitle as "Event Assessment" by default or user specific title.
            // If we saved proper event titles, this works. If not, this might be tricky.
            // Assuming testTitle corresponds to event title for now.
            setFilteredResults(results.filter(r =>
                (r.testTitle || "").toLowerCase().trim() === selectedEventTitle.toLowerCase().trim()
            ));
        }
    }, [selectedEventTitle, results]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading results...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                            Student Results
                        </h1>
                        <p className="text-gray-400 mt-1">
                            View and manage assessment scores
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/events/dashboard")}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm"
                    >
                        &larr; Back to Dashboard
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl p-4 mb-8 flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-300">Filter by Event:</label>
                    <select
                        value={selectedEventTitle}
                        onChange={(e) => setSelectedEventTitle(e.target.value)}
                        className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                    >
                        <option value="All">All Events</option>
                        {events.map(ev => (
                            <option key={ev._id || ev.id} value={ev.title}>{ev.title}</option>
                        ))}
                    </select>
                </div>

                {/* Results Table */}
                <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-800 text-gray-400 text-xs font-medium uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Reg No</th>
                                    <th className="px-6 py-4">Assessments</th>
                                    <th className="px-6 py-4">Last Active</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredResults.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="5"
                                            className="px-6 py-12 text-center text-gray-500"
                                        >
                                            No results found for the selected filter.
                                        </td>
                                    </tr>
                                ) : (
                                    Object.values(filteredResults.reduce((acc, result) => {
                                        const userId = result.userId?._id || result.userId?.id || "unknown";
                                        if (!acc[userId]) {
                                            acc[userId] = {
                                                id: userId,
                                                user: result.userId,
                                                results: [],
                                                latestDate: result.createdAt
                                            };
                                        }
                                        acc[userId].results.push(result);
                                        if (new Date(result.createdAt) > new Date(acc[userId].latestDate)) {
                                            acc[userId].latestDate = result.createdAt;
                                        }
                                        return acc;
                                    }, {})).map((group) => {
                                        const isExpanded = expandedRows.has(group.id);

                                        return (
                                            <React.Fragment key={group.id}>
                                                <tr
                                                    className="hover:bg-gray-700/30 transition text-sm cursor-pointer"
                                                    onClick={() => toggleRow(group.id)}
                                                >
                                                    <td className="px-6 py-4 font-medium text-white">
                                                        {group.user?.name || "Unknown"}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-400">
                                                        {group.user?.regno || "N/A"}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-2">
                                                            {group.results.map((result, idx) => {
                                                                // Heuristic Score Logic
                                                                const isCoding = (result.testTitle || "").toLowerCase().includes("coding");
                                                                let effectiveTotal = result.totalQuestions;
                                                                if (result.score > result.totalQuestions && isCoding) {
                                                                    effectiveTotal = result.totalQuestions * 20;
                                                                }
                                                                const percentage = effectiveTotal > 0 ? (result.score / effectiveTotal) * 100 : 0;

                                                                return (
                                                                    <span
                                                                        key={idx}
                                                                        className={`px-2 py-1 rounded text-xs font-medium border border-opacity-20 ${percentage >= 70
                                                                            ? "bg-green-500/10 text-green-400 border-green-500"
                                                                            : percentage >= 40
                                                                                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500"
                                                                                : "bg-red-500/10 text-red-400 border-red-500"
                                                                            }`}
                                                                        title={`${result.testTitle}: ${result.score}/${effectiveTotal}`}
                                                                    >
                                                                        {result.testTitle?.split("|").pop().trim().substring(0, 15) || "Test"}: {result.score}/{effectiveTotal}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-400">
                                                        {new Date(group.latestDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <svg
                                                            className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr className="bg-gray-900/30">
                                                        <td colSpan="5" className="px-6 py-4">
                                                            <div className="space-y-6">
                                                                {group.results.map((result, idx) => (
                                                                    <div key={idx} className="border-b border-gray-700 pb-4 last:border-0 last:pb-0">
                                                                        <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                                            {result.testTitle}
                                                                        </h4>
                                                                        {result.answers ? (
                                                                            <div className="grid gap-2">
                                                                                {Object.entries(result.answers).map(([qId, ans], qIndex) => {
                                                                                    let content = ans;
                                                                                    let isCode = false;
                                                                                    let label = "Answer";

                                                                                    // Detect content type
                                                                                    if (typeof ans === 'object' && ans !== null) {
                                                                                        if (ans.code) {
                                                                                            content = ans.code;
                                                                                            isCode = true;
                                                                                            label = "Submitted Code";
                                                                                        } else {
                                                                                            content = JSON.stringify(ans, null, 2);
                                                                                            isCode = true;
                                                                                        }
                                                                                    } else if (String(ans).includes('\n') || String(ans).length > 40) {
                                                                                        isCode = true;
                                                                                        label = "Response";
                                                                                    } else {
                                                                                        // Likely MCQ option index or short text
                                                                                        label = "Selected Option";
                                                                                    }

                                                                                    return (
                                                                                        <div key={qId} className="bg-gray-800/80 rounded-lg p-4 border border-gray-700/50 hover:border-blue-500/30 transition shadow-sm">
                                                                                            <div className="flex items-center justify-between mb-3">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-500/30">
                                                                                                        {qIndex + 1}
                                                                                                    </span>
                                                                                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                                                                        Question {qIndex + 1}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <span className="text-xs text-gray-500 font-mono">ID: {qId}</span>
                                                                                            </div>

                                                                                            <div className="space-y-1">
                                                                                                <p className="text-xs text-gray-500 font-medium uppercase">{label}</p>
                                                                                                {isCode ? (
                                                                                                    <div className="bg-black/60 rounded-md p-3 font-mono text-sm text-gray-300 overflow-x-auto border border-gray-800 shadow-inner">
                                                                                                        <pre className="whitespace-pre-wrap">{String(content)}</pre>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div className="text-white text-lg font-medium bg-gray-900/30 p-3 rounded-md border border-gray-800/50 flex items-center gap-2">
                                                                                                        {!isNaN(content) ? (
                                                                                                            <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/20">
                                                                                                                {Number(content) + 1}
                                                                                                            </span>
                                                                                                        ) : (
                                                                                                            <span>{String(content)}</span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-gray-500 text-sm">No details available.</p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
