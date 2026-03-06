import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getSummary,
  downloadCSV,
  fetchEvents,
  verifyEventKey,
} from "../../services/api";
import { checkLogin } from "../../services/auth";
import { motion, AnimatePresence } from "framer-motion";

export default function AttendanceSummary() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedEventName, setSelectedEventName] = useState("");
  const [events, setEvents] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isPublicAccess, setIsPublicAccess] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [inputKey, setInputKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Auth check on mount
  useEffect(() => {
    const runCheck = async () => {
      try {
        const auth = await checkLogin();
        if (
          auth.authenticated &&
          (auth.user.role === "admin" || auth.user.role === "member")
        ) {
          setIsAuthenticated(true);
          setUser(auth.user);
          setCheckingAuth(false);
        } else {
          const stored = sessionStorage.getItem("temp_event_access");
          if (stored) {
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

  useEffect(() => {
    const fetchEventsAndInit = async () => {
      setLoading(true);
      try {
        const eventsData = await fetchEvents();
        let eventList = eventsData.events || [];

        // If public access, filter to ONLY the one event we have access to
        if (isPublicAccess) {
          const stored = sessionStorage.getItem("temp_event_access");
          if (stored) {
            const data = JSON.parse(stored);
            eventList = eventList.filter((ev) => ev._id === data.eventId);
          }
        } else if (isAuthenticated && user && user.role === "member") {
          // If logged in as member (manager), only show their events
          const userEmail = (user.email || "").toLowerCase().trim();
          eventList = eventList.filter(
            (ev) => (ev.managerEmail || "").toLowerCase().trim() === userEmail,
          );
        }

        setEvents(eventList);

        // Ensure selectedEventName is valid for the filtered list
        if (eventList.length > 0) {
          const exists = eventList.find((ev) => ev.title === selectedEventName);
          if (!exists) {
            setSelectedEventName(eventList[0].title);
          }
        } else {
          setSelectedEventName("default");
        }
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventsAndInit();
  }, [isPublicAccess, selectedEventName, isAuthenticated, user]);

  // Fetch summary only for the currently selected event,
  // and auto-refresh that event's summary every 60 seconds.
  useEffect(() => {
    if (!selectedEventName) return;

    const fetchSummary = async () => {
      setLoading(true);
      try {
        const data = await getSummary({
          eventName: selectedEventName,
          limit: 20000,
        });
        setSummary(data);
      } catch (err) {
        console.error("Failed to fetch summary:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();

    const timer = setInterval(() => {
      fetchSummary();
    }, 60000);

    return () => clearInterval(timer);
  }, [selectedEventName]);

  const refreshSummaryOnly = async (eventName) => {
    if (!eventName) return;
    setLoading(true);
    try {
      const data = await getSummary({ eventName, limit: 20000 });
      setSummary(data);
    } catch (err) {
      console.error("Failed to refresh summary:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter records by selected event
  const rawRecords =
    summary && summary.records
      ? summary.records.filter(
          (r) =>
            (r.eventName || "default") === (selectedEventName || "default"),
        )
      : [];

  // Determine columns based on Event Config
  const currentEventObj = events.find((e) => e.title === selectedEventName);
  const isTeamEvent = currentEventObj?.participationType === "team";
  const sessionConfig = currentEventObj?.sessions || [];
  // Show ALL configured sessions, not just active ones
  const sessionColumns = sessionConfig;

  // Group attendance records by student (regno)
  const attendanceByRegno = {};
  rawRecords.forEach((r) => {
    if (!attendanceByRegno[r.regno]) {
      attendanceByRegno[r.regno] = {
        base: r,
        sessions: {},
      };
    }

    // Map session name
    let sKey = r.sessionName;
    // Treat "default" as missing/legacy
    if ((!sKey || sKey === "default") && sessionColumns.length > 0) {
      sKey = sessionColumns[0].name;
    } else if (sKey) {
      // Normalize case
      const exact = sessionColumns.find((c) => c.name === sKey);
      if (!exact) {
        const loose = sessionColumns.find(
          (c) => c.name.toLowerCase() === sKey.toLowerCase(),
        );
        if (loose) sKey = loose.name;
      }
    }

    if (sKey) {
      attendanceByRegno[r.regno].sessions[sKey] = r;
    }
  });

  // Build final student list: include all registered students for the event,
  // defaulting them to "absent" when no attendance record exists.
  const registeredStudents = currentEventObj?.registeredStudents || [];
  const studentRows =
    registeredStudents.length > 0
      ? registeredStudents.map((stu) => {
          const attendance = attendanceByRegno[stu.regno] || {};
          return {
            regno: stu.regno,
            name: stu.name || attendance.base?.name || "",
            email: stu.email || attendance.base?.email,
            hostelName: stu.hostelName || attendance.base?.hostelName,
            teamName: stu.teamName || attendance.base?.teamName,
            sessions: attendance.sessions || {},
          };
        })
      : Object.values(attendanceByRegno).map((entry) => ({
          regno: entry.base.regno,
          name: entry.base.name,
          email: entry.base.email,
          hostelName: entry.base.hostelName,
          teamName: entry.base.teamName,
          sessions: entry.sessions,
        }));

  // For team events: keep team members together in UI
  const sortedStudentRows = isTeamEvent
    ? [...studentRows].sort((a, b) => {
        const aTeam = String(a?.teamName || "").trim();
        const bTeam = String(b?.teamName || "").trim();
        const aTeamKey = aTeam ? aTeam.toLowerCase() : "~"; // put blanks last
        const bTeamKey = bTeam ? bTeam.toLowerCase() : "~";

        if (aTeamKey !== bTeamKey) return aTeamKey.localeCompare(bTeamKey);

        const aReg = String(a?.regno || "");
        const bReg = String(b?.regno || "");
        if (aReg !== bReg) return aReg.localeCompare(bReg);

        return String(a?.name || "").localeCompare(String(b?.name || ""));
      })
    : studentRows;

  const handleDownload = async (mode) => {
    try {
      const blob = await downloadCSV(
        mode === "returned"
          ? { returnedOnly: true, eventName: selectedEventName }
          : mode === "outnow"
            ? { outNowOnly: true, eventName: selectedEventName }
            : { allStudents: true, eventName: selectedEventName },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        mode === "returned"
          ? "attendance_returned_export.csv"
          : mode === "outnow"
            ? "attendance_out_now_export.csv"
            : "attendance_all_students.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download CSV");
    }
  };

  const handleVerifyKey = async (e) => {
    e.preventDefault();
    setKeyError("");
    setLoading(true);
    try {
      const res = await verifyEventKey(inputKey);
      if (res.success) {
        sessionStorage.setItem(
          "temp_event_access",
          JSON.stringify({
            eventId: res.eventId,
            eventTitle: res.eventTitle,
            managerEmail: res.managerEmail,
            token: res.token,
          }),
        );
        setIsPublicAccess(true);
        setShowKeyModal(false);
        // Page level refresh to reload data with the key
        window.location.reload();
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
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white py-6 sm:py-12 px-3 sm:px-5 font-sans">
      <div className="max-w-7xl mx-auto bg-gray-800/50 backdrop-blur-md shadow-2xl rounded-2xl border border-gray-700 p-4 sm:p-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 border-b border-gray-700 pb-5 sm:pb-6">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Attendance Summary
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Review attendance data and export detailed records
            </p>
          </div>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:flex-wrap gap-3">
            {/* Event selector */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-900/40 p-1 rounded-xl border border-gray-700/50">
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="text-gray-400 text-sm font-medium">
                  Event:
                </span>
                <select
                  value={selectedEventName}
                  disabled={isPublicAccess}
                  onChange={(e) => setSelectedEventName(e.target.value)}
                  className={`bg-transparent text-white text-sm font-semibold focus:outline-none cursor-pointer min-w-[150px] ${isPublicAccess ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {/* Show events from fetched list first for correctness, fallback to summary keys */}
                  {events.length > 0
                    ? events.map((ev) => (
                        <option
                          key={ev._id}
                          value={ev.title}
                          className="bg-gray-900"
                        >
                          {ev.title}
                        </option>
                      ))
                    : summary &&
                      summary.byEvent &&
                      Object.keys(summary.byEvent).map((ev) => (
                        <option key={ev} value={ev} className="bg-gray-900">
                          {ev}
                        </option>
                      ))}
                  {!events.length &&
                    (!summary ||
                      !summary.byEvent ||
                      Object.keys(summary.byEvent).length === 0) && (
                      <option value="default" className="bg-gray-900">
                        Default
                      </option>
                    )}
                </select>
              </div>

              <div className="h-6 w-px bg-gray-700 hidden sm:block"></div>

              <button
                onClick={() => navigate(`/member/Attendance`)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Back to Scan
              </button>
            </div>

            <button
              onClick={() => handleDownload("all")}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex justify-center items-center py-16 text-gray-400 text-lg animate-pulse">
            Loading summary...
          </div>
        ) : summary ? (
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <div className="text-gray-300 text-sm">
                <div>
                  Total Students Tracked:{" "}
                  <span className="font-semibold text-blue-400">
                    {studentRows.length}
                  </span>
                </div>
              </div>
              <button
                onClick={() => refreshSummaryOnly(selectedEventName)}
                className="self-start sm:self-auto text-sm text-gray-400 hover:text-blue-300 transition"
              >
                ↻ Refresh
              </button>
            </div>

            {/* Mobile list */}
            <div className="sm:hidden space-y-3">
              {sortedStudentRows.map((s) => (
                <div
                  key={s.regno}
                  className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 shadow-sm"
                >
                  <div className="text-base font-semibold text-gray-100 wrap-break-word mb-2">
                    {s.name}
                  </div>
                  <div className="text-sm text-gray-400 mb-2">{s.regno}</div>
                  {isTeamEvent ? (
                    <div className="text-sm text-gray-400 mb-2">
                      Team:{" "}
                      <span className="text-gray-200 font-medium">
                        {s.teamName || "—"}
                      </span>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    {sessionColumns.map((sess) => {
                      const record = s.sessions[sess.name];
                      const isPresent = record && record.isPresent;
                      return (
                        <div
                          key={sess.name}
                          className="flex justify-between items-center text-sm border-t border-gray-800 pt-2"
                        >
                          <span className="text-gray-300">{sess.name}</span>
                          <span>
                            {isPresent ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/20 text-green-400">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3 w-3"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                                Absent
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-800 bg-gray-950/50 shadow-inner">
              <table className="min-w-[800px] w-full text-sm">
                <thead className="bg-gray-800/80 text-gray-200 uppercase tracking-wide text-xs">
                  <tr>
                    <th className="px-3 py-3 text-left">Roll No</th>
                    <th className="px-3 py-3 text-left">Name</th>
                    {isTeamEvent ? (
                      <th className="px-3 py-3 text-left">Team</th>
                    ) : null}
                    <th className="px-3 py-3 text-left">Email</th>
                    <th className="px-3 py-3 text-left">Hostel</th>
                    {sessionColumns.map((sess) => (
                      <th key={sess.name} className="px-3 py-3 text-center">
                        {sess.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedStudentRows.map((s, i) => (
                    <tr
                      key={s.regno}
                      className={`${
                        i % 2 === 0 ? "bg-gray-900/40" : "bg-gray-800/30"
                      } border-t border-gray-800 hover:bg-gray-800/70 transition-colors`}
                    >
                      <td className="px-3 py-3 text-gray-200">{s.regno}</td>
                      <td className="px-3 py-3 text-gray-200">{s.name}</td>
                      {isTeamEvent ? (
                        <td className="px-3 py-3 text-gray-200">
                          {s.teamName || "—"}
                        </td>
                      ) : null}
                      <td className="px-3 py-3 text-gray-200 break-all">
                        {s.email || "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-200">
                        {s.hostelName || "—"}
                      </td>
                      {sessionColumns.map((sess) => {
                        const record = s.sessions[sess.name];
                        const isPresent = record && record.isPresent;
                        return (
                          <td key={sess.name} className="px-3 py-3 text-center">
                            {isPresent ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-green-400">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                                Absent
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-16">
            No attendance data available.
          </div>
        )}
      </div>

      {/* Access Key Modal */}
      <AnimatePresence>
        {showKeyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                  <svg
                    className="w-8 h-8 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Summary Access
                </h2>
                <p className="text-gray-400 text-sm">
                  Please enter the access code provided by your event manager.
                </p>
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
                    {loading ? "Verifying..." : "View Summary"}
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
