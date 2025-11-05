import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AttendancePage from "./pages/AttendancePage";
import AttendanceSummary from "./pages/AttendanceSummary";
import Secret from "./pages/Secret";
import PublicHome from "./pages/PublicHome";

function App() {
  return (
    <BrowserRouter>
      <div>
        <header className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 text-white shadow-lg border-b border-gray-800">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            {/* Logo / Title */}
            <h2 className="text-xl sm:text-2xl font-bold tracking-wide bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Tara
            </h2>

            {/* Placeholder for future navigation (intentionally blank) */}
            <div className="w-8 h-8" />
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<PublicHome />} />
            <Route path="/secret/12345678987654321" element={<Secret />} />
            <Route
              path="/Attendance/12345678987654321"
              element={<AttendancePage />}
            />
            <Route
              path="/summary/12345678987654321"
              element={<AttendanceSummary />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
