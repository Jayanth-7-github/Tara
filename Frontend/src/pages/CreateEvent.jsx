import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventForm from "../components/EventForm";
import EventsAdminList from "../components/EventsAdminList";
import { checkLogin } from "../services/auth";
import { fetchEvents, deleteEvent } from "../services/api";

export default function CreateEvent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);

  const loadEvents = async () => {
    try {
      setEventsLoading(true);
      const res = await fetchEvents();
      setEvents(res.events || []);
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
          setAuthorized(false);
        } else {
          const role = res.user?.role;
          setAuthorized(role === "admin");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setAuthorized(false);
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
  if (!authorized)
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white px-6 py-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl font-semibold mb-4">Unauthorized</h2>
          <p className="text-gray-400">
            You must be an admin to create or update events.
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Create Event</h1>
          <p className="text-sm text-gray-400">
            Add event details and upload an image (optional).
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <EventForm mode="create" onSuccess={() => loadEvents()} />
          </div>

          <div>
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
                  !confirm(`Delete event "${ev.title}"? This cannot be undone.`)
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
          </div>
        </div>

        {/* editing form is rendered inline inside the EventsAdminList now */}
      </div>
    </div>
  );
}
