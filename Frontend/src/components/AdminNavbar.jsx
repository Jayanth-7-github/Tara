import { NavLink } from "react-router-dom";

export default function AdminNavbar() {
  return (
    <nav className="flex flex-wrap items-center gap-3 overflow-x-auto">
      <NavLink
        to="/admin/update-attendance/12345678987654321"
        className={({ isActive }) =>
          `px-3 py-1 rounded ${
            isActive
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:text-white"
          }`
        }
      >
        Update Attendance
      </NavLink>

      <NavLink
        to="/admin/mark-absent/12345678987654321"
        className={({ isActive }) =>
          `px-3 py-1 rounded ${
            isActive
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:text-white"
          }`
        }
      >
        Mark Absent
      </NavLink>

      <NavLink
        to="/admin/manage-attendance/12345678987654321"
        className={({ isActive }) =>
          `px-3 py-1 rounded whitespace-nowrap ${
            isActive
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:text-white"
          }`
        }
      >
        Manage Attendance
      </NavLink>

      <NavLink
        to="/admin/secret/12345678987654321"
        className={({ isActive }) =>
          `px-3 py-1 rounded whitespace-nowrap ${
            isActive
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:text-white"
          }`
        }
      >
        Admin Secret
      </NavLink>

      <NavLink
        to="/member/secret/12345678987654321"
        className={({ isActive }) =>
          `ml-4 px-3 py-1 rounded text-sm ${
            isActive
              ? "bg-gray-600 text-white"
              : "text-gray-400 hover:text-white"
          }`
        }
      >
        Attendance
      </NavLink>
    </nav>
  );
}
