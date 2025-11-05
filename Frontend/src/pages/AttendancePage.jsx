import { useState, useEffect } from "react";
import SearchBar from "../components/SearchBar";
import AttendanceCard from "../components/AttendanceCard";
import Scanner from "../components/Scanner";
import { fetchStudent, markAttendance, getSummary } from "../services/api";

export default function AttendancePage({ onOpenSummary }) {
  const [student, setStudent] = useState(null);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshSummary();
  }, []);

  const refreshSummary = async () => {
    try {
      const data = await getSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    }
  };

  const handleSearch = async (regno) => {
    setMessage("");
    setStudent(null);
    setLoading(true);
    try {
      const s = await fetchStudent(regno);
      setStudent(s);
    } catch (err) {
      setMessage(err.message || "No student found for this RegNo.");
    } finally {
      setLoading(false);
    }
  };

  const handleMark = async (regno) => {
    try {
      const res = await markAttendance(regno, "College Event");
      setMessage(res.message || "Attendance marked successfully!");
      refreshSummary();
    } catch (err) {
      setMessage(err.message || "Failed to mark attendance.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white py-10 px-5 font-sans">
      <div className="max-w-5xl mx-auto bg-gray-800/80 shadow-lg rounded-2xl p-6 border border-gray-700">
        {/* Header */}
        <h1 className="text-2xl font-bold text-blue-300 mb-6">
          🎓 College Event Attendance
        </h1>

        {/* Search + Scanner */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
          <div className="w-full md:flex-1">
            <SearchBar onSearch={handleSearch} />
          </div>
          <div className="w-full md:w-auto">
            <Scanner onScan={handleSearch} />
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`mb-4 text-sm font-medium ${
              message.toLowerCase().includes("fail")
                ? "text-red-400"
                : "text-green-400"
            }`}
          >
            {message}
          </div>
        )}

        {/* Student Info */}
        {loading ? (
          <div className="text-gray-300 italic mb-4">Searching student...</div>
        ) : student ? (
          <AttendanceCard
            student={student}
            onMark={handleMark}
            onOpenSummary={onOpenSummary}
            onCancel={() => {
              setStudent(null);
              setMessage("");
            }}
          />
        ) : (
          <div className="text-gray-400 mb-4">
            Enter or scan a registration number to view student details.
          </div>
        )}

        {/* Divider */}
        <hr className="my-8 border-gray-700" />

        {/* Attendance Summary */}
        <h3 className="text-lg font-semibold text-gray-200 mb-3">
          📊 Attendance Summary
        </h3>

        {summary ? (
          <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700 text-gray-200">
            <p className="text-gray-200 mb-2">
              <strong>Total Marked:</strong> {summary.total}
            </p>

            {summary.byEvent && (
              <div className="text-gray-200 mb-3">
                <strong>By Event:</strong>
                <pre className="text-sm bg-gray-900 border border-gray-700 rounded-lg p-2 mt-1 overflow-x-auto text-gray-200">
                  {JSON.stringify(summary.byEvent, null, 2)}
                </pre>
              </div>
            )}

            {summary.records?.length > 0 ? (
              <div>
                <h4 className="text-md font-semibold text-gray-200 mb-2">
                  Recent Attendance
                </h4>
                <ul className="divide-y divide-gray-200 text-sm">
                  {summary.records.map((r) => (
                    <li
                      key={`${r.regno}-${r.timestamp}`}
                      className="py-2 flex justify-between text-gray-200"
                    >
                      <span>
                        {r.name} ({r.regno})
                      </span>
                      <span className="text-gray-400">
                        {new Date(r.timestamp).toLocaleTimeString()}{" "}
                        {new Date(r.timestamp).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">No recent records.</div>
            )}
          </div>
        ) : (
          <div className="text-gray-400 italic">Loading summary...</div>
        )}
      </div>
    </div>
  );
}
