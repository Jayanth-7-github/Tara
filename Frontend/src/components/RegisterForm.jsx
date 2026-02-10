import React, { useState, useEffect } from "react";
import { registerForEvent, fetchStudent } from "../services/api";
import { getMe } from "../services/auth";

// Reusable registration form. When fullPage=true it renders a full-screen
// layout; otherwise it just renders the form card.
export default function RegisterForm({
  eventId,
  onRegistered,
  fullPage = false,
  onBack,
  eventTitle,
}) {
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
  const [myRegno, setMyRegno] = useState("");

  const handleBack = () => {
    if (onBack) onBack();
    else if (typeof window !== "undefined" && window.history)
      window.history.back();
  };

  // Pre-fill fields from logged-in user
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await getMe();
        const user = me?.user || me;
        if (mounted && user) {
          const r = user.regno;
          if (r) {
            const upper = String(r).trim().toUpperCase();
            setMyRegno(upper);
            setRegno(upper);

            // Fetch the full student profile for deeper auto-fill
            try {
              const profile = await fetchStudent(upper);
              if (mounted && profile) {
                if (profile.name) setName(profile.name);
                if (profile.email) setEmail(profile.email);
                if (profile.branch) setBranch(profile.branch);
                if (profile.college) setCollege(profile.college);
                if (profile.year) setYear(profile.year);
              }
            } catch (err) {
              // profile maybe doesn't exist yet, fallback to what's in 'user'
              if (user.name) setName(user.name);
              if (user.email) setEmail(user.email);
            }
          } else {
            if (user.name) setName(user.name);
            if (user.email) setEmail(user.email);
          }
        }
      } catch {
        // not logged in
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = "Full name is required.";
    if (!regno.trim()) errs.regno = "Registration number is required.";
    if (myRegno && regno.trim().toUpperCase() !== myRegno)
      errs.regno = "Registration number must match your account.";
    if (!email.trim()) errs.email = "Email is required.";
    if (!year) errs.year = "Please select your year.";
    if (year === "Other" && !yearOther.trim())
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
      await registerForEvent(eventId, {
        name: name.trim(),
        email: email.trim(),
        regno: regno.trim().toUpperCase(),
        branch: branch.trim(),
        college: college.trim(),
        year: year === "Other" ? yearOther.trim() : year,
      });
      setSuccess(true);
      if (onRegistered) onRegistered();
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setName("");
    // keep regno as-is (especially when prefilled from login)
    setEmail("");
    setBranch("");
    setCollege("");
    setYear("");
    setYearOther("");
    setError(null);
    setFieldErrors({});
  };

  const form = (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl bg-gray-900/80 border border-gray-800 p-6 rounded-2xl shadow-xl"
      aria-label="Register for event"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-semibold tracking-wide text-gray-300 uppercase block mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full px-3 py-2 rounded bg-gray-800 text-sm text-white border ${fieldErrors.name ? "border-red-500" : "border-gray-700"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {fieldErrors.name && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label className="text-[11px] font-semibold tracking-wide text-gray-300 uppercase block mb-1">
            Registration Number
          </label>
          <input
            type="text"
            value={regno}
            onChange={(e) => setRegno(e.target.value.toUpperCase())}
            className={`w-full px-3 py-2 rounded bg-gray-800 text-sm text-white border ${fieldErrors.regno ? "border-red-500" : "border-gray-700"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {fieldErrors.regno && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.regno}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="text-[11px] font-semibold tracking-wide text-gray-300 uppercase block mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-3 py-2 rounded bg-gray-800 text-sm text-white border ${fieldErrors.email ? "border-red-500" : "border-gray-700"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {fieldErrors.email && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label className="text-[11px] font-semibold tracking-wide text-gray-300 uppercase block mb-1">
            Branch
          </label>
          <input
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 text-sm text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold tracking-wide text-gray-300 uppercase block mb-1">
            College
          </label>
          <input
            type="text"
            value={college}
            onChange={(e) => setCollege(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 text-sm text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold tracking-wide text-gray-300 uppercase block mb-1">
            Year
          </label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={`w-full px-3 py-2 rounded bg-gray-800 text-sm text-white border ${fieldErrors.year ? "border-red-500" : "border-gray-700"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="">Select year</option>
            <option value="1st">1st</option>
            <option value="2nd">2nd</option>
            <option value="3rd">3rd</option>
            <option value="4th">4th</option>
            <option value="Other">Other</option>
          </select>
          {fieldErrors.year && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.year}</p>
          )}
        </div>

        {year === "Other" && (
          <div className="md:col-span-2">
            <label className="text-[11px] font-semibold tracking-wide text-gray-300 uppercase block mb-1">
              Please specify
            </label>
            <input
              type="text"
              value={yearOther}
              onChange={(e) => setYearOther(e.target.value)}
              className={`w-full px-3 py-2 rounded bg-gray-800 text-sm text-white border ${fieldErrors.yearOther ? "border-red-500" : "border-gray-700"
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {fieldErrors.yearOther && (
              <p className="text-xs text-red-400 mt-1">
                {fieldErrors.yearOther}
              </p>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

      <div className="flex flex-wrap gap-3 mt-6 justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <button
          type="button"
          onClick={clearForm}
          className="px-4 py-2 text-sm rounded border border-gray-600 bg-transparent hover:bg-gray-800 text-gray-200"
        >
          Clear
        </button>
      </div>
    </form>
  );

  if (!fullPage) return form;

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-blue-400">
            Event Registration
          </h1>
          {eventTitle && (
            <p className="text-sm md:text-base text-gray-300 mt-2">
              for <span className="font-semibold text-white">{eventTitle}</span>
            </p>
          )}
          <p className="mt-3 text-xs md:text-sm text-gray-400 max-w-2xl mx-auto">
            Please provide your details carefully. Your registration number must
            match the one associated with your account.
          </p>
        </div>

        <div className="flex justify-center">
          {success ? (
            <div className="w-full max-w-xl bg-green-900/30 border border-green-700 rounded-2xl px-4 py-5 text-green-100 text-sm text-center shadow">
              <p className="font-medium mb-1">Registration successful ✓</p>
              <p className="text-xs text-green-200">
                You are now registered for this event.
              </p>
            </div>
          ) : (
            form
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-gray-800 flex justify-between items-center text-xs md:text-sm text-gray-300">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded bg-gray-800 hover:bg-gray-700 text-gray-200"
          >
            <span className="text-lg">←</span>
            <span>Back</span>
          </button>
          {success && (
            <span className="text-[11px] text-green-300">
              You can now safely return to the previous page.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
