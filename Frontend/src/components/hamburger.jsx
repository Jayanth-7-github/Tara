import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { getMe } from "../services/auth";
import { ADMIN_TOKEN } from "../services/constants";

/**
 * Role-based hamburger menu.
 * - Hidden for roles 'user' and 'student'
 * - Shows AdminNavbar for 'admin'
 * - Shows Navbar for 'member'
 * - Falls back to a minimal menu for any other role
 */
export default function Hamburger() {
  const [role, setRole] = useState(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const body = await getMe();
        // body shape may be { user: { role } } or { role }
        const r = (body && (body.user?.role || body.role)) || null;
        if (mounted) setRole(r);
      } catch (err) {
        // if not logged in or error, keep role null
        if (mounted) setRole(null);
      }
    }
    load();
    return () => (mounted = false);
  }, []);

  // click outside to close
  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // close on Escape key
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // hide for 'user' and 'student' explicitly
  if (!role) return null; // no menu if we couldn't determine role / not logged in
  const normalized = String(role).toLowerCase();
  if (normalized === "user" || normalized === "student") return null;

  // Define menus per role
  const adminMenu = [
    { label: "Home", to: "/" },
    { label: "About", to: "/about" },
    { label: "Main", to: "/main" },
    { label: "Events", to: "/events" },
    { label: "Create Event", to: "/events/create" },
    { label: "Assignments", to: "/assignments" },
    { label: "Test", to: "/test" },
    { label: "Login", to: "/login" },
    { label: "Signup", to: "/signup" },
    { label: "Member Secret", to: `/member/secret/${ADMIN_TOKEN}` },
    { label: "Attendance", to: `/member/Attendance/${ADMIN_TOKEN}` },
    { label: "Summary", to: `/member/summary/${ADMIN_TOKEN}` },
    {
      label: "Manage Attendance",
      to: `/admin/manage-attendance/${ADMIN_TOKEN}`,
    },
    {
      label: "Update Attendance",
      to: `/admin/update-attendance/${ADMIN_TOKEN}`,
    },
    { label: "Admin Secret", to: `/admin/secret/${ADMIN_TOKEN}` },
    { label: "Assign Roles", to: `/admin/roles/${ADMIN_TOKEN}` },
    { label: "Mark Absent", to: `/admin/mark-absent/${ADMIN_TOKEN}` },
  ];

  const limitedMenu = [
    { label: "Home", to: "/" },
    { label: "About", to: "/about" },
    { label: "Main", to: "/main" },
    { label: "Events", to: "/events" },
    { label: "Create Event", to: "/events/create" },
    { label: "Attendance", to: `/member/Attendance/${ADMIN_TOKEN}` },
    { label: "Summary", to: `/member/summary/${ADMIN_TOKEN}` },
  ];

  const menuToRender =
    normalized === "admin"
      ? adminMenu
      : normalized === "member" ||
        ["eventmanager", "event_manager", "event-manager"].includes(normalized)
      ? limitedMenu
      : limitedMenu; // fallback to limitedMenu for other roles

  return (
    <div ref={wrapRef} className="relative z-40">
      <button
        aria-label="Open menu"
        onClick={() => setOpen((s) => !s)}
        className="p-2 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        {/* simple hamburger icon */}
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* overlay */}
      <div
        aria-hidden={!open}
        className={`fixed inset-0 bg-black bg-opacity-40 transition-opacity duration-300 ${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* sliding panel from right */}
      <aside
        role="dialog"
        aria-modal="true"
        className={`fixed top-0 right-0 h-full w-80 max-w-full bg-gray-900 border-l border-gray-800 shadow-xl transform transition-transform duration-300 ease-out z-50 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="text-white font-semibold">Menu</div>
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-gray-800"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100%-64px)]">
          <div className="text-gray-200 mb-3">Role: {role}</div>
          <nav className="flex flex-col gap-2">
            {menuToRender.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `text-sm px-3 py-2 rounded ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
}
