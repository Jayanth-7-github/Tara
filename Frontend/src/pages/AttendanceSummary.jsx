import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSummary, downloadCSV } from "../services/api";

export default function AttendanceSummary() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to load summary:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await downloadCSV();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "attendance_export.csv";
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 text-white py-12 px-5 font-sans">
      <div className="max-w-7xl mx-auto bg-gray-900/70 backdrop-blur-md shadow-2xl rounded-2xl border border-gray-800 p-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-gray-700 pb-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Attendance Summary
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Review attendance data and export detailed records.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
            <button
              onClick={() => navigate("/Attendance/12345678987654321")}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 border border-gray-700 transition-all duration-200"
            >
              ← Back to Attendance
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-400 hover:from-green-400 hover:to-emerald-300 text-white text-sm font-semibold shadow-md transition-all duration-200"
            >
              ⬇️ Download CSV
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
            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-300 text-sm">
                Total Records:{" "}
                <span className="font-semibold text-blue-400">
                  {summary.total}
                </span>
              </p>
              <button
                onClick={refresh}
                className="text-sm text-gray-400 hover:text-blue-300 transition"
              >
                ↻ Refresh
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-950/50 shadow-inner">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-800/80 text-gray-200 uppercase tracking-wide text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Reg No</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Event</th>
                    <th className="px-4 py-3 text-left">Timestamp</th>
                    <th className="px-4 py-3 text-left">Present</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.records.map((r, i) => (
                    <tr
                      key={`${r.regno}-${r.timestamp}`}
                      className={`${
                        i % 2 === 0 ? "bg-gray-900/40" : "bg-gray-800/30"
                      } border-t border-gray-800 hover:bg-gray-800/70 transition-colors`}
                    >
                      <td className="px-4 py-3 text-gray-200">{r.regno}</td>
                      <td className="px-4 py-3 text-gray-200">{r.name}</td>
                      <td className="px-4 py-3 text-gray-200">{r.eventName}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(r.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
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
