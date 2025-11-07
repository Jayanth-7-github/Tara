import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup, getMe, checkLogin } from "../services/auth";

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [regno, setRegno] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await checkLogin();
        if (response.authenticated) {
          navigate("/main", { replace: true });
        }
      } catch (error) {
        // Not logged in, stay on signup page
      }
    };
    checkAuth();
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const trimmedEmail = email.trim();
    const trimmedRegno = regno.trim().toUpperCase();
    if (!trimmedEmail || !trimmedRegno || !password || !confirm) {
      setError("All required fields must be filled");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
      setError("Invalid email format");
      return;
    }
    if (trimmedRegno.length < 3) {
      setError("Registration number must be at least 3 characters");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await signup({
        email: trimmedEmail,
        regno: trimmedRegno,
        password,
        name: name.trim() || undefined,
      });
      setSuccess("Account created successfully");
      try {
        await getMe();
      } catch {}
      // Redirect to login or member area; choose member secret for now
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center px-6 py-16 font-sans">
      <div className="w-full max-w-md bg-gray-900/70 backdrop-blur-lg border border-gray-800 shadow-2xl rounded-2xl p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Join Tara and start managing attendance effortlessly.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label className="text-sm text-gray-300" htmlFor="name">
              Name (optional)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full p-3 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition"
              placeholder="Your name"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full p-3 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300" htmlFor="regno">
              Registration Number
            </label>
            <input
              id="regno"
              type="text"
              value={regno}
              onChange={(e) => setRegno(e.target.value.toUpperCase())}
              className="mt-1 w-full p-3 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition uppercase"
              placeholder="e.g., 21BCE1234"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full p-3 pr-12 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="w-5 h-5"
                  >
                    <path
                      d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M3 3l18 18" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="w-5 h-5"
                  >
                    <path
                      d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
                <span className="sr-only">Toggle password visibility</span>
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-300" htmlFor="confirm">
              Confirm Password
            </label>
            <input
              id="confirm"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full p-3 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition"
              placeholder="Repeat password"
              autoComplete="new-password"
            />
          </div>
          {error && (
            <div
              className="text-sm text-red-300"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}
          {success && (
            <div
              className="text-sm text-green-300"
              role="status"
              aria-live="polite"
            >
              {success}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold shadow-md transition-all flex items-center justify-center gap-2"
          >
            {loading && (
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            )}
            <span>{loading ? "Creating..." : "Create Account"}</span>
          </button>
        </form>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-between text-sm">
          <Link to="/login" className="text-gray-400 hover:text-gray-200">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
