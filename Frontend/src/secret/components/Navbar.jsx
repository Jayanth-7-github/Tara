import { NavLink } from "react-router-dom";
import { ADMIN_TOKEN } from "../../services/constants";

export default function Navbar() {
  return (
    <nav className="flex items-center gap-3">
      <NavLink
        to={`/member/secret/${ADMIN_TOKEN}`}
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
        to={`/member/Attendance/${ADMIN_TOKEN}`}
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
        to={`/member/summary/${ADMIN_TOKEN}`}
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
