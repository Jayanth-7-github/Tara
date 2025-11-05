import "./App.css";
import { useState } from "react";
import AttendancePage from "./pages/AttendancePage";
import AttendanceSummary from "./pages/AttendanceSummary";

function App() {
  const [page, setPage] = useState("attendance");

  return (
    <div>
      <header className="p-4 bg-gray-900 text-white shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tara — Attendance</h2>
          <nav className="space-x-3">
            <button
              onClick={() => setPage("attendance")}
              className={`px-3 py-1 rounded ${
                page === "attendance"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300"
              }`}
            >
              Attendance
            </button>
            <button
              onClick={() => setPage("summary")}
              className={`px-3 py-1 rounded ${
                page === "summary" ? "bg-blue-600 text-white" : "text-gray-300"
              }`}
            >
              Summary
            </button>
          </nav>
        </div>
      </header>

      <main>
        {page === "attendance" ? (
          <AttendancePage onOpenSummary={() => setPage("summary")} />
        ) : (
          <AttendanceSummary onOpenAttendance={() => setPage("attendance")} />
        )}
      </main>
    </div>
  );
}

export default App;
