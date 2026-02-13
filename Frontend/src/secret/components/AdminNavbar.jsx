import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ADMIN_TOKEN } from "../../services/constants";

export default function AdminNavbar() {
  const navigate = useNavigate();
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    // Check initial status and listen for storage changes
    const checkState = () => {
      setIsUnlocked(sessionStorage.getItem("adminUnlocked") === "1");
    };
    checkState();
    window.addEventListener("storage", checkState);
    return () => window.removeEventListener("storage", checkState);
  }, []);

  const handleAdminClick = (e) => {
    if (isUnlocked) return;

    e.preventDefault();
    const key = prompt("Enter Admin Key to unlock navbar:");
    if (key === ADMIN_TOKEN) {
      sessionStorage.setItem("adminUnlocked", "1");
      setIsUnlocked(true);
      // Optional: dispatch event if other components need to know immediately
      window.dispatchEvent(new Event("storage"));
      navigate(`/admin/secret/${ADMIN_TOKEN}`);
    } else if (key !== null) {
      alert("Invalid Admin Key!");
    }
  };

  return (
    <nav className="flex flex-wrap items-center gap-2 p-3 bg-gray-800/30 rounded-xl border border-gray-700/50 mb-6 transition-all duration-300">
      {/* Admin link is always visible, acts as the unlock trigger */}
      <NavLink
        to={`/admin/secret/${ADMIN_TOKEN}`}
        onClick={handleAdminClick}
        className={({ isActive }) =>
          `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${isActive
            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
            : "text-gray-300 hover:text-white hover:bg-gray-700/50"
          }`
        }
      >
        Admin
      </NavLink>

      {/* Other links only shown after unlocking */}
      {isUnlocked && (
        <>
          <NavLink
            to={`/admin/update-attendance/${ADMIN_TOKEN}`}
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${isActive
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
              `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${isActive
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
              `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${isActive
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-gray-300 hover:text-white hover:bg-gray-700/50"
              }`
            }
          >
            Students
          </NavLink>

          <NavLink
            to={`/admin/manage-sessions/${ADMIN_TOKEN}`}
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${isActive
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-gray-300 hover:text-white hover:bg-gray-700/50"
              }`
            }
          >
            Sessions
          </NavLink>

          <NavLink
            to={`/admin/roles/${ADMIN_TOKEN}`}
            className={({ isActive }) =>
              `px-3 py-1 rounded whitespace-nowrap ${isActive
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
              `ml-4 px-3 py-1 rounded text-sm ${isActive
                ? "bg-gray-600 text-white"
                : "text-gray-400 hover:text-white"
              }`
            }
          >
            Attendance
          </NavLink>

          <button
            onClick={() => {
              sessionStorage.removeItem("adminUnlocked");
              setIsUnlocked(false);
              navigate(`/admin/secret/${ADMIN_TOKEN}`);
            }}
            className="ml-auto px-3 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Lock
          </button>
        </>
      )}
    </nav>
  );
}
