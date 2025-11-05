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
          🎓 Tara Attendance
        </h1>

        {/* Scanner first, then manual Search */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
          <div className="w-full md:w-auto">
            <Scanner onScan={handleSearch} />
          </div>

          {/* Divider: horizontal on small screens, vertical on md+ screens */}
          <div className="w-full md:w-auto">
            <div className="block md:hidden h-px bg-gray-700 w-full my-2" />
            <div className="hidden md:block w-px bg-gray-700 h-40 mx-3" />
          </div>

          <div className="w-full md:flex-1">
            <SearchBar onSearch={handleSearch} />
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
        {/* <hr className="my-8 border-gray-700" /> */}
        

      
      </div>
    </div>
  );
}
