import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSummary, downloadCSV } from "../../services/api";
import { ADMIN_TOKEN } from "../../services/constants";

export default function AttendanceSummary() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState("");

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    refresh(selectedEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent]);

  const refresh = async (eventName) => {
    setLoading(true);
    try {
      const data = await getSummary({ eventName, limit: 20000 });
      setSummary(data);
      // Pick a default event for downloads: most frequent event if available
      if (!eventName && data && data.byEvent) {
        const entries = Object.entries(data.byEvent);
        if (entries.length > 0) {
          const [topEvent] = entries.sort((a, b) => b[1] - a[1])[0];
          setSelectedEvent(topEvent);
        } else if (data.records && data.records.length > 0) {
          setSelectedEvent(data.records[0].eventName || "default");
        } else {
          setSelectedEvent("default");
        }
      }
    } catch (err) {
      console.error("Failed to load summary:", err);
    } finally {
      setLoading(false);
    }
  };

  const records =
    summary && summary.records
      ? summary.records.filter(
          (r) => (r.eventName || "default") === (selectedEvent || "default"),
        )
      : [];

  const counts =
    summary?.countsByEvent && selectedEvent
      ? summary.countsByEvent[selectedEvent]
      : null;

  const totalCheckIns =
    counts?.totalCheckIns ??
    records.reduce((n, r) => n + (r.checkedIn ? 1 : 0), 0);
  const totalCheckOuts =
    counts?.totalCheckOuts ??
    records.reduce((n, r) => n + (r.checkedOut ? 1 : 0), 0);

  const totalReturns =
    counts?.totalReturns ??
    records.reduce((n, r) => n + (r.returned ? 1 : 0), 0);
  const totalCurrentlyOut =
    counts?.totalCurrentlyOut ??
    records.reduce((n, r) => n + (r.currentlyOut ? 1 : 0), 0);

  const handleDownload = async (mode) => {
    try {
      const blob = await downloadCSV(
        mode === "returned"
          ? { returnedOnly: true, eventName: selectedEvent }
          : mode === "outnow"
            ? { outNowOnly: true, eventName: selectedEvent }
            : { allStudents: true, eventName: selectedEvent },
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
            {/* Event selector for downloads */}
            <div className="w-full sm:w-auto flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2">
              <label className="text-sm text-gray-300 whitespace-nowrap">
                Event:
              </label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full sm:w-64 bg-gray-900 text-gray-200 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
              >
                {/* Build options from byEvent keys */}
                {summary &&
                  summary.byEvent &&
                  Object.keys(summary.byEvent).map((ev) => (
                    <option key={ev} value={ev}>
                      {ev}
                    </option>
                  ))}
                {/* Fallback option if byEvent empty */}
                {summary && Object.keys(summary.byEvent || {}).length === 0 && (
                  <option value="default">default</option>
                )}
              </select>
            </div>
            <button
              onClick={() => navigate(`/member/Attendance/${ADMIN_TOKEN}`)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 border border-gray-700 transition-all duration-200"
            >
              ← Back to Attendance
            </button>
            <div className="w-full sm:w-auto grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
              <button
                onClick={() => handleDownload("returned")}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-linear-to-r from-green-500 to-emerald-400 hover:from-green-400 hover:to-emerald-300 text-white text-sm font-semibold shadow-md transition-all duration-200"
              >
                ⬇️ Download Returned
              </button>
              <button
                onClick={() => handleDownload("outnow")}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-linear-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-white text-sm font-semibold shadow-md transition-all duration-200"
              >
                ⬇️ Download Out Now
              </button>
              <button
                onClick={() => handleDownload("all")}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-linear-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 text-white text-sm font-semibold shadow-md transition-all duration-200"
              >
                ⬇️ Download All
              </button>
            </div>
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
              <div className="text-gray-300 text-sm flex flex-wrap gap-x-4 gap-y-1">
                <div>
                  Total Records (for "{selectedEvent}"):{" "}
                  <span className="font-semibold text-blue-400">
                    {records.length}
                  </span>
                </div>
                <div>
                  Total Check In:{" "}
                  <span className="font-semibold text-green-400">
                    {totalCheckIns}
                  </span>
                </div>
                <div>
                  Total Check Out:{" "}
                  <span className="font-semibold text-red-400">
                    {totalCheckOuts}
                  </span>
                </div>
                <div>
                  Total Returns:{" "}
                  <span className="font-semibold text-cyan-300">
                    {totalReturns}
                  </span>
                </div>
                <div>
                  Currently Out:{" "}
                  <span className="font-semibold text-amber-300">
                    {totalCurrentlyOut}
                  </span>
                </div>
              </div>
              <button
                onClick={() => refresh(selectedEvent)}
                className="self-start sm:self-auto text-sm text-gray-400 hover:text-blue-300 transition"
              >
                ↻ Refresh
              </button>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden space-y-3">
              {records.map((r) => (
                <div
                  key={`${r.regno}-${r._id || r.timestamp}`}
                  className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="min-w-0 text-base font-semibold text-gray-100 wrap-break-word">
                      {r.name}
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        r.isPresent
                          ? "bg-green-600/30 text-green-400 border border-green-500/30"
                          : "bg-red-600/30 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {r.isPresent ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 text-xs text-gray-300">
                    <div>
                      <div className="text-gray-400">Roll Number</div>
                      <div className="text-gray-200 break-all">{r.regno}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Hostel</div>
                      <div className="text-gray-200">{r.hostelName || "—"}</div>
                      <div className="text-gray-400 mt-1">Room No</div>
                      <div className="text-gray-200">{r.roomNo || "—"}</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 text-xs text-gray-300">
                    <div>
                      <div className="text-gray-400">Check In</div>
                      <div className="text-gray-300 flex items-center justify-between gap-2">
                        <span className="min-w-0 wrap-break-word">
                          {r.checkInText || "—"}
                        </span>
                        <span className="shrink-0">
                          {r.checkedIn ? "✅" : "❌"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Check Out</div>
                      <div className="text-gray-300 flex items-center justify-between gap-2">
                        <span className="min-w-0 wrap-break-word">
                          {r.checkOutText || "—"}
                        </span>
                        <span className="shrink-0">
                          {r.checkedOut ? "✅" : "❌"}
                        </span>
                      </div>
                    </div>
                    <div className="min-[420px]:col-span-2">
                      <div className="text-gray-400">Status</div>
                      <div className="text-gray-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Returned: {r.returned ? "✅" : "❌"}</span>
                        <span>Out Now: {r.currentlyOut ? "✅" : "❌"}</span>
                      </div>
                    </div>
                    <div className="min-[420px]:col-span-2">
                      <div className="text-gray-400">Team / Role</div>
                      <div className="text-gray-200 wrap-break-word">
                        {(r.teamName || "—") + " • " + (r.role || "—")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-800 bg-gray-950/50 shadow-inner">
              <table className="min-w-[1100px] w-full text-sm">
                <thead className="bg-gray-800/80 text-gray-200 uppercase tracking-wide text-xs">
                  <tr>
                    <th className="px-3 py-3 text-left">Roll No</th>
                    <th className="px-3 py-3 text-left">Name</th>
                    <th className="px-3 py-3 text-left">Team</th>
                    <th className="px-3 py-3 text-left">Role</th>
                    <th className="px-3 py-3 text-left">Email</th>
                    <th className="px-3 py-3 text-left">Branch</th>
                    <th className="px-3 py-3 text-left">Hostel</th>
                    <th className="px-3 py-3 text-left">Room</th>
                    <th className="px-3 py-3 text-left">Check In</th>
                    <th className="px-3 py-3 text-left">Check Out</th>
                    <th className="px-3 py-3 text-left">In</th>
                    <th className="px-3 py-3 text-left">Out</th>
                    <th className="px-3 py-3 text-left">Returned</th>
                    <th className="px-3 py-3 text-left">Out Now</th>
                    <th className="px-3 py-3 text-left">Present</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr
                      key={`${r.regno}-${r._id || r.timestamp}`}
                      className={`${
                        i % 2 === 0 ? "bg-gray-900/40" : "bg-gray-800/30"
                      } border-t border-gray-800 hover:bg-gray-800/70 transition-colors`}
                    >
                      <td className="px-3 py-3 text-gray-200">{r.regno}</td>
                      <td className="px-3 py-3 text-gray-200">{r.name}</td>
                      <td className="px-3 py-3 text-gray-200">
                        {r.teamName || "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-200">
                        {r.role || "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-200 break-all">
                        {r.email || "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-200">
                        {r.branch || "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-200">
                        {r.hostelName || "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-200">
                        {r.roomNo || "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-400">
                        {r.checkInText || "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-400">
                        {r.checkOutText || "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-200">
                        {r.checkedIn ? "✅" : "❌"}
                      </td>
                      <td className="px-3 py-3 text-gray-200">
                        {r.checkedOut ? "✅" : "❌"}
                      </td>
                      <td className="px-3 py-3 text-gray-200">
                        {r.returned ? "✅" : "❌"}
                      </td>
                      <td className="px-3 py-3 text-gray-200">
                        {r.currentlyOut ? "✅" : "❌"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            r.isPresent
                              ? "bg-green-600/30 text-green-400 border border-green-500/30"
                              : "bg-red-600/30 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {r.isPresent ? "Yes" : "No"}
                        </span>
                      </td>
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
