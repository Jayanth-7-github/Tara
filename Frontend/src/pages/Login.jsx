import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, getMe, checkLogin } from "../services/auth";
import { BackgroundRippleEffect } from "../components/ui/background-ripple-effect";
import { CardSpotlight } from "../components/ui/card-spotlight";

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
    <div className="relative min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center px-4 py-10 font-sans overflow-hidden">
      <BackgroundRippleEffect rows={8} cols={24} cellSize={52} />

      <CardSpotlight className="relative z-10 w-full max-w-md shadow-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-gray-400">
            Sign in to continue to your dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-gray-300"
              htmlFor="emailOrRegno"
            >
              Email or Registration Number
            </label>
            <input
              id="emailOrRegno"
              type="text"
              value={emailOrRegno}
              onChange={(e) => setEmailOrRegno(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="regno@klu.ac.in or regno"
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-gray-300"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
              />
              <span className="text-gray-400">Remember me</span>
            </label>
            <button
              type="button"
              className="text-blue-500 hover:text-blue-400 font-medium"
              onClick={() => alert("Password reset flow not implemented yet.")}
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-900/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-900/20 border border-green-900/50 text-green-400 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <Link to="/login" className="text-gray-500 hover:text-gray-300">
            ← Back
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Need an account?</span>
            <Link
              to="/signup"
              className="text-blue-500 hover:text-blue-400 font-bold"
            >
              Create Account
            </Link>
          </div>
        </div>
      </CardSpotlight>
    </div>
  );
}
