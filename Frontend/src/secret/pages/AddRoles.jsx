import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, fetchEvents, upsertRoles } from "../../services/api";
import { getMe } from "../../services/auth";

export default function AddRoles() {
  const [me, setMe] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [admins, setAdmins] = useState("");
  const [students, setStudents] = useState("");
  const [members, setMembers] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const profile = await getMe();
        const u = profile?.user || profile;
        setMe(u || null);
        if (!u || u.role !== "admin") {
          // not an admin
          return;
        }
        const evs = await fetchEvents();
        // fetchEvents may return either an array or an object { events: [...] }
        let list = [];
        if (Array.isArray(evs)) list = evs;
        else if (evs && Array.isArray(evs.events)) list = evs.events;
        setEvents(list || []);
        if ((list || []).length) setEventId(list[0]._id || list[0].id || "");
      } catch (err) {
        // user not logged in or other error
      }
    })();
  }, []);

  if (!me || me.role !== "admin") {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-6">
          <h3 className="text-lg font-semibold text-gray-100">Access denied</h3>
          <p className="text-sm text-gray-300">
            You must be an admin to access this page.
          </p>
          <div className="mt-4">
            <button
              onClick={() => navigate("/login")}
              className="px-3 py-1 rounded bg-blue-600 text-white"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    // Require either an event selected (for student updates) or admins/members provided
    if (!eventId && !admins.trim() && !members.trim()) {
      setMessage({
        type: "error",
        text: "Please select an event or provide global admins",
      });
      return;
    }
    setLoading(true);
    try {
      const selected = events.find((ev) => (ev._id || ev.id) === eventId) || {};

      // Track whether we sent anything
      let didUpdate = false;

      // If admins provided, update global admins
      if (admins && String(admins).trim()) {
        await upsertRoles({ admins });
        didUpdate = true;
      }

      // If members provided, update global members
      if (members && String(members).trim()) {
        await upsertRoles({ members });
        didUpdate = true;
      }

      // If students provided, update per-event students (keyed by event title)
      if (students && String(students).trim()) {
        if (!eventId) throw new Error("Please select an event to add students");
        // Prefer eventId when updating per-event lists so keys are stable
        const payload = {
          eventId: selected._id || selected.id || eventId,
          students,
        };
        await upsertRoles(payload);
        didUpdate = true;
      }

      if (!didUpdate) throw new Error("No admins or students provided");

      setMessage({ type: "success", text: "Roles updated" });
      // optionally clear inputs
      setAdmins("");
      setStudents("");
      setMembers("");
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to update roles",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl px-6 pb-6 mb-6">
          <h1 className="text-3xl font-extrabold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent mb-2">
            Assign Roles
          </h1>
          <p className="text-sm text-gray-400">
            Configure system admins, event members, and event-specific students.
            Admins have global access across all events.
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 block mb-1">Event</label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full bg-gray-900 text-white border border-gray-700 rounded px-3 py-2"
              >
                {events.map((ev) => (
                  <option key={ev._id || ev.id} value={ev._id || ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-300 block mb-1">
                Global Admins (regnos)
              </label>
              <textarea
                value={admins}
                onChange={(e) => setAdmins(e.target.value)}
                placeholder="e.g. 9924000111, 9924000222"
                className="w-full bg-gray-900 text-white border border-gray-700 rounded px-3 py-2 h-20"
              />
            </div>

            <div>
              <label className="text-sm text-gray-300 block mb-1">
                Members (regnos)
              </label>
              <textarea
                value={members}
                onChange={(e) => setMembers(e.target.value)}
                placeholder="e.g. 9924000555, 9924000666"
                className="w-full bg-gray-900 text-white border border-gray-700 rounded px-3 py-2 h-20"
              />
            </div>

            <div>
              <label className="text-sm text-gray-300 block mb-1">
                Students (regnos)
              </label>
              <textarea
                value={students}
                onChange={(e) => setStudents(e.target.value)}
                placeholder="e.g. 9924000333 9924000444"
                className="w-full bg-gray-900 text-white border border-gray-700 rounded px-3 py-2 h-28"
              />
            </div>

            {message && (
              <div
                className={`p-3 rounded ${
                  message.type === "error"
                    ? "bg-red-700 text-white"
                    : "bg-emerald-700 text-white"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setAdmins("");
                  setStudents("");
                  setMembers("");
                }}
                className="px-4 py-2 rounded bg-gray-700 text-white"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded bg-blue-600 text-white"
              >
                {loading ? "Saving..." : "Save Roles"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
