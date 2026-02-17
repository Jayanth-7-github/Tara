import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../components/AdminNavbar";
import { updateAttendance, checkAttendance, fetchEvents } from "../../services/api";
import { ADMIN_TOKEN } from "../../services/constants";

export default function UpdateAttendance() {
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("adminUnlocked") !== "1") {
      navigate("/admin/secret");
    }
  }, [navigate]);

  const [regno, setRegno] = useState("");
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [selectedSessionName, setSelectedSessionName] = useState("");

  const [currentStatus, setCurrentStatus] = useState(null); // { isPresent, time, name }
  const [loading, setLoading] = useState(false);
  const [loadingLoad, setLoadingLoad] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Fetch events on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchEvents();
        const items = res?.events || [];
        setEvents(items);
        if (items.length > 0) {
          setSelectedEventId(items[0]._id);
        }
      } catch (err) {
        console.error("Failed to load events in UpdateAttendance:", err);
      }
    })();
  }, []);

  // Update sessions when event changes
  useEffect(() => {
    const ev = events.find((e) => e._id === selectedEventId);
    if (ev) {
      const sessList = ev.sessions || [];
      setSessions(sessList);
      if (sessList.length > 0) {
        setSelectedSessionName(sessList[0].name);
      } else {
        setSelectedSessionName("");
      }
    } else {
      setSessions([]);
      setSelectedSessionName("");
    }
  }, [selectedEventId, events]);

  async function handleLoad() {
    setError(null);
    setMessage(null);
    setCurrentStatus(null);

    if (!regno.trim()) {
      setError("Please provide a regno");
      return;
    }
    const ev = events.find((e) => e._id === selectedEventId);
    if (!ev) {
      setError("Please select an event");
      return;
    }

    setLoadingLoad(true);
    try {
      const resp = await checkAttendance(regno.trim(), ev.title);
      const records = resp?.records || [];
      const targetSessionName = selectedSessionName || "default";
      const sessionRecord = records.find((r) => r.sessionName === targetSessionName);

      if (sessionRecord) {
        setCurrentStatus({
          name: sessionRecord.name,
          isPresent: sessionRecord.isPresent,
          timestampText: sessionRecord.timestampText || new Date(sessionRecord.timestamp).toLocaleString(),
        });
        setMessage("Student record loaded.");
      } else {
        // Not marked yet
        // If other records exist, get name
        const name = records.length > 0 ? records[0].name : "Unknown/New";
        setCurrentStatus({
          name,
          isPresent: false,
          isNew: true
        });
        setMessage("No attendance found for this session. You can marks it below.");
      }
    } catch (err) {
      setError(err.message || "Failed to load status");
    } finally {
      setLoadingLoad(false);
    }
  }

  async function handleSubmit(isPresent) {
    setError(null);
    setMessage(null);
    if (!regno.trim()) {
      setError("Please provide a regno");
      return;
    }
    const ev = events.find((e) => e._id === selectedEventId);
    if (!ev) return;

    setLoading(true);
    try {
      const body = {
        eventName: ev.title,
        sessionName: selectedSessionName,
        isPresent: isPresent,
      };

      const res = await updateAttendance(regno.trim(), body);
      setMessage(res.message || `Marked ${isPresent ? "Present" : "Absent"}`);

      // Auto-reload status to confirm
      handleLoad();
    } catch (err) {
      setError(err.message || "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white font-sans py-10 px-5">
      <AdminNavbar />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto bg-gray-800/50 backdrop-blur-xl border border-gray-700 shadow-2xl rounded-2xl overflow-hidden"
      >
        <div className="bg-gray-800/50 px-6 pb-6 border-b border-gray-700">
          <h1 className="text-3xl font-extrabold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent mb-2">
            Manage Attendance
          </h1>
          <p className="text-sm text-gray-400">
            Manually mark a student as Present or Absent for a specific session.
          </p>
        </div>

        <div className="p-8 space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Select Event</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white text-sm outline-none focus:border-blue-500"
              >
                {events.map((ev) => (
                  <option key={ev._id} value={ev._id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Select Session</label>
              <select
                value={selectedSessionName}
                onChange={(e) => setSelectedSessionName(e.target.value)}
                className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white text-sm outline-none focus:border-blue-500"
              >
                {sessions.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              value={regno}
              onChange={(e) => setRegno(e.target.value)}
              placeholder="Enter Registration Number (e.g. 9900...)"
              className="flex-1 p-3 rounded bg-gray-900/50 border border-gray-700 text-white outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            />
            <button
              onClick={handleLoad}
              disabled={loadingLoad}
              className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              {loadingLoad ? "..." : "Load"}
            </button>
          </div>

          {/* Status Display */}
          {currentStatus && (
            <div className="bg-gray-800/40 p-4 rounded-lg border border-gray-700 animate-fade-in-up">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white">{currentStatus.name}</h3>
                  <p className="text-sm text-gray-400">Reg: {regno}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${currentStatus.isNew ? "bg-gray-700 text-gray-300" :
                  currentStatus.isPresent ? "bg-green-900/40 text-green-400 border border-green-800" : "bg-red-900/40 text-red-400 border border-red-800"
                  }`}>
                  {currentStatus.isNew ? "NOT MARKED" : currentStatus.isPresent ? "PRESENT" : "ABSENT"}
                </div>
              </div>
              {!currentStatus.isNew && currentStatus.isPresent && (
                <p className="text-xs text-gray-500 mt-2">Time: {currentStatus.timestampText}</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
            <button
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-900/20 transition-all active:scale-95"
            >
              Mark Present
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-900/20 transition-all active:scale-95"
            >
              Mark Absent
            </button>
          </div>

          {message && (
            <div className={`p-3 rounded text-sm ${message.toLowerCase().includes("absent") ? "bg-red-900/20 text-red-300 border border-red-900/50" : "bg-green-900/20 text-green-300 border border-green-900/50"}`}>
              {message}
            </div>
          )}
          {error && (
            <div className="p-3 rounded bg-red-900/20 border border-red-900/50 text-red-300 text-sm">
              {error}
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}
