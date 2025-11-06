import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import AttendanceCard from "../components/AttendanceCard";
import Scanner from "../components/Scanner";
import Navbar from "../components/Navbar";
import { fetchStudent, markAttendance, getSummary } from "../services/api";
import { motion } from "framer-motion";

export default function AttendancePage() {
  const navigate = useNavigate();
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
      const res = await markAttendance(regno, "Vintra");
      setMessage(res.message || "Attendance marked successfully!");
      refreshSummary();
    } catch (err) {
      setMessage(err.message || "Failed to mark attendance.");
    }
  };

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
          <div className="mt-4 md:mt-0">
            <Navbar />
          </div>
        </div>

        {/* Main Scanning & Search Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-8">
          <div className="w-full md:w-auto">
            <Scanner onScan={handleSearch} />
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-gray-700 h-40 mx-4" />
          <div className="block md:hidden h-px bg-gray-700 w-full my-2" />

          <div className="w-full md:flex-1">
            <SearchBar onSearch={handleSearch} />
          </div>
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
                ? "bg-red-500/20 text-red-400 border border-red-500/40"
                : "bg-green-500/20 text-green-400 border border-green-500/40";
            })()}`}
          >
            {message}
          </motion.div>
        )}

        {/* Student Info */}
        {loading ? (
          <div className="text-gray-300 italic mb-4">Searching student...</div>
        ) : student ? (
          <AttendanceCard
            student={student}
            onMark={handleMark}
            onCancel={() => {
              setStudent(null);
              setMessage("");
            }}
          />
        ) : (
          <div className="text-gray-400 text-center py-8 border-t border-gray-700/60">
            Enter or scan a registration number to view student details.
          </div>
        )}
      </motion.div>
    </div>
  );
}
