import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventForm from "../components/EventForm";
import { checkLogin } from "../services/auth";
import { API_BASE, deleteEvent, fetchEvents, getRoles } from "../services/api";

function getEventId(event) {
  return event?._id || event?.id || event?.title || null;
}

function formatEventDate(value) {
  if (!value) return "Date not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date not set";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatEventTime(value) {
  if (!value) return "Time not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Time not set";
  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPriceLabel(event) {
  const rawPrice =
    event?.price !== undefined && event?.price !== null
      ? event.price
      : event?.fee;

  if (rawPrice === undefined || rawPrice === null || rawPrice === "") {
    return "Free";
  }

  if (typeof rawPrice === "string" && rawPrice.toLowerCase() === "free") {
    return "Free";
  }

  const numericPrice = Number(rawPrice);
  if (Number.isNaN(numericPrice) || numericPrice <= 0) {
    return "Free";
  }

  return `Rs. ${numericPrice}`;
}

function getEventImageSrc(event) {
  const eventId = getEventId(event);
  if (!eventId) return event?.imageUrl || null;

  const cacheBustSource = event?.updatedAt || event?.createdAt;
  const cacheBust = cacheBustSource
    ? `?v=${new Date(cacheBustSource).getTime()}`
    : "";

  return (
    event?.imageUrl ||
    `${API_BASE.replace(/\/$/, "")}/events/${encodeURIComponent(eventId)}/image${cacheBust}`
  );
}

function EventModal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950 shadow-[0_24px_90px_rgba(0,0,0,0.75)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-900/80 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-400/80">
              Event Manager
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            <svg
              className="h-5 w-5"
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
        <div className="scrollbar-hidden max-h-[85vh] overflow-y-auto px-3 py-3 sm:px-6 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function CreateEvent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorizedCreate, setAuthorizedCreate] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [me, setMe] = useState(null);
  const [rolesConfig, setRolesConfig] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [imageError, setImageError] = useState({});
  const [modalState, setModalState] = useState(null);

  const closeModal = () => setModalState(null);

  const loadEvents = async () => {
    try {
      setEventsLoading(true);
      const res = await fetchEvents();
      const list = res.events || [];
      setEvents(list);
      setImageError({});
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
          return;
        }

        const user = res.user || {};
        const role = user.role;
        setMe(user);
        setIsAdmin(role === "admin");
        setAuthorizedCreate(role === "admin" || role === "member");
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
    loadEvents();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!modalState) return undefined;

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalState]);

  const userEmail = me?.email ? String(me.email).toLowerCase().trim() : null;

  const managedEvents = (
    isAdmin
      ? events
      : events.filter((event) => {
          if (!userEmail) return false;

          if (
            event.managerEmail &&
            String(event.managerEmail).toLowerCase().trim() === userEmail
          ) {
            return true;
          }

          if (!rolesConfig?.eventManagersByEvent) {
            return false;
          }

          const managersByEvent = rolesConfig.eventManagersByEvent;
          const list =
            managersByEvent[event._id] ||
            managersByEvent[event.id] ||
            managersByEvent[event.title] ||
            [];

          return (
            Array.isArray(list) &&
            list
              .map((entry) => String(entry).toLowerCase().trim())
              .includes(userEmail)
          );
        })
  )
    .slice()
    .sort((left, right) => {
      const leftTime = new Date(left?.date || 0).getTime();
      const rightTime = new Date(right?.date || 0).getTime();

      if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
      if (Number.isNaN(leftTime)) return 1;
      if (Number.isNaN(rightTime)) return -1;
      return leftTime - rightTime;
    });

  const handleDelete = async (event) => {
    const eventId = getEventId(event);
    if (!eventId) {
      alert("Unable to delete this event because its id is missing.");
      return;
    }

    if (
      !window.confirm(`Delete event "${event.title}"? This cannot be undone.`)
    ) {
      return;
    }

    try {
      await deleteEvent(eventId);
      await loadEvents();

      if (
        modalState?.mode === "edit" &&
        getEventId(modalState.event) === eventId
      ) {
        closeModal();
      }
    } catch (err) {
      console.error("Failed to delete event:", err);
      alert(err.message || "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
        <p className="text-sm text-neutral-400">Checking permissions...</p>
      </div>
    );
  }

  if (!authorizedCreate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-900/80 px-6 py-8 text-center backdrop-blur">
          <h2 className="mb-3 bg-gradient-to-r from-red-400 to-orange-300 bg-clip-text text-2xl font-semibold text-transparent">
            Access Restricted
          </h2>
          <p className="text-sm text-neutral-400">
            You must be a{" "}
            <span className="font-medium text-neutral-200">member</span>
            or <span className="font-medium text-neutral-200">admin</span> to
            create and manage events.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#020617_55%,_#0f172a_100%)] px-4 py-8 text-white sm:px-6 lg:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[32px] border border-slate-800 bg-slate-950/80 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.5)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-400/80">
                Event Manager
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Manage Events Like a Gallery
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
                Browse all the events you can manage as image cards, then open
                the same popup flow for creating or editing details without
                leaving this page.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              {me && (
                <p className="text-xs text-slate-500">
                  Signed in as{" "}
                  <span className="text-slate-200">{me.name || me.email}</span>
                  {me.role && (
                    <span className="ml-2 rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                      {me.role}
                    </span>
                  )}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setModalState({ mode: "create", event: null })}
                  className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Create Event
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/events/dashboard")}
                  className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </header>

        {eventsLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[30px] border border-slate-800 bg-slate-950/90 shadow-[0_18px_40px_rgba(0,0,0,0.7)]"
              >
                <div className="h-52 animate-pulse bg-slate-900" />
                <div className="space-y-3 p-5">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                  <div className="h-6 w-3/4 animate-pulse rounded bg-slate-800" />
                  <div className="h-16 animate-pulse rounded bg-slate-900" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-12 animate-pulse rounded-2xl bg-slate-900" />
                    <div className="h-12 animate-pulse rounded-2xl bg-slate-900" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : managedEvents.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-slate-700 bg-slate-950/70 px-6 py-14 text-center backdrop-blur">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-cyan-300">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-white">
              No events to show yet
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
              {isAdmin
                ? "No events are available right now. Create the first one from the popup above."
                : "There are no events currently assigned to your account. You can still create a new one from the popup above."}
            </p>
            <button
              type="button"
              onClick={() => setModalState({ mode: "create", event: null })}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Create Event
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {managedEvents.map((event) => {
              const eventId = getEventId(event);
              const imageSrc = getEventImageSrc(event);

              return (
                <article
                  key={eventId}
                  className="group overflow-hidden rounded-[30px] border border-slate-800 bg-slate-950/90 shadow-[0_18px_40px_rgba(0,0,0,0.7)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-cyan-500/40"
                >
                  <div className="relative h-56 w-full overflow-hidden bg-black">
                    {imageSrc && !imageError[eventId] ? (
                      <img
                        src={imageSrc}
                        alt={event.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        onError={() =>
                          setImageError((current) => ({
                            ...current,
                            [eventId]: true,
                          }))
                        }
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_30%),linear-gradient(180deg,_#0f172a_0%,_#020617_100%)] px-6 text-center">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">
                            Event Image
                          </p>
                          <p className="mt-2 text-sm text-slate-400">
                            Add an image in edit mode to make this card stand
                            out.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent px-5 pb-4 pt-10">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/80">
                            {formatEventDate(event.date)}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-200">
                            {formatEventTime(event.date)}
                          </p>
                        </div>
                        <span className="rounded-full border border-cyan-500/30 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-100">
                          {getPriceLabel(event)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 bg-slate-950/95 px-5 pb-5 pt-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                          Manage Event
                        </p>
                        <h2 className="mt-2 text-xl font-semibold tracking-wide text-slate-50">
                          {event.title || "Untitled Event"}
                        </h2>
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-300">
                      {event.description || "No description added yet."}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-400">
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                        <p className="uppercase tracking-[0.2em] text-slate-500">
                          Venue
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-200">
                          {event.venue || event.location || "Venue not set"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                        <p className="uppercase tracking-[0.2em] text-slate-500">
                          Manager
                        </p>
                        <p className="mt-2 line-clamp-2 break-all text-sm text-slate-200">
                          {event.managerEmail || "No manager email"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setModalState({ mode: "edit", event })}
                        className="inline-flex flex-1 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:border-amber-400 hover:bg-amber-500/20"
                      >
                        Edit Event
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(event)}
                        className="inline-flex flex-1 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:border-red-400 hover:bg-red-500/20"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {modalState?.mode === "create" && (
        <EventModal
          title="Create New Event"
          subtitle="Add event details, upload an image, and publish from this popup."
          onClose={closeModal}
        >
          <EventForm
            mode="create"
            currentUser={me}
            onSuccess={async () => {
              await loadEvents();
              closeModal();
            }}
          />
        </EventModal>
      )}

      {modalState?.mode === "edit" && modalState.event && (
        <EventModal
          title={`Edit ${modalState.event.title || "Event"}`}
          subtitle="Update the event details in the same popup flow used for creating new events."
          onClose={closeModal}
        >
          <EventForm
            mode="edit"
            eventId={getEventId(modalState.event)}
            initialData={modalState.event}
            currentUser={me}
            onSuccess={async () => {
              await loadEvents();
              closeModal();
            }}
          />
        </EventModal>
      )}
    </div>
  );
}
