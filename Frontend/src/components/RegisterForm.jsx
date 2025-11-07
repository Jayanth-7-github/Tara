import React, { useState } from "react";
import { registerForEvent } from "../services/api";

export default function RegisterForm({ eventId, onRegistered }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [regno, setRegno] = useState("");
  const [branch, setBranch] = useState("");
  const [college, setCollege] = useState("");
  const [year, setYear] = useState("");
  const [yearOther, setYearOther] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const errs = {};
    if (!name || name.trim().length < 2)
      errs.name = "Please enter your full name.";
    if (!regno || regno.trim().length < 3)
      errs.regno = "Please enter a valid registration number.";
    if (!email) errs.email = "Please enter an email address.";
    // year may be 'Other' so check accordingly
    if (!year) errs.year = "Please select your year.";
    if (year === "Other" && !yearOther)
      errs.yearOther = "Please specify your year.";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const yearValue = year === "Other" ? yearOther.trim() : year;
      await registerForEvent(eventId, {
        name: name.trim(),
        email: email.trim(),
        regno: regno.trim(),
        branch: branch.trim(),
        college: college.trim(),
        year: yearValue,
      });
      setSuccess(true);
      setLoading(false);
      if (onRegistered) onRegistered();
    } catch (err) {
      setLoading(false);
      setError(err.message || "Failed to register. Please try again later.");
    }
  };

  if (success) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 bg-green-900/30 border border-green-700 rounded px-3 py-2 text-green-200"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-green-300"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 00-1.414-1.414L8 11.172 4.707 7.879a1 1 0 00-1.414 1.415l4 4a1 1 0 001.414 0l8-8z"
            clipRule="evenodd"
          />
        </svg>
        <div className="text-sm">
          Registration successful — you're on the attendees list.
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md bg-gray-900/60 p-4 rounded-lg shadow-md"
      aria-label="Register for event"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Full name</label>
          <input
            type="text"
            placeholder="e.g. A. Student"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full px-3 py-2 rounded bg-gray-800 text-sm text-white border ${
              fieldErrors.name ? "border-red-500" : "border-gray-700"
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            aria-invalid={fieldErrors.name ? "true" : "false"}
            aria-describedby={fieldErrors.name ? "err-name" : undefined}
          />
          {fieldErrors.name && (
            <div id="err-name" className="text-xs text-red-400 mt-1">
              {fieldErrors.name}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">
            Registration no.
          </label>
          <input
            type="text"
            placeholder="e.g. 20BCS001"
            value={regno}
            onChange={(e) => setRegno(e.target.value)}
            className={`w-full px-3 py-2 rounded bg-gray-800 text-sm text-white border ${
              fieldErrors.regno ? "border-red-500" : "border-gray-700"
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            aria-invalid={fieldErrors.regno ? "true" : "false"}
            aria-describedby={fieldErrors.regno ? "err-regno" : undefined}
          />
          {fieldErrors.regno && (
            <div id="err-regno" className="text-xs text-red-400 mt-1">
              {fieldErrors.regno}
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="text-xs text-gray-400 block mb-1">Email</label>
          <input
            type="email"
            placeholder="you@college.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-3 py-2 rounded bg-gray-800 text-sm text-white border ${
              fieldErrors.email ? "border-red-500" : "border-gray-700"
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            aria-invalid={fieldErrors.email ? "true" : "false"}
            aria-describedby={fieldErrors.email ? "err-email" : undefined}
          />
          {fieldErrors.email && (
            <div id="err-email" className="text-xs text-red-400 mt-1">
              {fieldErrors.email}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Branch</label>
          <input
            type="text"
            placeholder="Computer Science"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 text-sm text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">College</label>
          <input
            type="text"
            placeholder="Your college name"
            value={college}
            onChange={(e) => setCollege(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 text-sm text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={`w-full px-3 py-2 rounded bg-gray-800 text-sm text-white border ${
              fieldErrors.year ? "border-red-500" : "border-gray-700"
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            aria-invalid={fieldErrors.year ? "true" : "false"}
            aria-describedby={fieldErrors.year ? "err-year" : undefined}
          >
            <option value="">Select year</option>
            <option value="1st">1st</option>
            <option value="2nd">2nd</option>
            <option value="3rd">3rd</option>
            <option value="4th">4th</option>
            <option value="Other">Other</option>
          </select>
          {fieldErrors.year && (
            <div id="err-year" className="text-xs text-red-400 mt-1">
              {fieldErrors.year}
            </div>
          )}
        </div>

        {year === "Other" && (
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400 block mb-1">
              Please specify
            </label>
            <input
              type="text"
              placeholder="e.g. postgraduate, diploma, other"
              value={yearOther}
              onChange={(e) => setYearOther(e.target.value)}
              className={`w-full px-3 py-2 rounded bg-gray-800 text-sm text-white border ${
                fieldErrors.yearOther ? "border-red-500" : "border-gray-700"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-invalid={fieldErrors.yearOther ? "true" : "false"}
              aria-describedby={
                fieldErrors.yearOther ? "err-year-other" : undefined
              }
            />
            {fieldErrors.yearOther && (
              <div id="err-year-other" className="text-xs text-red-400 mt-1">
                {fieldErrors.yearOther}
              </div>
            )}
          </div>
        )}
      </div>

      {error && <div className="text-xs text-red-400 mt-2">{error}</div>}

      <div className="flex items-center gap-3 mt-3">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 transition text-white disabled:opacity-60"
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <button
          type="button"
          onClick={() => {
            setName("");
            setEmail("");
            setRegno("");
            setBranch("");
            setCollege("");
            setYear("");
            setYearOther("");
            setError(null);
            setFieldErrors({});
          }}
          className="px-3 py-2 text-sm rounded bg-gray-800 hover:bg-gray-700 transition text-gray-200"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
