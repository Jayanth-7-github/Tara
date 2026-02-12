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

  if (loading) return <div className="p-6">Checking permissions...</div>;
  if (!authorizedCreate)
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="max-w-xl sm:max-w-2xl mx-auto text-center">
          <h2 className="text-xl font-semibold mb-4">Unauthorized</h2>
          <p className="text-gray-400">
            You must be a member or admin to create events.
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Create Event</h1>
          <p className="text-sm sm:text-base text-gray-400">
            Add event details and upload an image (optional).
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
          <div className="order-1">
            <EventForm mode="create" onSuccess={() => loadEvents()} />
          </div>

          <div className="order-2 lg:order-none lg:max-h-[70vh] lg:overflow-y-auto">
            {/* Show manage list only to admins or event-managers (events they manage) */}
            {isAdmin ? (
              <EventsAdminList
                events={events}
                editingId={editingEvent?._id}
                onEdit={(ev) => setEditingEvent(ev)}
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
