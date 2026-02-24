import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  API_BASE,
  fetchEvents,
  upsertRoles,
  fetchStudent,
} from "../../services/api";
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
  const [previewAdmins, setPreviewAdmins] = useState(null);
  const [previewMembers, setPreviewMembers] = useState(null);
  const [previewStudents, setPreviewStudents] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const profile = await getMe();
        const u = profile?.user || profile;
        if (!u) {
          // not logged in — require login
          navigate("/login");
          return;
        }
        setMe(u || null);
        if (u.role !== "admin") {
          // not an admin
          setCheckingAuth(false);
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
        navigate("/login");
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, [navigate]);

  // Handle form submission: upsert admins/members/students
  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const selected = events.find((ev) => (ev._id || ev.id) === eventId) || {};

      let didUpdate = false;

      const parseRegnos = (txt) =>
        String(txt || "")
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean);

      const fetchDetailsFor = async (regnoList) => {
        const results = [];
        for (const r of regnoList) {
          try {
            const stu = await fetchStudent(r);
            if (stu) results.push(stu);
          } catch (err) {
            results.push({ regno: r, _error: err?.message || String(err) });
          }
        }
        return results;
      };

      if (admins && String(admins).trim()) {
        const adminRegnos = parseRegnos(admins);
        const adminDetails = await fetchDetailsFor(adminRegnos);
        await upsertRoles({ admins: adminDetails });
        didUpdate = true;
      }

      if (members && String(members).trim()) {
        const memberRegnos = parseRegnos(members);
        const memberDetails = await fetchDetailsFor(memberRegnos);
        await upsertRoles({ members: memberDetails });
        didUpdate = true;
      }

      if (students && String(students).trim()) {
        if (!eventId) throw new Error("Please select an event to add students");
        const studentRegnos = parseRegnos(students);
        const studentDetails = await fetchDetailsFor(studentRegnos);
        const payload = {
          eventId: selected._id || selected.id || eventId,
          students: studentDetails,
        };
        await upsertRoles(payload);
        didUpdate = true;
      }

      if (!didUpdate) throw new Error("No admins or students provided");

      setMessage({ type: "success", text: "Roles updated" });
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

  // Preview fetched student details without saving
  async function handlePreview() {
    setMessage(null);
    setPreviewAdmins(null);
    setPreviewMembers(null);
    setPreviewStudents(null);
    setLoading(true);
    try {
      const parseRegnos = (txt) =>
        String(txt || "")
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean);

      const fetchDetailsFor = async (regnoList) => {
        const results = [];
        for (const r of regnoList) {
          try {
            const stu = await fetchStudent(r);
            if (stu) results.push(stu);
          } catch (err) {
            results.push({ regno: r, _error: err?.message || String(err) });
          }
        }
        return results;
      };

      if (admins && String(admins).trim()) {
        const adminRegnos = parseRegnos(admins);
        const adminDetails = await fetchDetailsFor(adminRegnos);
        setPreviewAdmins(adminDetails);
      }

      if (members && String(members).trim()) {
        const memberRegnos = parseRegnos(members);
        const memberDetails = await fetchDetailsFor(memberRegnos);
        setPreviewMembers(memberDetails);
      }

      if (students && String(students).trim()) {
        const studentRegnos = parseRegnos(students);
        const studentDetails = await fetchDetailsFor(studentRegnos);
        setPreviewStudents(studentDetails);
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Preview failed" });
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return null;
  }

  if (!checkingAuth && !me) {
    return null;
  }

  if (me && me.role !== "admin") {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-6">
          <h3 className="text-lg font-semibold text-gray-100">Access denied</h3>
          <p className="text-sm text-gray-300">
            You are not authorized to view this page.
          </p>
        </div>
      </div>
    );
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
                className={`p-3 rounded ${message.type === "error"
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
