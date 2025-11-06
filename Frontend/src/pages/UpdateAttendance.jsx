import React, { useState } from "react";
import { motion } from "framer-motion";
import AdminNavbar from "../components/AdminNavbar";
import { updateAttendance, checkAttendance } from "../services/api";

export default function UpdateAttendance() {
  const [regno, setRegno] = useState("");
  const [eventName, setEventName] = useState("Vintra"); // current event to target for update
  const [newEventName, setNewEventName] = useState(""); // rename to this event if set
  const [isPresent, setIsPresent] = useState(true);
  const [name, setName] = useState("");
  const [date, setDate] = useState(""); // YYYY-MM-DD
  const [time, setTime] = useState(""); // HH:mm
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const [loadingLoad, setLoadingLoad] = useState(false);

  async function handleUpdate() {
    setError(null);
    setMessage(null);
    if (!regno.trim()) {
      setError("Please provide a regno");
      return;
    }
    setLoading(true);
    try {
      const body = { eventName };
      // include fields only when provided
      if (typeof name === "string" && name.trim()) body.name = name.trim();
      if (typeof isPresent === "boolean") body.isPresent = isPresent;
      if (date && time) {
        body.date = date;
        body.time = time;
      }
      if (newEventName && newEventName.trim())
        body.newEventName = newEventName.trim();

      const res = await updateAttendance(regno.trim(), body);
      setMessage(res.message || "Attendance updated");
    } catch (err) {
      setError(err.message || "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  async function handleLoad() {
    setError(null);
    setMessage(null);
    if (!regno.trim()) {
      setError("Please provide a regno to load");
      return;
    }
    setLoadingLoad(true);
    try {
      const resp = await checkAttendance(
        regno.trim(),
        eventName.trim() || "default"
      );
      if (!resp || !resp.isMarked) {
        setError("No attendance record found for this regno/event.");
        setName("");
        setIsPresent(true);
        setDate("");
        setTime("");
        return;
      }
      const a = resp.attendance || resp;
      setName(a.name || "");
      setIsPresent(Boolean(a.isPresent));
      // parse timestampText like 'YYYY-MM-DD HH:mm'
      if (a.timestampText) {
        const parts = a.timestampText.split(" ");
        setDate(parts[0] || "");
        setTime(parts[1] || "");
      } else if (a.timestamp) {
        const d = new Date(a.timestamp);
        const pad = (n) => String(n).padStart(2, "0");
        setDate(
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
        );
        setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
      } else {
        setDate("");
        setTime("");
      }
    } catch (err) {
      setError(err.message || "Failed to load attendance");
    } finally {
      setLoadingLoad(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900 text-white font-sans py-10 px-5">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto bg-gray-800/60 backdrop-blur-xl border border-gray-700/70 shadow-2xl rounded-2xl p-8"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-400">
              Update Attendance
            </h1>
            <p className="text-gray-400 text-sm">
              Set present/absent for a student by regno.
            </p>
          </div>
          <AdminNavbar />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300">RegNo</label>
              <input
                value={regno}
                onChange={(e) => setRegno(e.target.value)}
                className="w-full mt-1 p-2 rounded bg-gray-900/40 border border-gray-700 text-white"
                placeholder="e.g. R001"
              />
            </div>

            <div>
              <label className="text-sm text-gray-300">Current Event</label>
              <input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full mt-1 p-2 rounded bg-gray-900/40 border border-gray-700 text-white"
                placeholder="e.g. Vintra"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <button
              onClick={handleLoad}
              disabled={loadingLoad}
              className="w-full sm:w-auto px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
            >
              {loadingLoad ? "Loading..." : "Load Current"}
            </button>

            <button
              onClick={handleUpdate}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? "Updating..." : "Update"}
            </button>

            <button
              onClick={() => {
                setRegno("");
                setEventName("Vintra");
                setNewEventName("");
                setName("");
                setIsPresent(true);
                setDate("");
                setTime("");
                setMessage(null);
                setError(null);
              }}
              className="w-full sm:w-auto px-3 py-2 rounded bg-gray-700 text-gray-200"
            >
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 p-2 rounded bg-gray-900/40 border border-gray-700 text-white"
                placeholder="Student name"
              />
            </div>

            <div>
              <label className="text-sm text-gray-300">
                New Event Name (optional)
              </label>
              <input
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                className="w-full mt-1 p-2 rounded bg-gray-900/40 border border-gray-700 text-white"
                placeholder="Change to new event name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 p-2 rounded bg-gray-900/40 border border-gray-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-300">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full mt-1 p-2 rounded bg-gray-900/40 border border-gray-700 text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPresent}
                onChange={(e) => setIsPresent(e.target.checked)}
              />
              <span className="text-sm text-gray-300">Present</span>
            </label>
          </div>

          {message && <div className="text-green-300">{message}</div>}
          {error && <div className="text-red-300">{error}</div>}
        </div>
      </motion.div>
    </div>
  );
}
