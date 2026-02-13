import { NavLink } from "react-router-dom";
import { ADMIN_TOKEN } from "../../services/constants";

export default function Navbar() {
  return (
    <nav className="flex items-center gap-3 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
      <NavLink
        to={`/member/secret/${ADMIN_TOKEN}`}
        className={({ isActive }) =>
          `px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isActive
            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
            : "text-gray-300 hover:text-white hover:bg-gray-700/50"
          }`
        }
      >
        Secret
      </NavLink>
      <NavLink
        to={`/member/Attendance/${ADMIN_TOKEN}`}
        className={({ isActive }) =>
          `px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isActive
            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
            : "text-gray-300 hover:text-white hover:bg-gray-700/50"
          }`
        }
      >
        Attendance
      </NavLink>

      <NavLink
        to={`/member/summary/${ADMIN_TOKEN}`}
        className={({ isActive }) =>
          `px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isActive
            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
            : "text-gray-300 hover:text-white hover:bg-gray-700/50"
          }`
        }
      >
        Summary
      </NavLink>
    </nav>
  );
}
