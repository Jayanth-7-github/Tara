import React, { useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../services/api";
import RegisterForm from "./RegisterForm";

export default function EventsList({
  events = [],
  loading = false,
  error = null,
}) {
  const apiBase = API_BASE.replace(/\/$/, "");
  const [showFormFor, setShowFormFor] = useState(null);
  const [registered, setRegistered] = useState({});

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
                  <div className="text-sm text-green-300">Registered ✓</div>
                ) : showFormFor === id ? (
                  <div className="w-full">
                    <RegisterForm
                      eventId={id}
                      onRegistered={() => {
                        setRegistered((s) => ({ ...s, [id]: true }));
                        setShowFormFor(null);
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setShowFormFor(id)}
                      className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 transition text-white"
                    >
                      Register
                    </button>
                    {/* <Link
                      to={`/events/${id}`}
                      className="text-xs text-gray-300 hover:text-white"
                    >
                      Details
                    </Link> */}
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
