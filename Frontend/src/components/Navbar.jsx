import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="flex items-center gap-3">
      <NavLink
        to="/secret/12345678987654321"
        className={({ isActive }) =>
          `px-3 py-1 rounded ${
            isActive
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:text-white"
          }`
        }
      >
        Secret
      </NavLink>
      <NavLink
        to="/Attendance/12345678987654321"
        className={({ isActive }) =>
          `px-3 py-1 rounded ${
            isActive
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:text-white"
          }`
        }
      >
        Attendance
      </NavLink>

      <NavLink
        to="/summary/12345678987654321"
        className={({ isActive }) =>
          `px-3 py-1 rounded ${
            isActive
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:text-white"
          }`
        }
      >
        Summary
      </NavLink>
    </nav>
  );
}
