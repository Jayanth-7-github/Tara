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
        <div className="flex items-center justify-between w-full bg-gray-900/30 border border-gray-700 rounded-md p-2">
          <div className="text-sm text-gray-200">
            Create single student quickly
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVisible(true)}
              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              Add Student
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-blue-300">
              Create Single Student
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVisible(false)}
                className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm text-gray-200"
              >
                Hide
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>

          <form
            onSubmit={handleCreate}
            className="bg-gray-900/40 border border-gray-700 rounded-lg p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                value={regno}
                onChange={(e) => setRegno(e.target.value)}
                placeholder="RegNo (required)"
                className="col-span-1 p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (required)"
                className="col-span-2 p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm"
              />
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Department"
                className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm"
              />
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Year"
                className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone"
                className="p-2 rounded bg-gray-800 border border-gray-700 text-white text-sm"
              />
            </div>

            {error && <div className="text-red-300 text-sm">{error}</div>}
            {message && <div className="text-green-300 text-sm">{message}</div>}
          </form>
        </div>
      )}
    </div>
  );
}
