import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AdminNavbar from "../components/AdminNavbar";
import SingleStudentForm from "../components/SingleStudentForm";
import { createStudentsBulk, fetchEvents } from "../../services/api";

// Secret page: paste JSON (single object or array) matching Student model:
// { regno: string, name: string, department?: string, year?: string, phone?: string }

export default function ManageAttendance() {
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
      if (!s.regno || typeof s.regno !== "string")
        errs.push(`Item ${idx}: missing or invalid 'regno'`);
      if (!s.name || typeof s.name !== "string")
        errs.push(`Item ${idx}: missing or invalid 'name'`);
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
        const res = await createStudentsBulk(data);
        setResult({ message: "Bulk upload successful", body: res });
      } else {
        const res = await createStudent(data);
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
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900 text-white font-sans py-10 px-5">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-4xl mx-auto bg-gray-800/60 backdrop-blur-xl border border-gray-700/70 shadow-2xl rounded-2xl p-8"
      >
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 text-center md:text-left">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-blue-400 tracking-wide">
              🔐 Manage Students (Secret)
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Paste a single student object or an array of student objects in
              JSON format, or upload a .json file. Required fields:{" "}
              <code>regno</code>, <code>name</code>.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <AdminNavbar />
          </div>
        </div>

        <div className="space-y-4">
          {/* Single-student creation form */}
          <div className="flex items-center gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Event</label>
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
            placeholder='Paste JSON here — e.g. { "regno": "R001", "name": "Alice" } or [ {...}, {...} ]'
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
      </motion.div>
    </div>
  );
}
