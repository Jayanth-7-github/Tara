import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  API_BASE,
  fetchStudent,
  checkTestTaken,
  getRoles,
  fetchEvents,
  deleteEvent,
} from "../services/api";
import { getMe } from "../services/auth";
import RegisterForm from "./RegisterForm";
import ContactForm from "./ContactForm";

export default function EventsList({
  events = [],
  loading = false,
  error = null,
  hasTestResults = false,
}) {
  const apiBase = API_BASE.replace(/\/$/, "");
  const [showFormFor, setShowFormFor] = useState(null);
  const [showContactFor, setShowContactFor] = useState(null);
  const [showEditFor, setShowEditFor] = useState(null);
  const [registered, setRegistered] = useState({});
  const [testTaken, setTestTaken] = useState({});
  const [userRole, setUserRole] = useState("");
  const [userRegno, setUserRegno] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [rolesMap, setRolesMap] = useState(null);
  const [localEvents, setLocalEvents] = useState(events || []);
  const [expressedInterest, setExpressedInterest] = useState({});
  const navigate = useNavigate();
  const contactEmail =
    import.meta.env.VITE_CONTACT_EMAIL || "99240041378@klu.ac.in";

  // Load expressed interest from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("expressedInterest");
      if (stored) {
        setExpressedInterest(JSON.parse(stored));
      }
    } catch (err) {
      // ignore
    }
  }, []);

  // Load current user's registration state (if logged in) so registration persists across reload/login
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await getMe();
        // auth.getMe returns { user: { ... } } — accept both shapes for robustness
        const regno = me?.user?.regno || me?.regno;
        const role = me?.user?.role || me?.role || "";
        const name = me?.user?.name || me?.name || "";
        const email = me?.user?.email || me?.email || "";
        if (mounted && role) setUserRole(role);
        if (mounted && regno) setUserRegno(String(regno).trim().toUpperCase());
        if (mounted && name) setUserName(name);
        if (mounted && email) setUserEmail(email);
        // If backend returned roles with the auth payload, use it as authoritative
        if (me && me.roles) {
          if (mounted) setRolesMap(me.roles);
        }
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
        // Only fetch roles if we don't already have them from getMe
        if (rolesMap) return;
        const body = await getRoles().catch(() => ({}));
        if (!mounted) return;
        setRolesMap(body || {});
      } catch (err) {
        // ignore
      }
    })();
    return () => (mounted = false);
  }, [apiBase]);

  // keep a local copy of events so we can update UI after edits/deletes
  useEffect(() => {
    setLocalEvents(Array.isArray(events) ? events : []);
  }, [events]);

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
      {localEvents.map((ev) => {
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
        let allowedToRegister =
          userRole === "admin" ||
          isAdminByRoles ||
          (regUpper && (inPerEvent || inGlobal));

        // Compute whether current user can manage (edit/delete) this event
        const userEmailLower = (userEmail || "").toLowerCase().trim();
        let isEventManager = false;
        // First, direct managerEmail match by email
        if (
          userEmailLower &&
          ev.managerEmail &&
          String(ev.managerEmail).toLowerCase().trim() === userEmailLower
        ) {
          isEventManager = true;
        }
        // Next, check per-event managers stored in rolesMap keyed by event title (fall back to id)
        if (!isEventManager && rolesMap && rolesMap.eventManagersByEvent) {
          const em = rolesMap.eventManagersByEvent;
          const eventKey = eventNameKey; // prefer title-like key
          let list = [];
          if (em) {
            if (typeof em.get === "function") {
              list = em.get(eventKey) || [];
            } else if (em[eventKey]) {
              list = em[eventKey] || [];
            }
          }
          if (Array.isArray(list) && list.length) {
            const lowered = list.map((s) => String(s || "").toLowerCase());
            const uppered = list.map((s) => String(s || "").toUpperCase());
            if (userEmailLower && lowered.includes(userEmailLower))
              isEventManager = true;
            if (!isEventManager && userRegno && uppered.includes(userRegno))
              isEventManager = true;
          }
        }
        // If the user is an event manager, grant them full rights for this event
        if (isEventManager) allowedToRegister = true;

        const canManage =
          userRole === "admin" || isAdminByRoles || isEventManager;

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
                {/* show per-event status: Event manager / Admin / Event */}
                <span className="text-xs text-gray-300">
                  {isEventManager ? (
                    <>
                      {/* full label on small+ screens, short on xs */}
                      <span className="hidden sm:inline px-2 py-0.5 bg-yellow-700 rounded text-yellow-100">
                        Manager
                      </span>
                      <span className="inline sm:hidden px-2 py-0.5 bg-yellow-700 rounded text-yellow-100">
                        Mgr
                      </span>
                    </>
                  ) : userRole === "admin" || isAdminByRoles ? (
                    <>
                      <span className="hidden sm:inline px-2 py-0.5 bg-green-700 rounded text-green-100">
                        Admin
                      </span>
                      <span className="inline sm:hidden px-2 py-0.5 bg-green-700 rounded text-green-100">
                        Adm
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Event</span>
                      <span className="inline sm:hidden">Ev</span>
                    </>
                  )}
                </span>
              </div>

              <p className="mt-2 text-xs text-gray-300">{ev.description}</p>
              {/* show per-event managers if present */}
              {rolesMap &&
                rolesMap.eventManagersByEvent &&
                (() => {
                  const em = rolesMap.eventManagersByEvent;
                  const key = eventNameKey;
                  let list = [];
                  if (em) {
                    if (typeof em.get === "function") list = em.get(key) || [];
                    else list = em[key] || [];
                  }
                  if (Array.isArray(list) && list.length) {
                    return (
                      <p className="mt-2 text-xs text-gray-400">
                        Event managers: {list.join(", ")}
                      </p>
                    );
                  }
                  return null;
                })()}

              <div className="mt-4 flex items-center gap-3">
                {registered[id] ? (
                  <>
                    <div className="text-sm text-green-300">Registered ✓</div>
                    {testTaken[id] || hasTestResults ? (
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
                    )}
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
                    ) : expressedInterest[id] ? (
                      <button
                        disabled
                        className="px-3 py-1 text-xs rounded bg-gray-600 text-gray-300 cursor-not-allowed"
                        title="Your interest has been sent to the event manager"
                      >
                        Waiting for Approval
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowContactFor(id)}
                        className="px-3 py-1 text-xs rounded bg-yellow-600 hover:bg-yellow-700 transition text-white cursor-pointer"
                        title="Express your interest to register"
                      >
                        I'm Interested
                      </button>
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
      {/* Contact modal */}
      {showContactFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowContactFor(null)}
        >
          <div
            className="w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <ContactForm
              event={events.find((e) => (e._id || e.id) === showContactFor)}
              fallbackEmail={contactEmail}
              initial={{ name: userName, regno: userRegno, email: userEmail }}
              onClose={() => setShowContactFor(null)}
              onSent={() => {
                // Mark interest as expressed
                const newInterest = {
                  ...expressedInterest,
                  [showContactFor]: true,
                };
                setExpressedInterest(newInterest);
                localStorage.setItem(
                  "expressedInterest",
                  JSON.stringify(newInterest)
                );
              }}
            />
          </div>
        </div>
      )}
      {/* Edit modal */}
      {showEditFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowEditFor(null)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl max-w-3xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-blue-400">
                Edit Event
              </h3>
              <button
                onClick={() => setShowEditFor(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <EventForm
              mode="edit"
              eventId={showEditFor}
              initialData={localEvents.find(
                (e) => (e._id || e.id) === showEditFor
              )}
              onSuccess={async () => {
                // refresh list and close modal
                try {
                  const fresh = await fetchEvents();
                  setLocalEvents(fresh.events || fresh || []);
                } catch (err) {
                  // fallback: close modal and rely on parent to refresh
                }
                setShowEditFor(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
