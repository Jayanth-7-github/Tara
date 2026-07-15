import React, { useState, useEffect } from "react";
import { createStudent, fetchEvents, registerForEvent } from "../../services/api";

export default function SingleStudentForm({
  onCreated,
  eventName: propEventName,
}) {
  const [visible, setVisible] = useState(false);
  const [regno, setRegno] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [eventName, setEventName] = useState(propEventName || "");
  const [eventId, setEventId] = useState("");
  const [events, setEvents] = useState([]);
  const [teamName, setTeamName] = useState("");
  const [extraMembers, setExtraMembers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchEvents();
        const items = res?.events || [];
        setEvents(items);
        if (!propEventName && items.length > 0) {
          setEventId(items[0]._id);
          setEventName(items[0].title || "");
        } else if (propEventName) {
          const matched = items.find(
            (it) => it.title === propEventName || it._id === propEventName,
          );
          if (matched) {
            setEventId(matched._id);
            setEventName(matched.title || "");
          }
        }
      } catch (err) {
        // ignore silently
      }
    })();
  }, [propEventName]);

  const selectedEvent = events.find((e) => e._id === eventId || e.title === eventName);
  const isTeamEvent = selectedEvent?.participationType === "team";
  const maxTeamSize = selectedEvent?.maxTeamSize || 4;
  const maxExtra = maxTeamSize - 1;

  async function handleCreate(e) {
    if (e) e.preventDefault(); // Fix for potential implicit submission
    setError(null);
    setMessage(null);
    if (!regno.trim() || !name.trim()) {
      setError("regno and name are required");
      return;
    }
    if (isTeamEvent && !teamName.trim()) {
      setError("Team name is required for team events");
      return;
    }
    setLoading(true);
    try {
      const body = {
        regno: regno.trim(),
        name: name.trim(),
        role: isTeamEvent ? "Leader" : "Member",
      };
      if (teamName.trim()) body.teamName = teamName.trim();
      if (department.trim()) body.department = department.trim();
      if (year.trim()) body.year = year.trim();
      if (phone.trim()) body.phone = phone.trim();
      // include selected event if available
      if (eventId) body.eventId = eventId;
      else if (eventName) body.eventName = eventName;

      const res = await createStudent(body);
      
      if (onCreated) {
        await onCreated(res);
      }

      if (isTeamEvent && extraMembers.length > 0) {
        for (let idx = 0; idx < extraMembers.length; idx++) {
          const member = extraMembers[idx];
          const mBody = {
            regno: member.regno.trim(),
            name: member.name.trim(),
            teamName: teamName.trim(),
            role: "Member",
          };
          if (member.email) mBody.email = member.email.trim();
          if (member.phone) mBody.phone = member.phone.trim();
          if (member.department) mBody.department = member.department.trim();
          if (member.year) mBody.year = member.year.trim();

          await createStudent(mBody);
          const targetEventId = eventId || selectedEvent?._id;
          if (targetEventId) {
            await registerForEvent(targetEventId, {
              regno: member.regno.trim(),
              name: member.name.trim(),
            });
          }
        }
      }

      setMessage("Student(s) created and registered successfully");
      setRegno("");
      setName("");
      setDepartment("");
      setYear("");
      setPhone("");
      setTeamName("");
      setExtraMembers([]);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!visible ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full bg-gray-900/30 border border-gray-700 rounded-md p-3">
          <div className="text-sm text-gray-200">
            Create single student quickly
            {eventName && (
              <div className="text-xs text-gray-400 mt-1">
                Event: {eventName}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVisible(true)}
              className="w-full sm:w-auto px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              Add Student
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h3 className="text-base font-semibold text-blue-300">
              Create Single Student
            </h3>
            {eventName && (
              <div className="text-sm text-gray-300">
                Event:{" "}
                <span className="font-medium text-white">{eventName}</span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setVisible(false)}
                className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm text-gray-200"
              >
                Hide
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>

          <form
            onSubmit={handleCreate}
            className="bg-gray-900/40 border border-gray-700 rounded-lg p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {isTeamEvent && (
                <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
                  <span className="text-xs font-semibold text-blue-300">Team Name *</span>
                  <input
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Required for team events"
                    className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm font-semibold"
                  />
                </label>
              )}
              {/** Event selector (optional) - show only if no propEventName provided */}
              {!propEventName && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">Event (optional)</span>
                  <select
                    value={eventId || ""}
                    onChange={(e) => {
                      const id = e.target.value;
                      setEventId(id);
                      const ev = id ? events.find((it) => it._id === id) : null;
                      setEventName(ev ? ev.title : propEventName || "");
                    }}
                    className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm"
                  >
                    <option value="">(none)</option>
                    {events.map((ev) => (
                      <option key={ev._id} value={ev._id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-400">RegNo</span>
                <input
                  value={regno}
                  onChange={(e) => setRegno(e.target.value)}
                  placeholder="Required"
                  className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 lg:col-span-2">
                <span className="text-xs text-gray-400">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Required"
                  className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-400">Department</span>
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-400">Year</span>
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-400">Phone</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm"
                />
              </label>
            </div>

            {isTeamEvent && (
              <div className="space-y-3 pt-3 border-t border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-blue-300">
                    Team Members ({extraMembers.length + 1} / {maxTeamSize})
                  </span>
                  {extraMembers.length < maxExtra && (
                    <button
                      type="button"
                      onClick={() =>
                        setExtraMembers([
                          ...extraMembers,
                          { regno: "", name: "", email: "", phone: "", department: "", year: "" },
                        ])
                      }
                      className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                    >
                      + Add Member
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {extraMembers.map((member, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-950 border border-gray-700 rounded-lg space-y-3 relative"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-400">
                          Member #{index + 2}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setExtraMembers(
                              extraMembers.filter((_, idx) => idx !== index)
                            )
                          }
                          className="text-xs text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs text-gray-400">RegNo *</span>
                          <input
                            required
                            value={member.regno}
                            onChange={(e) => {
                              const newM = [...extraMembers];
                              newM[index].regno = e.target.value;
                              setExtraMembers(newM);
                            }}
                            className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-xs"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs text-gray-400">Name *</span>
                          <input
                            required
                            value={member.name}
                            onChange={(e) => {
                              const newM = [...extraMembers];
                              newM[index].name = e.target.value;
                              setExtraMembers(newM);
                            }}
                            className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-xs"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs text-gray-400">Email</span>
                          <input
                            type="email"
                            value={member.email}
                            onChange={(e) => {
                              const newM = [...extraMembers];
                              newM[index].email = e.target.value;
                              setExtraMembers(newM);
                            }}
                            className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-xs"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs text-gray-400">Phone</span>
                          <input
                            value={member.phone}
                            onChange={(e) => {
                              const newM = [...extraMembers];
                              newM[index].phone = e.target.value;
                              setExtraMembers(newM);
                            }}
                            className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-xs"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs text-gray-400">Department</span>
                          <input
                            value={member.department}
                            onChange={(e) => {
                              const newM = [...extraMembers];
                              newM[index].department = e.target.value;
                              setExtraMembers(newM);
                            }}
                            className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-xs"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs text-gray-400">Year</span>
                          <input
                            value={member.year}
                            onChange={(e) => {
                              const newM = [...extraMembers];
                              newM[index].year = e.target.value;
                              setExtraMembers(newM);
                            }}
                            className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-xs"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              {error && <div className="text-red-300 text-sm">{error}</div>}
              {message && (
                <div className="text-green-300 text-sm">{message}</div>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
