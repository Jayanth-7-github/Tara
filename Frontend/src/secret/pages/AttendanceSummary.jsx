import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSummary, downloadCSV, fetchEvents } from "../../services/api";

export default function AttendanceSummary() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedEventName, setSelectedEventName] = useState("");
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEventsAndInit = async () => {
      setLoading(true);
      try {
        const eventsData = await fetchEvents();
        const eventList = eventsData.events || [];
        setEvents(eventList);

        // If no event is selected yet, default to the first event (if any)
        if (!selectedEventName) {
          if (eventList.length > 0) {
            setSelectedEventName(eventList[0].title);
          } else {
            setSelectedEventName("default");
          }
        }
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventsAndInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const sessionConfig = currentEventObj?.sessions || [];
  // Show ALL configured sessions, not just active ones
  const sessionColumns = sessionConfig;
  const registeredStudents = currentEventObj?.registeredStudents || [];
  const totalRegistered =
    (currentEventObj && currentEventObj.registeredCount) ||
    registeredStudents.length ||
    0;

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

  // Build final student list:
  // - Start with all registered students for the event (always shown, default Absent).
  // - Also include any students who have attendance records but aren't in registeredStudents.
  const studentRowMap = new Map();

  if (registeredStudents.length > 0) {
    registeredStudents.forEach((stu) => {
      const attendance = attendanceByRegno[stu.regno] || {};
      studentRowMap.set(stu.regno, {
        regno: stu.regno,
        name: stu.name || attendance.base?.name || "",
        email: stu.email || attendance.base?.email,
        hostelName: stu.hostelName || attendance.base?.hostelName,
        sessions: attendance.sessions || {},
      });
    });

    // Add any extra attendees not present in registeredStudents
    Object.values(attendanceByRegno).forEach((entry) => {
      const regno = entry.base.regno;
      if (!studentRowMap.has(regno)) {
        studentRowMap.set(regno, {
          regno,
          name: entry.base.name,
          email: entry.base.email,
          hostelName: entry.base.hostelName,
          sessions: entry.sessions,
        });
      }
    });
  } else {
    // Fallback: no registeredStudents list available, just use attendance records.
    Object.values(attendanceByRegno).forEach((entry) => {
      studentRowMap.set(entry.base.regno, {
        regno: entry.base.regno,
        name: entry.base.name,
        email: entry.base.email,
        hostelName: entry.base.hostelName,
        sessions: entry.sessions,
      });
    });
  }

  const studentRows = Array.from(studentRowMap.values());

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
                  onChange={(e) => setSelectedEventName(e.target.value)}
                  className="bg-transparent text-white text-sm font-semibold focus:outline-none cursor-pointer min-w-[150px]"
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
                  Total Students (Registered):{" "}
                  <span className="font-semibold text-blue-400">
                    {totalRegistered}
                  </span>
                </div>
                <div>
                  Showing in table:{" "}
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
              {studentRows.map((s) => (
                <div
                  key={s.regno}
                  className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 shadow-sm"
                >
                  <div className="text-base font-semibold text-gray-100 wrap-break-word mb-2">
                    {s.name}
                  </div>
                  <div className="text-sm text-gray-400 mb-2">{s.regno}</div>

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
                  {studentRows.map((s, i) => (
                    <tr
                      key={s.regno}
                      className={`${
                        i % 2 === 0 ? "bg-gray-900/40" : "bg-gray-800/30"
                      } border-t border-gray-800 hover:bg-gray-800/70 transition-colors`}
                    >
                      <td className="px-3 py-3 text-gray-200">{s.regno}</td>
                      <td className="px-3 py-3 text-gray-200">{s.name}</td>
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
    </div>
  );
}
