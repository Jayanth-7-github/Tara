import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AdminNavbar from "../components/AdminNavbar";
import SingleStudentForm from "../components/SingleStudentForm";
import {
  createStudent,
  createStudentsBulk,
  fetchEvents,
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

export default function ManageAttendance() {
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("adminUnlocked") !== "1") {
      navigate(`/admin/secret/${ADMIN_TOKEN}`);
    }
  }, [navigate]);

  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");

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
            Manage Students
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
          <div className="space-y-4">
            {/* Single-student creation form */}
            <div className="flex items-center gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Event
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded"
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

            <SingleStudentForm
              eventName={events.find((it) => it._id === selectedEventId)?.title}
              onCreated={(res) =>
                setResult({ message: "Student created", body: res })
              }
            />

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
        </div>
      </motion.div>
    </div>
  );
}
