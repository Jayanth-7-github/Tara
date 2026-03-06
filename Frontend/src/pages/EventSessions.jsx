import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { checkLogin } from "../services/auth";
import { fetchEvents, getRoles, updateEvent } from "../services/api";

export default function EventSessions() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [activeTab, setActiveTab] = useState("student");
  const [sessions, setSessions] = useState([]);
  const [newSessionName, setNewSessionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editingIdx, setEditingIdx] = useState(null);
  const [editingName, setEditingName] = useState("");

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
        const userData = res.user || {};
        setUser(userData);
        const role = userData.role;
        if (role === "admin" || role === "member") {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        if (mounted) navigate("/login", { replace: true });
      } finally {
        if (mounted) setLoadingAuth(false);
      }
    };
    verify();
    return () => (mounted = false);
  }, [navigate]);

  useEffect(() => {
    if (authorized && user) {
      loadEvents();
    }
  }, [authorized, user]);

  useEffect(() => {
    if (selectedEventId) {
      const ev = events.find((e) => e._id === selectedEventId);
      if (ev) {
        const list =
          activeTab === "normal"
            ? ev.sessions
            : ev.studentSessions || ev.sessions; // fallback for older events
        setSessions(list ? JSON.parse(JSON.stringify(list)) : []);
      }
    }
  }, [selectedEventId, events, activeTab]);

  const loadEvents = async () => {
    try {
      const res = await fetchEvents();
      const allEvents = res.events || res || [];

      const rc = await getRoles().catch(() => null);
      const eventManagersByEvent = rc?.eventManagersByEvent || {};

      const userEmail = (user.email || "").toLowerCase().trim();

      const isConfiguredManagerFor = (ev) => {
        const titleKey = ev?.title ? String(ev.title).trim() : "";
        const idKey = ev?._id ? String(ev._id).trim() : "";
        const keys = [titleKey, idKey].filter(Boolean);

        for (const k of keys) {
          const list = Array.isArray(eventManagersByEvent?.[k])
            ? eventManagersByEvent[k]
            : [];
          const normalized = list.map((x) => String(x).toLowerCase().trim());
          if (normalized.includes(userEmail)) return true;
        }
        return false;
      };

      const managedEvents = allEvents.filter((ev) => {
        if (user?.role === "admin") return true;
        const managerEmail = (ev.managerEmail || "").toLowerCase().trim();
        return managerEmail === userEmail || isConfiguredManagerFor(ev);
      });

      setEvents(managedEvents);
      if (managedEvents.length > 0 && !selectedEventId) {
        setSelectedEventId(managedEvents[0]._id);
      }
    } catch (err) {
      console.error("Failed to load events", err);
    }
  };

  const filterManagedEvents = (allEvents, rc) => {
    const eventManagersByEvent = rc?.eventManagersByEvent || {};
    const userEmail = (user?.email || "").toLowerCase().trim();

    const isConfiguredManagerFor = (ev) => {
      const titleKey = ev?.title ? String(ev.title).trim() : "";
      const idKey = ev?._id ? String(ev._id).trim() : "";
      const keys = [titleKey, idKey].filter(Boolean);

      for (const k of keys) {
        const list = Array.isArray(eventManagersByEvent?.[k])
          ? eventManagersByEvent[k]
          : [];
        const normalized = list.map((x) => String(x).toLowerCase().trim());
        if (normalized.includes(userEmail)) return true;
      }
      return false;
    };

    return (Array.isArray(allEvents) ? allEvents : []).filter((ev) => {
      if (user?.role === "admin") return true;
      const managerEmail = (ev?.managerEmail || "").toLowerCase().trim();
      return managerEmail === userEmail || isConfiguredManagerFor(ev);
    });
  };

  const handleToggle = (index) => {
    const next = sessions.map((s, i) => ({
      ...s,
      isActive:
        i === index
          ? !s.isActive
          : i !== index && !sessions[index].isActive
            ? false
            : s.isActive,
    }));

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
    const next = sessions.map((s) => ({ ...s, isActive: false }));
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
    if (!window.confirm("Are you sure you want to remove this session?"))
      return;
    const next = [...sessions];
    next.splice(index, 1);
    setSessions(next);
    autoSave(next);
  };

  const autoSave = async (currentSessions) => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const cleanedSessions = currentSessions.map(({ _id, ...rest }) => rest);
      if (activeTab === "normal") {
        await updateEvent(selectedEventId, { sessions: cleanedSessions });
      } else {
        await updateEvent(selectedEventId, {
          studentSessions: cleanedSessions,
        });
      }

      setMessage("Saved...");
      setTimeout(
        () => setMessage((prev) => (prev === "Saved..." ? "" : prev)),
        2000,
      );

      const res = await fetchEvents();
      const allEvents = res.events || res || [];
      const rc = await getRoles().catch(() => null);
      setEvents(filterManagedEvents(allEvents, rc));
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Auto-save failed");
    } finally {
      setLoading(false);
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-400 mb-6">
            You need to be an event manager to access this page.
          </p>
          <button
            onClick={() => navigate("/main")}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white font-sans py-10 px-5">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-4xl mx-auto bg-gray-800/50 backdrop-blur-xl border border-gray-700 shadow-2xl rounded-2xl overflow-hidden"
      >
        <div className="bg-gray-800/50 px-6 py-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent mb-2">
              Manage Event Sessions
            </h1>
            <p className="text-sm text-gray-400">
              This page is only for Event Managers and Admins.
            </p>
          </div>
          <button
            onClick={() => navigate("/events/dashboard")}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-sm"
          >
            Back to Dashboard
          </button>
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

          <div className="mb-6">
            <div className="inline-flex rounded-lg border border-gray-700 bg-gray-900/60 p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("normal");
                  setMessage("");
                  setEditingIdx(null);
                  setEditingName("");
                }}
                className={
                  "px-4 py-2 rounded-md text-sm transition " +
                  (activeTab === "normal"
                    ? "bg-gray-700 text-white"
                    : "text-gray-300 hover:bg-gray-800")
                }
              >
                Normal Sessions
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("student");
                  setMessage("");
                  setEditingIdx(null);
                  setEditingName("");
                }}
                className={
                  "px-4 py-2 rounded-md text-sm transition " +
                  (activeTab === "student"
                    ? "bg-gray-700 text-white"
                    : "text-gray-300 hover:bg-gray-800")
                }
              >
                Student Sessions
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {activeTab === "student"
                ? "Student Sessions appear in the Student Dashboard attendance popup."
                : "Normal Sessions are used for the regular attendance module."}
            </p>
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
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      s.isActive
                        ? "bg-blue-900/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                        : "bg-gray-900/50 border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <button
                        onClick={() => handleToggle(idx)}
                        className={`w-12 h-6 rounded-full relative transition-colors ${
                          s.isActive ? "bg-blue-500" : "bg-gray-600"
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            s.isActive ? "translate-x-6" : "translate-x-0"
                          }`}
                        />
                      </button>
                      {editingIdx === idx ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="bg-gray-800 border border-gray-600 text-white text-sm px-3 py-1 rounded focus:outline-none focus:border-blue-400 flex-1"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEdit(idx)}
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-gray-400 hover:text-gray-300 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`font-medium ${s.isActive ? "text-blue-300" : "text-gray-300"}`}
                        >
                          {s.name}
                        </span>
                      )}
                    </div>
                    {editingIdx !== idx && (
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-md ${s.isActive ? "bg-blue-500/20 text-blue-300" : "bg-gray-800 text-gray-500"}`}
                        >
                          {s.isActive ? "Active" : "Inactive"}
                        </span>
                        <button
                          onClick={() => startEdit(idx)}
                          className="text-gray-400 hover:text-blue-400 transition"
                          title="Edit Session"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(idx)}
                          className="text-gray-400 hover:text-red-400 transition"
                          title="Delete Session"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-700">
            <label className="text-sm text-gray-400 block mb-3">
              Add New Session
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="e.g., Morning Session, Day 1"
                className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <button
                onClick={handleAdd}
                disabled={!newSessionName.trim() || loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                )}
                Add
              </button>
            </div>
            {message && (
              <p
                className={`mt-3 text-sm ${message.includes("Saved") ? "text-green-400" : "text-red-400"}`}
              >
                {message}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
