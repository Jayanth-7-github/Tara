import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AdminNavbar from "../components/AdminNavbar";
import { ADMIN_TOKEN } from "../../services/constants";
import SingleStudentForm from "../components/SingleStudentForm";
import { getSummary, downloadCSV } from "../../services/api";
import { Link } from "react-router-dom";

export default function AdminSecret() {
  const TOKEN = ADMIN_TOKEN; // simple client-side token gate
  const [pass, setPass] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [downloading, setDownloading] = useState(false);

  // Persist unlock just for this session for convenience
  useEffect(() => {
    const saved = sessionStorage.getItem("adminUnlocked");
    if (saved === "1") setUnlocked(true);
  }, []);

  // Load summary when unlocked to power quick exports
  useEffect(() => {
    if (!unlocked) return;
    (async () => {
      try {
        const data = await getSummary();
        setSummary(data);
        if (data?.byEvent) {
          const keys = Object.keys(data.byEvent);
          if (keys.length) setSelectedEvent(keys[0]);
        }
      } catch (e) {
        // non-blocking
      }
    })();
  }, [unlocked]);

  function handleUnlock() {
    const input = pass.trim();
    if (!input) {
      setError("Please enter the passphrase");
      return;
    }
    if (input === TOKEN) {
      setUnlocked(true);
      setError("");
      sessionStorage.setItem("adminUnlocked", "1");
    } else {
      setError("Invalid passphrase. Try again.");
      setUnlocked(false);
      sessionStorage.removeItem("adminUnlocked");
    }
  }

  function handleClear() {
    setPass("");
    setUnlocked(false);
    setShowPass(false);
    setError("");
    sessionStorage.removeItem("adminUnlocked");
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white font-sans py-10 px-5">
      <AdminNavbar />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto bg-gray-800/50 backdrop-blur-xl border border-gray-700 shadow-2xl rounded-2xl overflow-hidden"
      >
        <div className="bg-gray-800/50 px-6 pb-6 border-b border-gray-700">
          <h1 className="text-3xl font-extrabold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent mb-2">
            Admin Access
          </h1>
          <p className="text-sm text-gray-400">
            Enter the passphrase to unlock admin-only tools and management
            features
          </p>
        </div>
        <div className="p-8"></div>

        {unlocked ? (
          // When unlocked, only show the admin navbar as requested
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <AdminNavbar />
            </div>

            {/* Admin dashboard widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quick tools */}
              <div className="rounded-2xl border border-gray-700 bg-gray-900/40 p-5">
                <h3 className="text-lg font-semibold text-gray-100 mb-3">
                  Quick Tools
                </h3>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/admin/update-attendance/${ADMIN_TOKEN}`}
                    className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    Update Attendance
                  </Link>
                  <Link
                    to={`/admin/mark-absent/${ADMIN_TOKEN}`}
                    className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
                  >
                    Mark Absent
                  </Link>
                  <Link
                    to={`/admin/manage-attendance/${ADMIN_TOKEN}`}
                    className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                  >
                    Manage Students
                  </Link>
                  <Link
                    to={`/member/summary/${ADMIN_TOKEN}`}
                    className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
                  >
                    Attendance Summary
                  </Link>
                </div>
              </div>

              {/* Quick export */}
              <div className="rounded-2xl border border-gray-700 bg-gray-900/40 p-5">
                <h3 className="text-lg font-semibold text-gray-100 mb-3">
                  Quick Export
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-sm text-gray-300">Event</label>
                  <select
                    value={selectedEvent}
                    onChange={(e) => setSelectedEvent(e.target.value)}
                    className="bg-gray-900 text-gray-200 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {(summary?.byEvent
                      ? Object.keys(summary.byEvent)
                      : [""]
                    ).map((ev) => (
                      <option key={ev || "default"} value={ev}>
                        {ev || "default"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    disabled={downloading}
                    onClick={async () => {
                      try {
                        setDownloading(true);
                        const blob = await downloadCSV({
                          presentOnly: true,
                          eventName: selectedEvent,
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "attendance_present_export.csv";
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      } finally {
                        setDownloading(false);
                      }
                    }}
                    className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                  >
                    {downloading ? "Preparing..." : "Download Present"}
                  </button>
                  <button
                    disabled={downloading}
                    onClick={async () => {
                      try {
                        setDownloading(true);
                        const blob = await downloadCSV({
                          allStudents: true,
                          eventName: selectedEvent,
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "attendance_all_students.csv";
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      } finally {
                        setDownloading(false);
                      }
                    }}
                    className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-700 text-white text-sm"
                  >
                    {downloading ? "Preparing..." : "Download All"}
                  </button>
                </div>
              </div>

              {/* Quick add student */}
              <div className="rounded-2xl border border-gray-700 bg-gray-900/40 p-5 md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-100 mb-3">
                  Quick Add Student
                </h3>
                <SingleStudentForm />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300" htmlFor="admin-pass">
                Passphrase
              </label>
              <div className="mt-1 flex items-stretch gap-2">
                <input
                  id="admin-pass"
                  type={showPass ? "text" : "password"}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUnlock();
                  }}
                  className="w-full p-2 rounded bg-gray-900/40 border border-gray-700 text-white"
                  placeholder="Enter admin passphrase"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
                  aria-label={showPass ? "Hide passphrase" : "Show passphrase"}
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
              {error && (
                <div className="mt-2 text-sm text-red-300">{error}</div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleUnlock}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
              >
                Unlock
              </button>
              <button
                onClick={handleClear}
                className="px-3 py-2 rounded bg-gray-700 text-gray-200"
              >
                Clear
              </button>
            </div>

            <div className="mt-2 p-4 rounded border border-gray-700 bg-gray-900/30 text-gray-300">
              <strong className="text-gray-200">Locked</strong>
              <p className="mt-1 text-sm">
                Enter the correct passphrase to unlock.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
