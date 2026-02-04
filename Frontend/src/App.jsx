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
import ExamPage from "./Exam/pages/ExamPage";
import Test from "./pages/Test";
import ManageAttendance from "./secret/pages/ManageAttendance";
import UpdateAttendance from "./secret/pages/UpdateAttendance";
import MarkAbsent from "./secret/pages/MarkAbsent";
import AdminSecret from "./secret/pages/AdminSecret";
import AddRoles from "./secret/pages/AddRoles";
import EventContacts from "./pages/EventContacts";
import EventManagerDashboard from "./pages/EventManagerDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ManageApprovals from "./pages/ManageApprovals";
import EventRegister from "./pages/EventRegister";
import StudentResults from "./pages/StudentResults";
import ManageQuestions from "./pages/ManageQuestions";
import { ADMIN_TOKEN } from "./services/constants";
import Hamburger from "./components/hamburger";
import TestCompiler from "./Exam/pages/testcompailer";

function App() {
  return (
    <BrowserRouter>
      <div>
        <header className="bg-linear-to-r from-gray-950 via-gray-900 to-gray-950 text-white shadow-lg border-b border-gray-800">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">

            <h2 className="text-xl sm:text-2xl font-bold tracking-wide bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Tara
            </h2>


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

            <Route path="/events/create" element={<CreateEvent />} />
            <Route path="/events/contacts" element={<EventContacts />} />
            <Route
              path="/events/dashboard"
              element={<EventManagerDashboard />}
            />
            <Route path="/events/questions" element={<ManageQuestions />} />
            <Route path="/events/results" element={<StudentResults />} />
            <Route path="/events/approvals" element={<ManageApprovals />} />
            <Route
              path="/event-registration/:eventId"
              element={<EventRegister />}
            />
            <Route path="/events" element={<Main />} />
            <Route path="/dashboard/student" element={<StudentDashboard />} />
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/test" element={<ExamPage mode="mcq" />} />
            <Route path="/test/coding" element={<ExamPage mode="coding" />} />
            <Route path="/realtest" element={<Test />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/testcompiler" element={<TestCompiler />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
