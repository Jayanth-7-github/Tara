import { useState, useEffect } from "react";
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
} from "../services/api";
import { motion } from "framer-motion";

export default function AttendancePage() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [isMarked, setIsMarked] = useState(false);

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
    setIsMarked(false); // Reset marked state for new search
    setLoading(true);
    try {
      const s = await fetchStudent(regno);
      setStudent(s);
      setShowManualSearch(false); // Close modal when student is found

      // Check if attendance is already marked for this student
      try {
        const attendanceStatus = await checkAttendance(regno, "Vintra");
        if (attendanceStatus.isMarked && attendanceStatus.isPresent) {
          setIsMarked(true);
          setMessage(`${s.name} has already marked attendance.`);
        }
      } catch (checkErr) {
        console.error("Failed to check attendance:", checkErr);
      }
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
      setIsMarked(true); // Mark as attended
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
                <SearchBar onSearch={handleSearch} />
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
            isMarked={isMarked}
            onCancel={() => {
              setStudent(null);
              setMessage("");
              setIsMarked(false);
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
    </div>
  );
}
