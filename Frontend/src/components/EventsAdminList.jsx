import React from "react";
import EventForm from "./EventForm";

export default function EventsAdminList({
  events = [],
  onEdit = () => {},
  onDelete = () => {},
  editingId = null,
  onEditDone = () => {},
  onCancelEdit = () => {},
}) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
      <h3 className="text-lg font-semibold mb-3">Manage Events</h3>
      {events.length === 0 ? (
        <div className="text-gray-400">No events found.</div>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => (
            <li
              key={ev._id}
              className="bg-gray-800/40 border border-gray-800 rounded p-3"
            >
              {editingId === ev._id ? (
                <div>
                  <EventForm
                    mode="edit"
                    eventId={ev._id}
                    initialData={ev}
                    onSuccess={onEditDone}
                  />
                  <div className="mt-2">
                    <button
                      onClick={() => onCancelEdit()}
                      className="w-full sm:w-auto px-3 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="font-medium">{ev.title}</div>
                    <div className="text-xs text-gray-400">
                      {ev.date ? new Date(ev.date).toLocaleString() : "No date"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(ev)}
                      className="px-3 py-1 text-sm rounded bg-yellow-600 hover:bg-yellow-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(ev)}
                      className="px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
