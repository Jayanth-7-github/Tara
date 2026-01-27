import { NavLink } from "react-router-dom";
import { ADMIN_TOKEN } from "../../services/constants";

export default function AdminNavbar() {
  return (
    <nav className="flex flex-wrap items-center gap-2 p-3 bg-gray-800/30 rounded-xl border border-gray-700/50 mb-6">
      <NavLink
        to={`/admin/update-attendance/${ADMIN_TOKEN}`}
        className={({ isActive }) =>
          `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
            isActive
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "text-gray-300 hover:text-white hover:bg-gray-700/50"
          }`
        }
      >
        Update
      </NavLink>

      <NavLink
        to={`/admin/mark-absent/${ADMIN_TOKEN}`}
        className={({ isActive }) =>
          `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
            isActive
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "text-gray-300 hover:text-white hover:bg-gray-700/50"
          }`
        }
      >
        Mark Absent
      </NavLink>

      <NavLink
        to={`/admin/manage-attendance/${ADMIN_TOKEN}`}
        className={({ isActive }) =>
          `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
            isActive
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "text-gray-300 hover:text-white hover:bg-gray-700/50"
          }`
        }
      >
        Students
      </NavLink>

      <NavLink
        to={`/admin/secret/${ADMIN_TOKEN}`}
        className={({ isActive }) =>
          `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
            isActive
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "text-gray-300 hover:text-white hover:bg-gray-700/50"
          }`
        }
      >
        Admin
      </NavLink>

      <NavLink
        to={`/admin/roles/${ADMIN_TOKEN}`}
        className={({ isActive }) =>
          `px-3 py-1 rounded whitespace-nowrap ${
            isActive
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:text-white"
          }`
        }
      >
        Assign Roles
      </NavLink>

      <NavLink
        to={`/member/secret/${ADMIN_TOKEN}`}
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
