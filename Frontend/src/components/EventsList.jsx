import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  API_BASE,
  fetchStudent,
  checkTestTaken,
  getRoles,
  fetchEvents,
  deleteEvent,
  updateEvent,
  getMyContactRequests,
} from "../services/api";
import { getMe } from "../services/auth";
import ContactForm from "./ContactForm";
import EventForm from "./EventForm";

export default function EventsList({
  events = [],
  loading = false,
  error = null,
  hasTestResults = false,
}) {
  const apiBase = API_BASE.replace(/\/$/, "");
  const comicFont = {
    fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
  };
  const [showContactFor, setShowContactFor] = useState(null);
  const [showDetailsFor, setShowDetailsFor] = useState(null);
  const [showEditFor, setShowEditFor] = useState(null);
  const [registered, setRegistered] = useState({});
  const [testTaken, setTestTaken] = useState({});
  const [userRole, setUserRole] = useState("");
  const [userRegno, setUserRegno] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userBranch, setUserBranch] = useState("");
  const [userCollege, setUserCollege] = useState("");
  const [rolesMap, setRolesMap] = useState(null);
  const [localEvents, setLocalEvents] = useState(events || []);
  const [expressedInterest, setExpressedInterest] = useState({});
  const [approvalStatus, setApprovalStatus] = useState({}); // Track approval status of expressed interests
  const [userContacts, setUserContacts] = useState({}); // Map eventId to contact object
  const [imageError, setImageError] = useState({});
  const [isTogglingTest, setIsTogglingTest] = useState(false);
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

    const fetchUserData = async () => {
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
        if (mounted && student) {
          if (student.name) setUserName(student.name);
          if (student.email) setUserEmail(student.email);
          if (student.branch) setUserBranch(student.branch);
          if (student.college) setUserCollege(student.college);
        }
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
    };

    fetchUserData();
    const interval = setInterval(fetchUserData, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Load user's contacts to check approval status
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!userRegno) return;
        const resp = await getMyContactRequests();
        const contacts = resp.contacts || [];
        const statusMap = {};
        const contactMap = {};

        for (const contact of contacts) {
          const eventId = String(contact.eventId);
          // Store the contact for later use
          if (!contactMap[eventId]) {
            contactMap[eventId] = contact;
          }
          // Map approval status
          statusMap[eventId] = {
            approved: contact.approved,
            status: contact.status,
            contactId: contact._id,
          };
        }

        if (mounted) {
          setApprovalStatus(statusMap);
          setUserContacts(contactMap);
        }
      } catch (err) {
        // ignore - user not logged in or no contacts
      }
    })();
    return () => (mounted = false);
  }, [userRegno]);

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

  // When registrations change (or events load), check test status for each event
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const entries = Object.keys(registered).filter((id) => registered[id]);
        if (!entries.length) return;

        // Since ExamPage currently uses hardcoded titles, we check these titles globally
        // In a real app, these titles should probably include the event ID.
        const mcqTitle = "Module Practice Assessment | Polymorphism";
        const codingTitle = "Module Practice Assessment | Coding Round";

        // We can batch check or just check once if titles are global.
        // But to keep structure ready for event-specific checks, let's keep the loop or mapping.
        // Assuming for now the tests are linked to these specific titles regardless of event.

        const mcqResp = await checkTestTaken(mcqTitle).catch(() => ({
          taken: false,
        }));
        const codingResp = await checkTestTaken(codingTitle).catch(() => ({
          taken: false,
        }));

        if (!mounted) return;

        const status = {
          mcq: Boolean(mcqResp?.taken),
          coding: Boolean(codingResp?.taken),
        };

        const newTestTaken = {};
        entries.forEach((id) => {
          newTestTaken[id] = status;
        });

        setTestTaken(newTestTaken);
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
    <>
      <div className="flex flex-wrap gap-6 items-start justify-center">
        {localEvents.map((ev) => {
          const id = ev._id || ev.id;
          const cacheBustSource = ev.updatedAt || ev.createdAt;
          const cacheBust = cacheBustSource
            ? `?v=${new Date(cacheBustSource).getTime()}`
            : "";
          const imageSrc =
            ev.imageUrl || `${apiBase}/events/${id}/image${cacheBust}`;
          const tests = testTaken[id];
          const rawPrice =
            ev.price !== undefined && ev.price !== null ? ev.price : ev.fee;
          let priceLabel = null;
          let isFree = false;
          if (rawPrice === undefined || rawPrice === null || rawPrice === "") {
            isFree = true;
          } else if (
            typeof rawPrice === "string" &&
            rawPrice.toLowerCase() === "free"
          ) {
            isFree = true;
          } else {
            const n = Number(rawPrice);
            if (!Number.isNaN(n) && n > 0) priceLabel = `₹${n}`;
            else isFree = true;
          }
          const eventDate = new Date(ev.date);
          const dateLabel = eventDate.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          });
          const timeLabel = eventDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <article
              key={id}
              className="relative w-full max-w-md cursor-pointer rounded-[30px] overflow-hidden border border-slate-800 bg-slate-950/90 shadow-[0_18px_40px_rgba(0,0,0,0.7)] backdrop-blur group"
              style={comicFont}
              onClick={() => setShowDetailsFor(id)}
            >
              {/* Top image */}
              <div className="relative h-52 w-full bg-black">
                {imageSrc && !imageError[id] ? (
                  <img
                    src={imageSrc}
                    alt={ev.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={() =>
                      setImageError((prev) => ({ ...prev, [id]: true }))
                    }
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-600 text-sm">
                    No image
                  </div>
                )}

                {registered[id] && (
                  <span className="absolute bottom-4 left-4 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] bg-green-900/70 text-green-300 rounded-full border border-green-500/60 shadow-lg">
                    Registered
                  </span>
                )}
              </div>

              {/* Bottom content */}
              <div
                className="relative px-5 pt-5 pb-4 bg-slate-950/95 border-t border-slate-800"
                style={comicFont}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-50 tracking-wide">
                      {ev.title}
                    </h3>
                  </div>
                  <span className="text-sm font-semibold text-slate-100">
                    {priceLabel || "Free"}
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-300 leading-relaxed line-clamp-3">
                  {ev.description}
                </p>

                <div className="mt-4 text-xs text-slate-400 space-y-1">
                  {(ev.venue || ev.location) && (
                    <p className="font-medium">{ev.venue || ev.location}</p>
                  )}
                  <p>
                    {dateLabel} • {timeLabel}
                  </p>
                </div>

                {registered[id] && ev.isTestEnabled !== false && (
                  <div className="mt-3 text-[11px] text-slate-300 flex items-center justify-between">
                    <span className="uppercase tracking-[0.18em] text-slate-400">
                      Tests
                    </span>
                    <span className="font-semibold">
                      {tests?.coding
                        ? "All tests completed"
                        : tests?.mcq
                          ? "Test 1 done • Test 2 left"
                          : "Not started yet"}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetailsFor(id);
                  }}
                  className="mt-5 w-full rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-50 font-semibold text-sm py-2.5 border border-slate-700 shadow-[0_0_0_1px_rgba(148,163,184,0.4)] transition-colors"
                >
                  View Details
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Event Details Modal */}
      {showDetailsFor &&
        (() => {
          const id = showDetailsFor;
          const ev = localEvents.find((e) => (e._id || e.id) === id);
          if (!ev) return null;

          const cacheBustSource = ev.updatedAt || ev.createdAt;
          const cacheBust = cacheBustSource
            ? `?v=${new Date(cacheBustSource).getTime()}`
            : "";
          const imageSrc =
            ev.imageUrl || `${apiBase}/events/${id}/image${cacheBust}`;

          // Re-calculate permissions logic for the modal context
          const eventNameKey = String(ev.title || ev.name || id).trim();
          let perEventStudents = null;
          if (rolesMap && rolesMap.studentsByEvent) {
            if (rolesMap.studentsByEvent[eventNameKey])
              perEventStudents = rolesMap.studentsByEvent[eventNameKey];
            else if (typeof rolesMap.studentsByEvent.get === "function")
              perEventStudents = rolesMap.studentsByEvent.get(eventNameKey);
          }
          const globalStudents =
            rolesMap && Array.isArray(rolesMap.students)
              ? rolesMap.students
              : [];
          const regUpper = (userRegno || "").toUpperCase();
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
            globalStudents
              .map((s) => String(s).toUpperCase())
              .includes(regUpper);

          const eventApprovalStatus = approvalStatus[id];
          const isApproved =
            eventApprovalStatus && eventApprovalStatus.approved;

          let allowedToRegister =
            userRole === "admin" ||
            isAdminByRoles ||
            (regUpper && (inPerEvent || inGlobal)) ||
            isApproved;

          const userEmailLower = (userEmail || "").toLowerCase().trim();
          let isEventManager = false;
          if (
            userEmailLower &&
            ev.managerEmail &&
            String(ev.managerEmail).toLowerCase().trim() === userEmailLower
          ) {
            isEventManager = true;
          }
          if (!isEventManager && rolesMap && rolesMap.eventManagersByEvent) {
            const em = rolesMap.eventManagersByEvent;
            const eventKey = eventNameKey;
            let list = [];
            if (em) {
              if (typeof em.get === "function") list = em.get(eventKey) || [];
              else list = em[eventKey] || [];
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
          if (isEventManager) allowedToRegister = true;

          const canManageTests =
            isEventManager || userRole === "admin" || isAdminByRoles;

          return (
            <div
              className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md px-3 sm:px-0"
              onClick={() => setShowDetailsFor(null)}
            >
              <div
                className="w-full max-w-md sm:max-w-6xl h-[85vh] sm:h-[90vh] bg-gray-900 border border-gray-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Left Side: Image */}
                <div className="w-full md:w-1/2 h-52 sm:h-64 md:h-full bg-black relative">
                  {imageSrc && !imageError[id] ? (
                    <img
                      src={imageSrc}
                      alt={ev.title}
                      className="w-full h-full object-contain p-4"
                      onError={() =>
                        setImageError((prev) => ({ ...prev, [id]: true }))
                      }
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-700">
                      No Image
                    </div>
                  )}
                  <button
                    onClick={() => setShowDetailsFor(null)}
                    className="absolute top-4 left-4 md:hidden bg-black/50 p-2 rounded-full text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* Right Side: Details */}
                <div className="w-full md:w-1/2 h-full flex flex-col bg-gray-900 border-l border-gray-800">
                  <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
                    <div className="flex justify-between items-start mb-4 sm:mb-6">
                      <div>
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                          {new Date(ev.date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                          })}
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2 leading-tight">
                          {ev.title}
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">
                          {ev.venue || ev.location} •{" "}
                          {new Date(ev.date).toLocaleTimeString()}
                        </p>
                        <p className="text-gray-200 text-sm mt-2 font-semibold">
                          {(() => {
                            const rawPrice =
                              ev.price !== undefined && ev.price !== null
                                ? ev.price
                                : ev.fee;
                            if (
                              rawPrice === undefined ||
                              rawPrice === null ||
                              rawPrice === ""
                            )
                              return "Free";
                            if (
                              typeof rawPrice === "string" &&
                              rawPrice.toLowerCase() === "free"
                            )
                              return "Free";
                            const n = Number(rawPrice);
                            if (!Number.isNaN(n) && n > 0) return `₹${n}`;
                            return "Free";
                          })()}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowDetailsFor(null)}
                        className="hidden md:block text-gray-500 hover:text-white transition-colors"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
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

                    <div className="prose prose-invert max-w-none">
                      <p className="text-gray-300 leading-relaxed text-base sm:text-lg">
                        {ev.description}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="mt-8 space-y-4 border-t border-gray-800 pt-6">
                      {canManageTests && (
                        <div className="flex flex-col gap-4 mb-6">
                          <div className="flex items-center gap-2">
                            <span className="bg-yellow-900/30 text-yellow-500 px-3 py-1 rounded text-xs font-bold uppercase">
                              You can manage tests for this event
                            </span>
                          </div>

                          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center justify-between">
                            <div>
                              <h4 className="text-white font-semibold text-sm">
                                Test Availability
                              </h4>
                              <p className="text-gray-400 text-xs mt-1">
                                {ev.isTestEnabled !== false
                                  ? "Tests are visible to students."
                                  : "Tests are hidden from students."}
                              </p>
                            </div>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  if (isTogglingTest) return;
                                  setIsTogglingTest(true);
                                  const newStatus =
                                    ev.isTestEnabled === false ? true : false;
                                  await updateEvent(id, {
                                    isTestEnabled: newStatus,
                                  });
                                  // Update local state immediately for UI response
                                  setLocalEvents((prev) =>
                                    prev.map((item) =>
                                      (item._id || item.id) === id
                                        ? { ...item, isTestEnabled: newStatus }
                                        : item,
                                    ),
                                  );
                                } catch (err) {
                                  console.error("Failed to toggle test", err);
                                } finally {
                                  setIsTogglingTest(false);
                                }
                              }}
                              disabled={isTogglingTest}
                              className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${ev.isTestEnabled !== false
                                ? "bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20"
                                : "bg-green-500/10 text-green-400 border border-green-500/50 hover:bg-green-500/20"
                                }`}
                            >
                              {isTogglingTest
                                ? ev.isTestEnabled !== false
                                  ? "Disabling..."
                                  : "Enabling..."
                                : ev.isTestEnabled !== false
                                  ? "Disable Tests"
                                  : "Enable Tests"}
                            </button>
                          </div>
                        </div>
                      )}
                      {/* Organizer & managers info */}
                      {(() => {
                        const em = rolesMap && rolesMap.eventManagersByEvent;
                        const key = eventNameKey;
                        let list = [];
                        if (em) {
                          if (typeof em.get === "function")
                            list = em.get(key) || [];
                          else list = em[key] || [];
                        }
                        const hasManagers = Array.isArray(list) && list.length;
                        const organizerEmail = ev.managerEmail;

                        if (!organizerEmail && !hasManagers) return null;

                        return (
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-gray-500 uppercase">
                              Organizer & Managers
                            </h4>
                            {organizerEmail && (
                              <p className="text-gray-300 text-sm">
                                Created by:{" "}
                                <span className="font-semibold">
                                  {organizerEmail}
                                </span>
                              </p>
                            )}
                            {hasManagers && (
                              <p className="text-gray-300 text-sm">
                                Event manager(s): {list.join(", ")}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-4 sm:p-6 border-t border-gray-800 bg-gray-900/50 flex flex-wrap gap-4 items-center justify-between">
                    <div>
                      {registered[id] ? (
                        <span className="flex items-center gap-2 text-green-400 font-bold">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          You are registered
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">
                          Join this event to get started.
                        </span>
                      )}
                    </div>

                    <div className="flex gap-3">
                      {registered[id] ? (
                        <>
                          {ev.isTestEnabled !== false ? (
                            <>
                              {testTaken[id]?.coding ? (
                                <button
                                  disabled
                                  className="px-6 py-3 rounded-xl bg-gray-800 text-gray-500 font-bold cursor-not-allowed"
                                >
                                  All Tests Completed
                                </button>
                              ) : testTaken[id]?.mcq ? (
                                <button
                                  onClick={() =>
                                    window.open(
                                      `/test/coding?eventId=${id}&eventName=${encodeURIComponent(ev.title)}`,
                                      "_blank",
                                    )
                                  }
                                  className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-900/20 transition-all hover:scale-105"
                                >
                                  Take Test 2 (Coding)
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    window.open(
                                      `/test?eventId=${id}&eventName=${encodeURIComponent(ev.title)}`,
                                      "_blank",
                                    )
                                  }
                                  className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-900/20 transition-all hover:scale-105"
                                >
                                  Take Test 1 (MCQ)
                                </button>
                              )}
                            </>
                          ) : null}
                        </>
                      ) : (
                        <>
                          {eventApprovalStatus ? (
                            <button
                              disabled
                              className="px-6 py-3 rounded-xl bg-gray-700 text-gray-400 font-bold cursor-not-allowed"
                            >
                              Request Pending...
                            </button>
                          ) : !userEmail
                            ?.toLowerCase()
                            .trim()
                            .endsWith("@klu.ac.in") &&
                            !allowedToRegister &&
                            !isApproved ? (
                            <button
                              onClick={() => setShowContactFor(id)}
                              className="px-6 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white font-bold shadow-lg shadow-yellow-900/20 transition-all hover:scale-105"
                            >
                              Express Interest
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                navigate(`/event-registration/${id}`, {
                                  state: { eventTitle: ev.title },
                                })
                              }
                              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
                            >
                              Register Now
                            </button>
                          )}
                        </>
                      )}

                      {/* Edit Action for Managers/Admins */}
                      {(userRole === "admin" ||
                        isAdminByRoles ||
                        isEventManager) && (
                          <button
                            onClick={() => {
                              setShowDetailsFor(null);
                              setShowEditFor(id);
                            }}
                            className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition-colors"
                          >
                            Edit
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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
              initial={{
                name: userName,
                regno: userRegno,
                email: userEmail,
                branch: userBranch,
                college: userCollege,
              }}
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
                  JSON.stringify(newInterest),
                );
                // Refresh approval status
                setApprovalStatus((prev) => ({
                  ...prev,
                  [showContactFor]: {
                    approved: false,
                    status: "unread",
                  },
                }));
              }}
            />
          </div>
        </div>
      )}
      {/* Edit modal */}
      {showEditFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4"
          onClick={() => setShowEditFor(null)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-6 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-gray-800 z-10 pb-2">
              <h3 className="text-xl font-semibold text-blue-400">
                Edit Event
              </h3>
              <button
                onClick={() => setShowEditFor(null)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>
            <EventForm
              mode="edit"
              eventId={showEditFor}
              initialData={localEvents.find(
                (e) => (e._id || e.id) === showEditFor,
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
    </>
  );
}
