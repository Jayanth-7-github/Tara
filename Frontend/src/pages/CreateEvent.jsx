import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventForm from "../components/EventForm";
import EventsAdminList from "../components/EventsAdminList";
import { checkLogin } from "../services/auth";
import { fetchEvents, deleteEvent, getRoles } from "../services/api";

export default function CreateEvent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorizedCreate, setAuthorizedCreate] = useState(false); // can create (admin or member)
  const [isAdmin, setIsAdmin] = useState(false);
  const [me, setMe] = useState(null);
  const [rolesConfig, setRolesConfig] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);

  const loadEvents = async () => {
    try {
      setEventsLoading(true);
      const res = await fetchEvents();
      const list = res.events || [];
      setEvents(list);
      // fetch roles config to compute managed events
      try {
        const rc = await getRoles();
        setRolesConfig(rc || {});
      } catch (err) {
        console.warn("Failed to load roles config:", err);
        setRolesConfig(null);
      }
    } catch (err) {
      console.error("Failed to load events:", err);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const verify = async () => {
      try {
        const res = await checkLogin();
        if (!mounted) return;
        if (!res.authenticated) {
          setAuthorizedCreate(false);
          setIsAdmin(false);
          setMe(null);
        } else {
          const user = res.user || {};
          setMe(user);
          const role = user.role;
          setIsAdmin(role === "admin");
          // members and admins can create events
          setAuthorizedCreate(role === "admin" || role === "member");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setAuthorizedCreate(false);
        setIsAdmin(false);
        setMe(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    verify();
    // also load events for admin manage list
    loadEvents();
    return () => (mounted = false);
  }, []);

  if (loading)
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <p className="text-neutral-400 text-sm">Checking permissions...</p>
      </div>
    );

  if (!authorizedCreate)
    return (
      <div className="min-h-screen bg-neutral-950 text-white px-4 sm:px-6 lg:px-8 py-10 flex items-center justify-center">
        <div className="max-w-xl sm:max-w-2xl mx-auto text-center rounded-2xl border border-neutral-800 bg-neutral-900/80 px-6 py-8 backdrop-blur">
          <h2 className="text-2xl font-semibold mb-3 bg-gradient-to-r from-red-400 to-orange-300 bg-clip-text text-transparent">
            Access Restricted
          </h2>
          <p className="text-neutral-400 text-sm">
            You must be a{" "}
            <span className="font-medium text-neutral-200">member</span> or
            <span className="font-medium text-neutral-200"> admin</span> to
            create and manage events.
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-1">
              Event Manager
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Create New Event
            </h1>
            <p className="text-sm sm:text-base text-neutral-400 mt-1">
              Add event details, upload an image, and manage your upcoming
              sessions.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            {me && (
              <p className="text-xs text-neutral-500">
                Signed in as{" "}
                <span className="text-neutral-200">{me.name || me.email}</span>
                {me.role && (
                  <span className="ml-1 rounded-full border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
                    {me.role}
                  </span>
                )}
              </p>
            )}
            <button
              type="button"
              onClick={() => navigate("/events/dashboard")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900/70 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          <div className="order-1 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 sm:p-6 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Event Details
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Basic information, schedule, and visibility.
                </p>
              </div>
            </div>
            <EventForm
              mode="create"
              currentUser={me}
              onSuccess={() => loadEvents()}
            />
          </div>

          <div className="order-2 lg:order-none lg:max-h-[70vh] lg:overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 sm:p-6 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Your Events
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Quickly review and manage existing events.
                </p>
              </div>
              {eventsLoading && (
                <span className="text-[10px] text-neutral-500">
                  Refreshing…
                </span>
              )}
            </div>
            {/* Show manage list only to admins or event-managers (events they manage) */}
            {isAdmin ? (
              <EventsAdminList
                events={events}
                editingId={editingEvent?._id}
                onEdit={(ev) => setEditingEvent(ev)}
                currentUser={me}
                onEditDone={async () => {
                  await loadEvents();
                  setEditingEvent(null);
                }}
                onCancelEdit={() => setEditingEvent(null)}
                onDelete={async (ev) => {
                  if (
                    !confirm(
                      `Delete event "${ev.title}"? This cannot be undone.`,
                    )
                  )
                    return;
                  try {
                    await deleteEvent(ev._id);
                    // refresh list and clear editor if deleting the edited event
                    await loadEvents();
                    if (editingEvent && editingEvent._id === ev._id)
                      setEditingEvent(null);
                  } catch (err) {
                    console.error("Failed to delete event:", err);
                    alert(err.message || "Delete failed");
                  }
                }}
              />
            ) : (
              // for non-admins, show only events they manage (based on managerEmail or rolesConfig)
              (() => {
                const userEmail =
                  me && me.email ? String(me.email).toLowerCase().trim() : null;
                const mgrEvents = events.filter((ev) => {
                  if (!userEmail) return false;
                  if (
                    ev.managerEmail &&
                    String(ev.managerEmail).toLowerCase().trim() === userEmail
                  )
                    return true;
                  if (rolesConfig && rolesConfig.eventManagersByEvent) {
                    const em = rolesConfig.eventManagersByEvent;
                    // eventManagersByEvent might be an object keyed by id or title
                    const list = em[ev._id] || em[ev.id] || em[ev.title] || [];
                    if (
                      Array.isArray(list) &&
                      list
                        .map((s) => String(s).toLowerCase())
                        .includes(userEmail)
                    )
                      return true;
                  }
                  return false;
                });

                if (mgrEvents.length === 0) return null;

                return (
                  <EventsAdminList
                    events={mgrEvents}
                    editingId={editingEvent?._id}
                    onEdit={(ev) => setEditingEvent(ev)}
                    currentUser={me}
                    onEditDone={async () => {
                      await loadEvents();
                      setEditingEvent(null);
                    }}
                    onCancelEdit={() => setEditingEvent(null)}
                    onDelete={async (ev) => {
                      if (
                        !confirm(
                          `Delete event "${ev.title}"? This cannot be undone.`,
                        )
                      )
                        return;
                      try {
                        await deleteEvent(ev._id);
                        await loadEvents();
                        if (editingEvent && editingEvent._id === ev._id)
                          setEditingEvent(null);
                      } catch (err) {
                        console.error("Failed to delete event:", err);
                        alert(err.message || "Delete failed");
                      }
                    }}
                  />
                );
              })()
            )}
          </div>
        </div>

        {/* editing form is rendered inline inside the EventsAdminList now */}
      </div>
    </div>
  );
}
