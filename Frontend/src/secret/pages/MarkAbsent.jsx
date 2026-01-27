import React, { useState } from "react";
import { motion } from "framer-motion";
import AdminNavbar from "../components/AdminNavbar";
import { updateAttendance } from "../../services/api";

export default function MarkAbsent() {
  const [regno, setRegno] = useState("");
  const [eventName, setEventName] = useState("Vintra");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  async function handleMarkAbsent() {
    setError(null);
    setMessage(null);
    if (!regno.trim()) {
      setError("Please provide a regno");
      return;
    }
    setLoading(true);
    try {
      const body = { eventName, isPresent: false };
      const res = await updateAttendance(regno.trim(), body);
      setMessage(res.message || "Marked absent");
    } catch (err) {
      setError(err.message || "Failed to mark absent");
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
        className="max-w-3xl mx-auto bg-gray-800/50 backdrop-blur-xl border border-gray-700 shadow-2xl rounded-2xl overflow-hidden"
      >
        <div className="bg-gray-800/50 px-6 pb-6 border-b border-gray-700">
          <h1 className="text-3xl font-extrabold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent mb-2">
            Mark Absent
          </h1>
          <p className="text-sm text-gray-400">
            Set attendance status to absent for a student by registration number
          </p>
        </div>
        <div className="p-8">
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
                <label className="text-sm text-gray-300">Event Name</label>
                <input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full mt-1 p-2 rounded bg-gray-900/40 border border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleMarkAbsent}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? "Updating..." : "Mark Absent"}
              </button>
              <button
                onClick={() => {
                  setRegno("");
                  setEventName("Vintra");
                  setMessage(null);
                  setError(null);
                }}
                className="w-full sm:w-auto px-3 py-2 rounded bg-gray-700 text-gray-200"
              >
                Reset
              </button>
            </div>

            {message && <div className="text-green-300">{message}</div>}
            {error && <div className="text-red-300">{error}</div>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
