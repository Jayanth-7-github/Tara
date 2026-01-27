import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, getMe, checkLogin } from "../services/auth";

export default function Login() {
  const navigate = useNavigate();
  const [emailOrRegno, setEmailOrRegno] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState(null);

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await checkLogin();
        if (response.authenticated) {
          navigate("/main", { replace: true });
        }
      } catch (error) {
        // Not logged in, stay on login page
      }
    };
    checkAuth();
  }, [navigate]);

  // Prefill remembered email/regno
  useEffect(() => {
    const saved = localStorage.getItem("taraLoginIdentifier");
    if (saved) {
      setEmailOrRegno(saved);
      setRemember(true);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setProfile(null);
    const trimmedIdentifier = emailOrRegno.trim();
    const trimmedPassword = password.trim();
    if (!trimmedIdentifier || !trimmedPassword) {
      setError("Email/Regno and password required");
      return;
    }
    // Check if it's an email or regno
    const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedIdentifier);
    if (!isEmail && trimmedIdentifier.length < 3) {
      setError("Invalid email or registration number");
      return;
    }
    if (trimmedPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      // Backend will accept email in the email field for both email and regno
      const res = await login(trimmedIdentifier, trimmedPassword);
      setSuccess("Login successful");
      if (remember)
        localStorage.setItem("taraLoginIdentifier", trimmedIdentifier);
      else localStorage.removeItem("taraLoginIdentifier");
      // Fetch profile for display
      try {
        const me = await getMe();
        setProfile(me.user || null);
        // notify other components that auth state changed (hamburger, nav, etc.)
        try {
          window.dispatchEvent(new Event("auth-changed"));
        } catch (e) {}
      } catch {}

      // Debug: confirm server sees you as logged-in and show role in console
      try {
        const check = await checkLogin();
        console.log("[auth] checkLogin after login:", check);
        const role = check?.user?.role;
        if (role) console.log("[auth] role:", role);
      } catch (e) {
        console.warn("[auth] checkLogin failed after login:", e);
      }

      // Navigate to Main after short delay
      setTimeout(() => navigate("/main"), 800);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center px-6 py-16 font-sans">
      <div className="w-full max-w-md bg-gray-900/70 backdrop-blur-lg border border-gray-800 shadow-2xl rounded-2xl p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Sign in to continue to your dashboard.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label className="text-sm text-gray-300" htmlFor="emailOrRegno">
              Email or Registration Number
            </label>
            <input
              id="emailOrRegno"
              type="text"
              value={emailOrRegno}
              onChange={(e) => setEmailOrRegno(e.target.value)}
              className="mt-1 w-full p-3 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition"
              placeholder="you@example.com or 21BCE1234"
              autoComplete="username"
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
                autoComplete="current-password"
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
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <label className="flex items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span className="text-gray-300">Remember me</span>
            </label>
            <button
              type="button"
              className="text-blue-400 hover:text-cyan-300"
              onClick={() => alert("Password reset flow not implemented yet.")}
            >
              Forgot password?
            </button>
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
          {profile && (
            <div className="text-xs text-gray-400 border border-gray-700 rounded p-2 bg-gray-800/40">
              Logged in as{" "}
              <span className="text-gray-200 font-medium">{profile.email}</span>
              {profile.role && (
                <span className="ml-1">(role: {profile.role})</span>
              )}
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
            <span>{loading ? "Signing in..." : "Sign In"}</span>
          </button>
        </form>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <Link
            to="/"
            className="text-gray-400 hover:text-gray-200 text-center"
          >
            ← Home
          </Link>
          <Link
            to="/signup"
            className="text-emerald-400 hover:text-emerald-300 text-center"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
