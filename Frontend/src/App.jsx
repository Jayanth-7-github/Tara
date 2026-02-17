import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AttendancePage from "./secret/pages/AttendancePage";
import AttendanceSummary from "./secret/pages/AttendanceSummary";
import Secret from "./secret/pages/Secret";
import PublicHome from "./pages/PublicHome";
import AuthEntry from "./pages/AuthEntry";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Main from "./pages/Main";
import CreateEvent from "./pages/CreateEvent";
import Assignments from "./pages/Assignments";
import ExamPage from "./Exam/pages/ExamPage";
import Test from "./pages/Test";
import ManageStudent from "./secret/pages/ManageStudent";
import ManageSessions from "./secret/pages/ManageSessions";
import UpdateAttendance from "./secret/pages/UpdateAttendance";
import AdminSecret from "./secret/pages/AdminSecret";
import AddRoles from "./secret/pages/AddRoles";
import EventContacts from "./pages/EventContacts";
import EventManagerDashboard from "./pages/EventManagerDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ManageApprovals from "./pages/ManageApprovals";
import EventRegister from "./pages/EventRegister";
import EventRegistrations from "./pages/EventRegistrations";
import AllRegistrations from "./pages/AllRegistrations";
import StudentResults from "./pages/StudentResults";
import ManageQuestions from "./pages/ManageQuestions";
import { ADMIN_TOKEN } from "./services/constants";
import TestCompiler from "./Exam/pages/testcompailer";
import PublicNavbar from "./components/PublicNavbar";
import GoogleSuccess from "./components/GoogleSuccess";
import DevToolsRestriction from "./components/DevToolsRestriction";

function App() {
  return (
    <BrowserRouter>
      <DevToolsRestriction />
      <div>
        <PublicNavbar />

        <main>
          <Routes>
            <Route path="/" element={<PublicHome />} />

            {/* attendance and summary pages */}
            <Route
              path="/member/secret"
              element={<Secret />}
            />
            <Route
              path="/member/Attendance"
              element={<AttendancePage />}
            />
            <Route
              path="/member/summary"
              element={<AttendanceSummary />}
            />
            {/* Developer options */}
            <Route
              path="/admin/manage-student"
              element={<ManageStudent />}
            />
            <Route
              path="/admin/manage-sessions"
              element={<ManageSessions />}
            />
            <Route
              path="/admin/update-attendance"
              element={<UpdateAttendance />}
            />
            <Route
              path="/admin/secret"
              element={<AdminSecret />}
            />
            <Route
              path="/admin/roles"
              element={<AddRoles />}
            />

            {/* public and event manager pages */}
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
              path="/events/all-registrations"
              element={<AllRegistrations />}
            />
            <Route
              path="/events/:eventId/registrations"
              element={<EventRegistrations />}
            />
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
            <Route path="/login" element={<AuthEntry />} />
            <Route path="/login/email" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/testcompiler" element={<TestCompiler />} />
            <Route path="/google-success" element={<GoogleSuccess />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
