import { useEffect, useState } from "react";
import { getSummary, downloadCSV } from "../services/api";

function AttendanceSummary({ onOpenAttendance }) {
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
    <div className="min-h-screen bg-black text-white py-10 px-5 font-sans">
      <div className="max-w-6xl mx-auto bg-gray-800/80 shadow-lg rounded-2xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-blue-300">
            Attendance Summary
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenAttendance}
              className="px-3 py-1 rounded bg-gray-700 text-sm text-white"
            >
              Back to Attendance
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-2 rounded bg-green-600 text-white"
            >
              Download CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : summary ? (
          <div>
            <p className="text-gray-200 mb-4">Total records: {summary.total}</p>

            <div className="overflow-x-auto border rounded bg-gray-900/40 border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-800 text-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left">RegNo</th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Event</th>
                    <th className="px-4 py-2 text-left">Timestamp</th>
                    <th className="px-4 py-2 text-left">Present</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.records.map((r) => (
                    <tr key={`${r.regno}-${r.timestamp}`} className="border-t">
                      <td className="px-4 py-2 text-gray-200">{r.regno}</td>
                      <td className="px-4 py-2 text-gray-200">{r.name}</td>
                      <td className="px-4 py-2 text-gray-200">{r.eventName}</td>
                      <td className="px-4 py-2 text-gray-200">
                        {new Date(r.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-gray-200">
                        {r.isPresent ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-gray-400">No data available.</div>
        )}
      </div>
    </div>
  );
}

export default AttendanceSummary;
