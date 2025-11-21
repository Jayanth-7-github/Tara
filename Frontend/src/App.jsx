import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AttendancePage from "./secret/pages/AttendancePage";
import AttendanceSummary from "./secret/pages/AttendanceSummary";
import Secret from "./secret/pages/Secret";
import PublicHome from "./pages/PublicHome";
import About from "./pages/About";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Main from "./pages/Main";
import CreateEvent from "./pages/CreateEvent";
import Assignments from "./pages/Assignments";
import Test from "./pages/Test";
import ManageAttendance from "./secret/pages/ManageAttendance";
import UpdateAttendance from "./secret/pages/UpdateAttendance";
import MarkAbsent from "./secret/pages/MarkAbsent";
import AdminSecret from "./secret/pages/AdminSecret";
import AddRoles from "./secret/pages/AddRoles";
import EventContacts from "./pages/EventContacts";
import EventManagerDashboard from "./pages/EventManagerDashboard";
import { ADMIN_TOKEN } from "./services/constants";
import Hamburger from "./components/hamburger";

function App() {
  return (
    <BrowserRouter>
      <div>
        <header className="bg-linear-to-r from-gray-950 via-gray-900 to-gray-950 text-white shadow-lg border-b border-gray-800">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            {/* Logo / Title */}
            <h2 className="text-xl sm:text-2xl font-bold tracking-wide bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Tara
            </h2>

            {/* Role-based hamburger menu (hidden for user/student) */}
            <Hamburger />
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<PublicHome />} />
            <Route
              path={`/member/secret/${ADMIN_TOKEN}`}
              element={<Secret />}
            />
            <Route
              path={`/member/Attendance/${ADMIN_TOKEN}`}
              element={<AttendancePage />}
            />
            <Route
              path={`/member/summary/${ADMIN_TOKEN}`}
              element={<AttendanceSummary />}
            />
            <Route
              path={`/admin/manage-attendance/${ADMIN_TOKEN}`}
              element={<ManageAttendance />}
            />
            <Route
              path={`/admin/update-attendance/${ADMIN_TOKEN}`}
              element={<UpdateAttendance />}
            />
            <Route
              path={`/admin/secret/${ADMIN_TOKEN}`}
              element={<AdminSecret />}
            />
            <Route
              path={`/admin/roles/${ADMIN_TOKEN}`}
              element={<AddRoles />}
            />
            <Route
              path={`/admin/mark-absent/${ADMIN_TOKEN}`}
              element={<MarkAbsent />}
            />
            <Route path="/about" element={<About />} />
            <Route path="/main" element={<Main />} />
            {/* keep /events for backward compatibility and show dashboard which contains events */}
            <Route path="/events" element={<Main />} />
            <Route path="/events/create" element={<CreateEvent />} />
            <Route path="/events/contacts" element={<EventContacts />} />
            <Route
              path="/events/dashboard"
              element={<EventManagerDashboard />}
            />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/test" element={<Test />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
