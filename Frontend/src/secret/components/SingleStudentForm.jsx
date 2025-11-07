import React, { useState } from "react";
import { createStudent } from "../../services/api";

export default function SingleStudentForm({ onCreated }) {
  const [visible, setVisible] = useState(false);
  const [regno, setRegno] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function handleCreate(e) {
    e && e.preventDefault();
    setError(null);
    setMessage(null);
    if (!regno.trim() || !name.trim()) {
      setError("regno and name are required");
      return;
    }
    setLoading(true);
    try {
      const body = {
        regno: regno.trim(),
        name: name.trim(),
      };
      if (department.trim()) body.department = department.trim();
      if (year.trim()) body.year = year.trim();
      if (phone.trim()) body.phone = phone.trim();

      const res = await createStudent(body);
      setMessage("Student created");
      setRegno("");
      setName("");
      setDepartment("");
      setYear("");
      setPhone("");
      if (onCreated) onCreated(res);
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
