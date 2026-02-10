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
      } catch { }
      // Redirect to login or member area; choose member secret for now
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4 font-sans py-12">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl p-8 sm:p-10 shadow-xl">
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-bold text-white">
            Create Account
          </h1>
          <p className="mt-2 text-gray-400">
            Join Tara and start managing attendance effortlessly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300" htmlFor="name">
                Full Name (optional)
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="John Doe"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300" htmlFor="regno">
                Registration Number
              </label>
              <input
                id="regno"
                type="text"
                value={regno}
                onChange={(e) => setRegno(e.target.value.toUpperCase())}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all uppercase"
                placeholder="Regno"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="regno@klu.ac.in"
              autoComplete="email"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300" htmlFor="confirm">
                Confirm Password
              </label>
              <input
                id="confirm"
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="text-xs font-bold text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-widest flex items-center gap-2"
          >
            {showPassword ? "Hide Passwords" : "Show Passwords"}
          </button>

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
                <span>Creating...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <Link to="/login" className="text-gray-500 hover:text-gray-300 flex items-center gap-2">
            ← Back to Login
          </Link>
          <p className="text-gray-500">
            Agree to <span className="text-gray-400 hover:underline cursor-pointer">Terms</span>
          </p>
        </div>
      </div>
    </div>
  );
}
