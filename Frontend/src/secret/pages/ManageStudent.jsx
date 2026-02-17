import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AdminNavbar from "../components/AdminNavbar";
import SingleStudentForm from "../components/SingleStudentForm";
import {
  createStudent,
  createStudentsBulk,
  fetchEvents,
  fetchStudent,
  updateStudent,
  checkAttendance
} from "../../services/api";
import { useNavigate } from "react-router-dom";
import { ADMIN_TOKEN } from "../../services/constants";

// Secret page: paste JSON (single object or array) matching Student model:
// Accepts either:
// - { regno: string, name: string, ... }
// - Innovate KARE participants JSON: { "Roll Number": number|string, "Name": string, ... }

function normalizeStudentInput(s) {
  const obj = s || {};
  const regnoRaw =
    obj.regno ?? obj.rollNumber ?? obj.rollno ?? obj["Roll Number"];
  const nameRaw = obj.name ?? obj["Name"];

  const regno = regnoRaw != null ? String(regnoRaw).trim() : "";
  const name = nameRaw != null ? String(nameRaw).trim() : "";

  const teamName = obj.teamName ?? obj["Team Name"];
  const role = obj.role ?? obj["Role"];
  const email = obj.email ?? obj["Email"];
  const branch = obj.branch ?? obj["Branch"] ?? obj.department;
  const hostelName = obj.hostelName ?? obj["Hostel Name"];
  const roomNo = obj.roomNo ?? obj["Room No"];

  const department = obj.department;
  const year = obj.year;
  const phone = obj.phone;

  const out = { regno, name };
  if (teamName != null) out.teamName = String(teamName).trim();
  if (role != null) out.role = String(role).trim();
  if (email != null) out.email = String(email).trim();
  if (branch != null) out.branch = String(branch).trim();
  if (hostelName != null) out.hostelName = String(hostelName).trim();
  if (roomNo != null) out.roomNo = String(roomNo).trim();

  if (department != null) out.department = String(department).trim();
  if (year != null) out.year = String(year).trim();
  if (phone != null) out.phone = String(phone).trim();

  return out;
}

export default function ManageStudent() {
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("adminUnlocked") !== "1") {
      navigate("/admin/secret");
    }
  }, [navigate]);

  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");

  // Edit Student State
  const [editRegno, setEditRegno] = useState("");
  const [editEventId, setEditEventId] = useState("");
  const [editData, setEditData] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState(null);
  const [editError, setEditError] = useState(null);


  useEffect(() => {
    (async () => {
      try {
        const res = await fetchEvents();
        const items = res?.events || [];
        setEvents(items);
        if (items.length > 0) setSelectedEventId(items[0]._id);
      } catch (err) {
        console.error("Failed to load events for manage attendance:", err);
      }
    })();
  }, []);

  function handleLoadFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result));
      setParsed(null);
      setResult(null);
      setErrors([]);
    };
    reader.readAsText(file);
  }

  function tryParse() {
    setErrors([]);
    setResult(null);
    if (!text.trim()) {
      setErrors(["No JSON provided"]);
      setParsed(null);
      return;
    }
    try {
      const j = JSON.parse(text);
      setParsed(j);
    } catch (err) {
      setParsed(null);
      setErrors([`Invalid JSON: ${err.message}`]);
    }
  }

  function validateShape(data) {
    const arr = Array.isArray(data) ? data : [data];
    const errs = [];
    arr.forEach((s, idx) => {
      if (typeof s !== "object" || s === null) {
        errs.push(`Item ${idx} is not an object`);
        return;
      }
      const normalized = normalizeStudentInput(s);
      if (!normalized.regno)
        errs.push(`Item ${idx}: missing or invalid 'regno'`);
      if (!normalized.name) errs.push(`Item ${idx}: missing or invalid 'name'`);
      // optional fields: department, year, phone - no strict checks
    });
    return errs;
  }

  // Auto-search effect with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (editRegno.trim()) {
        handleSearchStudent(editRegno.trim());
      } else {
        setEditData(null);
        setEditError(null);
        setEditMessage(null);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [editRegno]);

  async function handleSearchStudent(regnoVal) {
    setEditError(null);
    setEditMessage(null);

    const q = regnoVal || editRegno.trim();
    if (!q) return;

    setEditLoading(true);
    try {
      // 1. Fetch generic student data
      const student = await fetchStudent(q);
      if (!student) {
        setEditError("Student not found");
        setEditData(null);
      } else {
        // 2. If Event is selected, verify context
        if (editEventId) {
          const ev = events.find((e) => e._id === editEventId);
          if (ev) {
            // Check if student is registered for this event
            // We look at 'registrations' array on the student object
            const regs = student.registrations || [];
            const isRegistered = regs.some(
              (r) =>
                r.event === ev._id ||
                (r.eventName &&
                  r.eventName.toLowerCase() === ev.title.toLowerCase())
            );

            if (isRegistered) {
              setEditData(student);
            } else {
              setEditError(
                `Student is not registered for event "${ev.title}"`
              );
              setEditData(null);
            }
          } else {
            setEditData(student);
          }
        } else {
          setEditData(student);
        }
      }
    } catch (err) {
      setEditError(err.message || "Failed to fetch student");
      setEditData(null);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleUpdateStudent() {
    setEditError(null);
    setEditMessage(null);
    if (!editData || !editData.regno) return;

    setEditLoading(true);
    try {
      const body = {
        name: editData.name,
        email: editData.email,
        phone: editData.phone,
        department: editData.department,
        year: editData.year,
        // Add other fields if needed, but NOT attendance or protected fields
      };
      await updateStudent(editData.regno, body);
      setEditMessage("Student updated successfully");
    } catch (err) {
      setEditError(err.message || "Failed to update student");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleSubmit() {
    setErrors([]);
    setResult(null);
    let data = parsed;
    if (!data) {
      try {
        data = JSON.parse(text);
      } catch (err) {
        setErrors([`Invalid JSON: ${err.message}`]);
        return;
      }
    }

    const valErrors = validateShape(data);
    if (valErrors.length) {
      setErrors(valErrors);
      return;
    }

    setLoading(true);
    try {
      if (Array.isArray(data)) {
        const normalized = data.map(normalizeStudentInput);
        const res = await createStudentsBulk(normalized);
        setResult({ message: "Bulk upload successful", body: res });
      } else {
        const normalized = normalizeStudentInput(data);
        const res = await createStudent(normalized);
        setResult({ message: "Student created", body: res });
      }
      setText("");
      setParsed(null);
    } catch (err) {
      const msg = err?.message || String(err);
      setErrors([msg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white font-sans py-10 px-5">
      <AdminNavbar />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-4xl mx-auto bg-gray-800/50 backdrop-blur-xl border border-gray-700 shadow-2xl rounded-2xl overflow-hidden"
      >
        <div className="bg-gray-800/50 px-6 pb-6 border-b border-gray-700">
          <h1 className="text-3xl font-extrabold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent mb-2">
            Manage Student
          </h1>
          <p className="text-sm text-gray-400">
            Upload student data via JSON or create students individually.
            Required fields: <code className="text-cyan-400">regno</code> or{" "}
            <code className="text-cyan-400">Roll Number</code>,{" "}
            <code className="text-cyan-400">name</code> or{" "}
            <code className="text-cyan-400">Name</code>
          </p>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

            {/* LEFT COLUMN: Create & Bulk Operations */}
            <div className="xl:col-span-2 space-y-8">

              {/* EVENT SELECTION CONTEXT */}
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-blue-300">
                    Target Event
                  </h2>
                  <p className="text-xs text-gray-400">
                    Select the event for creating single students.
                  </p>
                </div>
                <div className="w-full sm:w-auto min-w-[200px]">
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 text-white text-sm px-3 py-2 rounded focus:border-blue-500 outline-none"
                  >
                    {events.length === 0 && <option value="">No events</option>}
                    {events.map((ev) => (
                      <option key={ev._id} value={ev._id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECTION 2: CREATE NEW STUDENT */}
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-blue-300 mb-4 border-b border-gray-700 pb-2">
                  Create New Student
                </h2>

                <SingleStudentForm
                  eventName={events.find((it) => it._id === selectedEventId)?.title}
                  onCreated={(res) =>
                    setResult({ message: "Student created", body: res })
                  }
                />
              </div>

              {/* SECTION 3: BULK UPLOAD */}
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-blue-300 mb-4 border-b border-gray-700 pb-2">
                  Bulk Upload (JSON)
                </h2>
                <div>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleLoadFile}
                    className="text-sm text-gray-300"
                  />
                </div>

                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setParsed(null);
                    setResult(null);
                    setErrors([]);
                  }}
                  placeholder='Paste JSON here — e.g. { "regno": "99220041707", "name": "Alice" } or { "Roll Number": 99220041707, "Name": "Alice" }'
                  rows={12}
                  className="w-full bg-gray-900/40 border border-gray-700 rounded-lg p-4 text-sm font-mono text-gray-100 placeholder-gray-500"
                />

                <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={tryParse}
                    disabled={loading}
                    className="w-full sm:w-auto px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
                  >
                    Parse
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white shadow transition"
                  >
                    {loading ? "Uploading..." : "Submit to Backend"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setText("");
                      setParsed(null);
                      setErrors([]);
                      setResult(null);
                    }}
                    className="w-full sm:w-auto px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {parsed && (
                <div className="mt-2 p-3 bg-gray-700 rounded border border-gray-600">
                  <strong className="text-gray-200">Parsed JSON preview:</strong>
                  <pre className="whitespace-pre-wrap mt-2 text-sm text-gray-100">
                    {JSON.stringify(parsed, null, 2)}
                  </pre>
                </div>
              )}

              {errors && errors.length > 0 && (
                <div className="mt-2 p-3 rounded bg-red-900/10 border border-red-700/30 text-red-200">
                  <strong>Error{errors.length > 1 ? "s" : ""}:</strong>
                  <ul className="mt-2 list-disc list-inside text-sm">
                    {errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result && (
                <div className="mt-2 p-3 rounded bg-green-900/10 border border-green-700/30 text-green-200">
                  <strong>{result.message}</strong>
                  <pre className="whitespace-pre-wrap mt-2 text-sm text-gray-100">
                    {JSON.stringify(result.body, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Edit Existing Student */}
            <div>
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 sticky top-8">
                <h2 className="text-xl font-semibold text-blue-300 mb-4 border-b border-gray-700 pb-2">
                  Edit Student Details
                </h2>

                <div className="flex flex-col gap-3 mb-4">
                  {/* Optional Event Context for Edit */}
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">Context Event (Optional)</span>
                    <select
                      value={editEventId}
                      onChange={(e) => setEditEventId(e.target.value)}
                      className="p-2 rounded bg-gray-900 border border-gray-700 text-white text-sm focus:border-blue-500 outline-none"
                    >
                      <option value="">(Generic / No Event)</option>
                      {events.map((ev) => (
                        <option key={ev._id} value={ev._id}>
                          {ev.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
                    value={editRegno}
                    onChange={(e) => setEditRegno(e.target.value)}
                    placeholder="Enter RegNo to search"
                    className="w-full p-2 rounded bg-gray-900/50 border border-gray-700 text-white focus:border-blue-500 outline-none"
                  />
                  {editLoading && (
                    <div className="text-xs text-blue-400">Searching...</div>
                  )}
                </div>

                {editMessage && <div className="p-3 mb-4 bg-green-900/20 text-green-300 border border-green-800 rounded">{editMessage}</div>}
                {editError && <div className="p-3 mb-4 bg-red-900/20 text-red-300 border border-red-800 rounded">{editError}</div>}

                {editData && (
                  <div className="space-y-4 animate-fade-in-up">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Name</label>
                        <input
                          value={editData.name || ""}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          className="w-full p-2 rounded bg-gray-900/50 border border-gray-700 text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Email</label>
                        <input
                          value={editData.email || ""}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                          className="w-full p-2 rounded bg-gray-900/50 border border-gray-700 text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Department</label>
                        <input
                          value={editData.department || ""}
                          onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                          className="w-full p-2 rounded bg-gray-900/50 border border-gray-700 text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Year</label>
                        <input
                          value={editData.year || ""}
                          onChange={(e) => setEditData({ ...editData, year: e.target.value })}
                          className="w-full p-2 rounded bg-gray-900/50 border border-gray-700 text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Team Name</label>
                        <input
                          value={editData.teamName || ""}
                          onChange={(e) => setEditData({ ...editData, teamName: e.target.value })}
                          className="w-full p-2 rounded bg-gray-900/50 border border-gray-700 text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Role</label>
                        <input
                          value={editData.role || ""}
                          onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                          className="w-full p-2 rounded bg-gray-900/50 border border-gray-700 text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Phone</label>
                        <input
                          value={editData.phone || ""}
                          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                          className="w-full p-2 rounded bg-gray-900/50 border border-gray-700 text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">RegNo (Read-only)</label>
                        <input
                          value={editData.regno || ""}
                          readOnly
                          className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-gray-400 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                      <button
                        onClick={() => {
                          setEditData(null);
                          setEditRegno("");
                          setEditMessage(null);
                          setEditError(null);
                        }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateStudent}
                        disabled={editLoading}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium shadow-lg shadow-green-900/20 transition-all"
                      >
                        {editLoading ? "Save" : "Save"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
