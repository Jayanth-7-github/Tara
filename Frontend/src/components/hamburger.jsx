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

  // helper to load current role; exported as standalone function not necessary
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const body = await getMe();
        const r = (body && (body.user?.role || body.role)) || null;
        if (mounted) setRole(r);
      } catch (err) {
        if (mounted) setRole(null);
      }
    }

    // initial load
    load();

    // when other parts of app change auth state, they should dispatch 'auth-changed'
    // so we re-fetch role immediately rather than waiting for full reload.
    function onAuthChange() {
      load();
    }
    window.addEventListener("auth-changed", onAuthChange);

    return () => {
      mounted = false;
      window.removeEventListener("auth-changed", onAuthChange);
    };
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
  // Show menu for all roles now
  // if (normalized === "user" || normalized === "student") return null;

  // Define menus per role
  const adminMenu = [
    { label: "Admin Dashboard", to: "/dashboard/admin" },
    { label: "Events", to: "/main" },
    { label: "Assign Roles", to: `/admin/roles/${ADMIN_TOKEN}` },
  ];

  const memberMenu = [
    { label: "Event Manager", to: "/events/dashboard" },
    { label: "Events", to: "/main" },
  ];

  const studentMenu = [
    { label: "My Dashboard", to: "/dashboard/student" },
    { label: "Events", to: "/main" },
  ];

  const menuToRender =
    normalized === "admin"
      ? adminMenu
      : normalized === "member" ||
        ["eventmanager", "event_manager", "event-manager"].includes(normalized)
      ? memberMenu
      : normalized === "student" || normalized === "user"
      ? studentMenu
      : studentMenu; // fallback to studentMenu for other roles

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
          <div className="mb-4 pb-3 border-b border-gray-700">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Current Role
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  normalized === "admin"
                    ? "bg-red-500"
                    : normalized === "member"
                    ? "bg-blue-500"
                    : "bg-green-500"
                }`}
              ></div>
              <span className="text-white font-medium capitalize">{role}</span>
            </div>
          </div>
          <nav className="flex flex-col gap-1.5">
            {menuToRender.map((item, index) => {
              return (
                <React.Fragment key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `text-sm px-3 py-2.5 rounded-lg transition-all flex items-center gap-2 ${
                        isActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                          : "text-gray-300 hover:text-white hover:bg-gray-800"
                      }`
                    }
                  >
                    {/* Icons based on label */}
                    {item.label.includes("Dashboard") && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                        />
                      </svg>
                    )}
                    {item.label === "Events" && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                    {item.label === "Event Manager" && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                    {item.label === "Assignments" && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    )}
                    {item.label === "Test" && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                        />
                      </svg>
                    )}
                    {item.label.includes("Attendance") && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    {item.label.includes("Roles") && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    )}
                    {(item.label.includes("Secret") ||
                      item.label.includes("Absent")) && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    )}
                    <span>{item.label}</span>
                  </NavLink>
                </React.Fragment>
              );
            })}
          </nav>
        </div>
      </aside>
    </div>
  );
}
