import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  API_BASE,
  fetchStudent,
  checkTestTaken,
  getRoles,
} from "../services/api";
import { getMe } from "../services/auth";
import RegisterForm from "./RegisterForm";

export default function EventsList({
  events = [],
  loading = false,
  error = null,
  hasTestResults = false,
}) {
  const apiBase = API_BASE.replace(/\/$/, "");
  const [showFormFor, setShowFormFor] = useState(null);
  const [registered, setRegistered] = useState({});
  const [testTaken, setTestTaken] = useState({});
  const [userRole, setUserRole] = useState("");
  const [userRegno, setUserRegno] = useState("");
  const [rolesMap, setRolesMap] = useState(null);
  const navigate = useNavigate();
  const contactEmail =
    import.meta.env.VITE_CONTACT_EMAIL || "admin@college.edu";

  // Load current user's registration state (if logged in) so registration persists across reload/login
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await getMe();
        // auth.getMe returns { user: { ... } } — accept both shapes for robustness
        const regno = me?.user?.regno || me?.regno;
        const role = me?.user?.role || me?.role || "";
        if (mounted && role) setUserRole(role);
        if (mounted && regno) setUserRegno(String(regno).trim().toUpperCase());
        if (!regno) return;
        const student = await fetchStudent(regno);
        const regs = student.registrations || [];
        const regMap = {};
        regs.forEach((r) => {
          if (!r || !r.event) return;
          const id = typeof r.event === "string" ? r.event : String(r.event);
          regMap[id] = true;
        });
        if (mounted) setRegistered(regMap);
      } catch (err) {
        // ignore - user not logged in or no student record
      }
    })();
    return () => (mounted = false);
  }, []);

  // Load roles mapping (admins/students and per-event assignments)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const body = await getRoles().catch(() => ({}));
        if (!mounted) return;
        setRolesMap(body || {});
      } catch (err) {
        // ignore
      }
    })();
    return () => (mounted = false);
  }, [apiBase]);

  // When registrations change (or events load), check whether the logged-in user
  // has already taken the test for each registered event. We only query for
  // events the user is registered for to reduce API calls.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // For each event that the user is registered for, call checkTestTaken
        const entries = Object.keys(registered).filter((id) => registered[id]);
        if (!entries.length) return;
        for (const id of entries) {
          // find event by id to get a title (backend expects testTitle)
          const ev = events.find((e) => (e._id || e.id) === id);
          if (!ev) continue;
          try {
            const resp = await checkTestTaken(ev.title);
            if (!mounted) return;
            setTestTaken((t) => ({ ...t, [id]: Boolean(resp && resp.taken) }));
          } catch (err) {
            // ignore per-event check errors
            if (!mounted) return;
            setTestTaken((t) => ({ ...t, [id]: false }));
          }
        }
      } catch (err) {
        // no-op
      }
    })();
    return () => (mounted = false);
  }, [registered, events]);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading events...</p>
      </div>
    );
  }

  if (error) {
    return <div className="py-12 text-center text-red-400">{error}</div>;
  }

  if (!events || events.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-400">Events coming soon — check back later.</p>
      </div>
    );
  }

  return (
    // Use a wrapping flex layout so cards keep a compact width and align left when only one item
    <div className="flex flex-wrap gap-5 items-start">
      {events.map((ev) => {
        const id = ev._id || ev.id;
        const imageSrc = ev.imageUrl || `${apiBase}/events/${id}/image`;

        // Precompute per-event permission: whether this logged-in user (or admin)
        // is allowed to register for this specific event. The backend now
        // exposes `studentsByEvent` keyed by event title/name, so we check
        // that map using the event's title. We still fall back to a global
        // `students` list for site-wide students.
        const eventNameKey = String(ev.title || ev.name || id).trim();
        let perEventStudents = null;
        if (rolesMap && rolesMap.studentsByEvent) {
          if (rolesMap.studentsByEvent[eventNameKey])
            perEventStudents = rolesMap.studentsByEvent[eventNameKey];
          else if (typeof rolesMap.studentsByEvent.get === "function")
            perEventStudents = rolesMap.studentsByEvent.get(eventNameKey);
        }
        const globalStudents =
          rolesMap && Array.isArray(rolesMap.students) ? rolesMap.students : [];
        const regUpper = (userRegno || "").toUpperCase();
        // Treat regnos present in rolesMap.admins as admins on the client as well
        const globalAdmins =
          rolesMap && Array.isArray(rolesMap.admins) ? rolesMap.admins : [];
        const isAdminByRoles =
          regUpper &&
          globalAdmins.map((s) => String(s).toUpperCase()).includes(regUpper);
        const inPerEvent =
          perEventStudents &&
          Array.isArray(perEventStudents) &&
          perEventStudents
            .map((s) => String(s).toUpperCase())
            .includes(regUpper);
        const inGlobal =
          Array.isArray(globalStudents) &&
          globalStudents.map((s) => String(s).toUpperCase()).includes(regUpper);
        const allowedToRegister =
          userRole === "admin" ||
          isAdminByRoles ||
          (regUpper && (inPerEvent || inGlobal));

        return (
          <article
            key={id}
            className="rounded-2xl overflow-hidden border border-gray-800 shadow-sm bg-transparent w-full sm:w-80"
          >
            {imageSrc && (
              <img
                src={imageSrc}
                alt={ev.title}
                className="w-full h-44 object-contain bg-white"
                style={{ objectFit: "contain" }}
              />
            )}

            <div className="p-4 bg-gray-900 relative">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-100">
                    {ev.title}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {new Date(ev.date).toLocaleString()} •{" "}
                    {ev.venue || ev.location}
                  </p>
                </div>
                <span className="text-xs text-gray-300">Event</span>
              </div>

              <p className="mt-2 text-xs text-gray-300">{ev.description}</p>

              <div className="mt-4 flex items-center gap-3">
                {registered[id] ? (
                  <>
                    <div className="text-sm text-green-300">Registered ✓</div>
                    {allowedToRegister ? (
                      testTaken[id] || hasTestResults ? (
                        <button
                          disabled
                          className="px-4 py-2 text-sm  text-green-300 cursor-not-allowed transition shadow"
                        >
                          Test Taken ✓
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/test?eventId=${id}`)}
                          className="px-3 py-1 text-xs rounded bg-green-600 hover:bg-green-700 transition text-white"
                        >
                          Take Test
                        </button>
                      )
                    ) : null}
                  </>
                ) : showFormFor === id ? (
                  <>
                    <div className="w-full">
                      <RegisterForm
                        eventId={id}
                        onRegistered={() => {
                          setRegistered((s) => ({ ...s, [id]: true }));
                          setShowFormFor(null);
                        }}
                      />
                    </div>
                    {allowedToRegister && (
                      <button
                        disabled
                        title="Register to enable taking the test"
                        className="px-3 py-1 text-xs rounded bg-gray-400 text-white opacity-60 cursor-not-allowed"
                      >
                        Take Test
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {allowedToRegister ? (
                      <button
                        onClick={() => setShowFormFor(id)}
                        className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 transition text-white"
                      >
                        Register
                      </button>
                    ) : (
                      <a
                        href={`mailto:${encodeURIComponent(
                          contactEmail
                        )}?subject=${encodeURIComponent(
                          "Register for " + (ev.title || "event")
                        )}`}
                        className="px-3 py-1 text-xs rounded bg-yellow-600 hover:bg-yellow-700 transition text-white"
                        title="Contact admin to register"
                      >
                        Contact
                      </a>
                    )}
                    {allowedToRegister && (
                      <button
                        disabled
                        title="Register to enable taking the test"
                        className="px-3 py-1 text-xs rounded bg-gray-400 text-white opacity-60 cursor-not-allowed"
                      >
                        Take Test
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </article>
        );
      })}
      {/* Modal for registration - centered like SearchBar modal */}
      {showFormFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowFormFor(null)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-blue-400">
                Register for Event
              </h3>
              <button
                onClick={() => setShowFormFor(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <RegisterForm
              eventId={showFormFor}
              onRegistered={() => {
                setRegistered((s) => ({ ...s, [showFormFor]: true }));
                setShowFormFor(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
