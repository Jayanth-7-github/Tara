import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import AttendanceCard from "../components/AttendanceCard";
import Scanner from "../components/Scanner";
import Navbar from "../components/Navbar";
import {
  fetchStudent,
  markAttendance,
  getSummary,
  checkAttendance,
  fetchEvents,
  updateAttendance,
  verifyEventKey,
} from "../../services/api";
import { checkLogin } from "../../services/auth";
import { motion, AnimatePresence } from "framer-motion";

export default function AttendancePage() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [isMarked, setIsMarked] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isPublicAccess, setIsPublicAccess] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [inputKey, setInputKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  const isTeamEvent = selectedEvent?.participationType === "team";

  // Auth check on mount
  useEffect(() => {
    const runCheck = async () => {
      try {
        const auth = await checkLogin();
        if (auth.authenticated && (auth.user.role === "admin" || auth.user.role === "member")) {
          setIsAuthenticated(true);
          setUser(auth.user);
          setCheckingAuth(false);
        } else {
          // Not logged in or not authorized, check if we have a valid temp token in session
          const stored = sessionStorage.getItem("temp_event_access");
          if (stored) {
            const data = JSON.parse(stored);
            setIsPublicAccess(true);
            setCheckingAuth(false);
          } else {
            setShowKeyModal(true);
            setCheckingAuth(false);
          }
        }
      } catch (err) {
        setCheckingAuth(false);
        setShowKeyModal(true);
      }
    };
    runCheck();
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetchEvents();
      let items = res?.events || [];

      // If public access, filter to ONLY the one event we have access to
      if (isPublicAccess) {
        const stored = sessionStorage.getItem("temp_event_access");
        if (stored) {
          const data = JSON.parse(stored);
          items = items.filter(ev => ev._id === data.eventId);
        }
      } else if (isAuthenticated && user && user.role === "member") {
        // If logged in as member (manager), only show their events
        const userEmail = (user.email || "").toLowerCase().trim();
        items = items.filter(ev => (ev.managerEmail || "").toLowerCase().trim() === userEmail);
      }

      setEvents(items);

      setSelectedEvent((prev) => {
        if (items.length === 0) return null;
        if (!prev) return items[0];
        const fresh = items.find((it) => it._id === prev._id);
        return fresh || items[0];
      });
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  }, [isPublicAccess, isAuthenticated, user]);

  const refreshSummary = useCallback(async (eventName) => {
    try {
      const opts = eventName ? { eventName, limit: 20000 } : { limit: 20000 };
      const data = await getSummary(opts);
      setSummary(data);
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    }
  }, []);

  useEffect(() => {
    // Load events initially; summary will be fetched for the selected event
    loadEvents();

    const timer = setInterval(() => {
      loadEvents();
      // refresh summary for currently selected event only
      refreshSummary(selectedEvent?.title);
    }, 5000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent?.title, isPublicAccess, loadEvents]);

  // Update attendance records when the student or selected event changes
  useEffect(() => {
    if (student && selectedEvent) {
      const regno = student.regno || student.rollNumber;
      const eventName = selectedEvent.title || "Vintra";
      checkAttendance(regno, eventName)
        .then((res) => {
          setAttendanceRecords(res.records || []);
        })
        .catch((err) => console.error("Failed to refresh attendance:", err));
    }
  }, [student, selectedEvent?._id]);

  // Fetch summary whenever selected event changes
  useEffect(() => {
    if (selectedEvent) refreshSummary(selectedEvent.title);
  }, [selectedEvent, refreshSummary]);

  const handleSearch = async (regno) => {
    setMessage("");
    setStudent(null);
    setIsMarked(false); // Reset marked state for new search
    setAttendanceRecords([]);
    setLoading(true);
    try {
      const s = await fetchStudent(regno, selectedEvent?._id);
      setStudent(s);
      setShowManualSearch(false); // Close modal when student is found

      // Check if attendance is already marked for this student
      try {
        const eventName = selectedEvent?.title || "Vintra";
        const attendanceStatus = await checkAttendance(regno, eventName);
        const records = attendanceStatus.records || [];
        setAttendanceRecords(records);
        // Is marked logic might need to be session specific?
        // checking if *any* session is marked or if *all* enabled sessions are marked?
        // Let's just reset isMarked to false and let the card handle the UI.
        setIsMarked(false);
      } catch (checkErr) {
        console.error("Failed to check attendance:", checkErr);
      }
    } catch (err) {
      setMessage(err.message || "No student found for this RegNo.");
    } finally {
      setLoading(false);
    }
  };

  const handleMark = async (regno, sessionName) => {
    try {
      const eventName = selectedEvent?.title || "Vintra";
      const res = await markAttendance(regno, eventName, sessionName);
      setMessage(res.message || "Checked in successfully!");
      // Refresh from server to apply break-state rules (out -> in)
      try {
        const attendanceStatus = await checkAttendance(regno, eventName);
        const records = attendanceStatus.records || [];
        setAttendanceRecords(records);
        setIsMarked(false);
      } catch {
        setIsMarked(true);
      }
      refreshSummary(selectedEvent?.title);
      return true;
    } catch (err) {
      setMessage(err.message || "Failed to mark attendance.");
      return false;
    }
  };

  const handleCheckOut = async (regno) => {
    try {
      const eventName = selectedEvent?.title || "Vintra";
      const res = await updateAttendance(regno, {
        eventName,
        isPresent: false,
      });
      setMessage(res?.message || "Checked out successfully!");
      // After checkout, re-check status to drive UI break-state rules reliably
      try {
        const attendanceStatus = await checkAttendance(regno, eventName);
        const records = attendanceStatus.records || [];
        setAttendanceRecords(records);
        setIsMarked(false);
      } catch {
        // fallback
        setAttendanceRecords([]);
        setIsMarked(false);
      }
      refreshSummary(selectedEvent?.title);
      return true;
    } catch (err) {
      setMessage(err.message || "Failed to check out.");
      return false;
    }
  };

  const handleVerifyKey = async (e) => {
    e.preventDefault();
    setKeyError("");
    setLoading(true);
    try {
      const res = await verifyEventKey(inputKey);
      if (res.success) {
        sessionStorage.setItem("temp_event_access", JSON.stringify({
          eventId: res.eventId,
          eventTitle: res.eventTitle,
          managerEmail: res.managerEmail,
          token: res.token
        }));
        setIsPublicAccess(true);
        setShowKeyModal(false);
        // Refresh events to lock in
        loadEvents();
      }
    } catch (err) {
      setKeyError(err.message || "Invalid access key. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900 text-white font-sans py-10 px-5">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="max-w-5xl mx-auto bg-gray-800/60 backdrop-blur-xl border border-gray-700/70 shadow-2xl rounded-3xl p-8"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 text-center md:text-left">
          <div>
            <h1 className="text-3xl font-bold text-blue-400 tracking-wide">
              🎓 Event Attendance
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Scan or search to mark attendance instantly
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="w-full sm:w-auto">
              <select
                value={selectedEvent?._id || ""}
                disabled={isPublicAccess}
                onChange={(e) => {
                  const id = e.target.value;
                  const ev = events.find((it) => it._id === id);
                  setSelectedEvent(ev || null);
                }}
                className={`bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded w-full sm:w-64 ${isPublicAccess ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <option value="">Select event</option>
                {events.map((ev) => (
                  <option key={ev._id} value={ev._id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-auto">
              <Navbar />
            </div>
          </div>
        </div>

        {selectedEvent && (
          <div className="text-sm text-gray-300 mb-4 w-full">
            Current event:{" "}
            <span className="font-medium text-white inline-block max-w-full sm:max-w-lg wrap-break-word">
              {selectedEvent.title}
            </span>
          </div>
        )}

        {/* Main Scanning Section */}
        <div className="flex flex-col items-center gap-8 mb-8">
          <div className="w-full flex justify-center">
            <Scanner
              onScan={handleSearch}
              studentFound={student ? true : message ? false : null}
            />
          </div>

          {/* Manual Search Modal/Overlay */}
          {showManualSearch && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={() => setShowManualSearch(false)}
            >
              <div
                className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-blue-400">
                    Manual Search
                  </h3>
                  <button
                    onClick={() => setShowManualSearch(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <SearchBar
                  onSearch={handleSearch}
                  selectedEvent={selectedEvent}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Message Display */}
        {message && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium shadow-inner ${(() => {
              const m = message.toLowerCase();
              const isError = m.includes("fail") || m.includes("error");
              const isAlready = m.includes("already marked");
              return isError || isAlready
                ? "bg-gray-500/20 text-gray-400 border border-gray-500/40"
                : "bg-green-500/20 text-green-400 border border-green-500/40";
            })()} max-w-full wrap-break-word whitespace-pre-wrap`}
          >
            {message}
          </motion.div>
        )}

        {student && selectedEvent && isTeamEvent ? (
          <div className="mb-4 text-sm text-gray-300 max-w-full wrap-break-word whitespace-pre-wrap">
            Team: <span className="text-white font-medium">{student.teamName || "—"}</span>
          </div>
        ) : null}

        {/* Student Info */}
        {loading ? (
          <div className="text-gray-300 italic mb-4">Searching student...</div>
        ) : student ? (
          <AttendanceCard
            student={student}
            selectedEvent={selectedEvent}
            onCheckIn={handleMark}
            onCheckOut={handleCheckOut}
            isMarked={isMarked}
            attendanceRecords={attendanceRecords}
            onClose={() => {
              setStudent(null);
              setIsMarked(false);
              setAttendanceRecords([]);
            }}
            onCancel={() => {
              setStudent(null);
              setMessage("");
              setIsMarked(false);
              setAttendanceRecords([]);
            }}
          />
        ) : (
          <div className="text-gray-400 text-center py-8 border-t border-gray-700/60">
            Scan a registration number to view student details.
          </div>
        )}
      </motion.div>

      {/* Floating Manual Search Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
        onClick={() => setShowManualSearch(true)}
        className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 z-40"
        title="Manual Search"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </motion.button>

      {/* Access Key Modal */}
      <AnimatePresence>
        {showKeyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                  <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Member Access</h2>
                <p className="text-gray-400 text-sm">Please enter the access code provided by your event manager.</p>
              </div>

              <form onSubmit={handleVerifyKey} className="space-y-6">
                <div>
                  <input
                    type="text"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="Enter Access Key"
                    autoFocus
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-4 text-center text-xl font-mono tracking-widest text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                  {keyError && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-xs mt-3 text-center font-medium"
                    >
                      {keyError}
                    </motion.p>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={loading || !inputKey.trim()}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                  >
                    {loading ? "Verifying..." : "Access Event"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="w-full py-4 bg-transparent hover:bg-gray-800 text-gray-400 rounded-xl font-medium text-sm transition-all"
                  >
                    Login as Manager instead
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
