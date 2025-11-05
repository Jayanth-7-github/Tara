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
        <header className="p-4 bg-gray-900 text-white shadow-sm">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tara — Attendance</h2>
            {/* Intentionally left blank: navigation is available only on the secret page */}
            <div />
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<PublicHome />} />
            <Route path="/secret/12345678987654321" element={<Secret />} />
            <Route path="/Attendance/12345678987654321" element={<AttendancePage />} />
            <Route path="/summary/12345678987654321" element={<AttendanceSummary />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
