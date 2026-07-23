import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { checkLogin } from "../../services/auth";
import { verifyEventKey } from "../../services/api";

export default function Secret() {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPublicAccess, setIsPublicAccess] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [inputKey, setInputKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auth check on mount
  useEffect(() => {
    const runCheck = async () => {
      try {
        const auth = await checkLogin();
        if (
          auth.authenticated &&
          (auth.user.role === "admin" || auth.user.role === "member")
        ) {
          setIsAuthenticated(true);
          setCheckingAuth(false);
        } else {
          const stored = sessionStorage.getItem("temp_event_access");
          if (stored) {
            const data = JSON.parse(stored);
            const allowedPages = data.allowedPages || [];
            if (allowedPages.includes("/member/secret")) {
              setIsPublicAccess(true);
              setCheckingAuth(false);
            } else {
              setKeyError("This key does not have permission to access the Secret Portal.");
              setShowKeyModal(true);
              setCheckingAuth(false);
            }
          } else {
            setShowKeyModal(true);
            setCheckingAuth(false);
          }
        }
      } catch (err) {
        setCheckingAuth(false);
        setShowKeyModal(true);
      }
    };
    runCheck();
  }, []);

  const handleVerifyKey = async (e) => {
    e.preventDefault();
    setKeyError("");
    setLoading(true);
    try {
      const res = await verifyEventKey(inputKey);
      if (res.success) {
        const allowedPages = res.allowedPages || [];
        if (!allowedPages.includes("/member/secret")) {
          setKeyError("This key does not have permission to access the Secret Portal.");
          return;
        }
        sessionStorage.setItem(
          "temp_event_access",
          JSON.stringify({
            eventId: res.eventId,
            eventTitle: res.eventTitle,
            managerEmail: res.managerEmail,
            allowedPages: res.allowedPages,
            token: res.token,
          }),
        );
        setIsPublicAccess(true);
        setShowKeyModal(false);
      }
    } catch (err) {
      setKeyError(err.message || "Invalid access key. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (showKeyModal) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl relative"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
              <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Member Access</h2>
            <p className="text-neutral-400 text-sm">Please enter the access code provided by your event manager.</p>
          </div>

          <form onSubmit={handleVerifyKey} className="space-y-6">
            <div>
              <input
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Enter Access Key"
                autoFocus
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-4 text-center text-xl font-mono tracking-widest text-white placeholder-neutral-750 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
              {keyError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-xs mt-3 text-center font-medium"
                >
                  {keyError}
                </motion.p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading || !inputKey.trim()}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-850 disabled:text-neutral-600 text-white rounded-xl font-bold transition-all active:scale-[0.98] shadow-lg shadow-blue-900/20"
              >
                {loading ? "Verifying..." : "Verify Access"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full py-3 bg-transparent text-neutral-400 hover:text-white text-sm font-semibold transition"
              >
                Go to Login
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="max-w-4xl w-full bg-gray-800/50 backdrop-blur-xl border border-gray-700 shadow-2xl rounded-2xl p-8"
      >
        {/* Header Section */}
        <div className="flex flex-col items-center text-center space-y-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Secret Access Portal
          </h1>

          {/* Decorative Identity Section */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-4 bg-gray-700/40 px-6 py-4 rounded-2xl shadow-inner"
          >
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center shadow-md">
              <motion.div
                className="absolute inset-0 rounded-full bg-blue-400/20 blur-xl animate-pulse"
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <svg
                width="42"
                height="42"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-white z-10"
              >
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.28 4.47 3.22 5.66L8 18l3.07-1.54C12.4 16.75 13.2 17 14 17c3.87 0 7-3.13 7-7s-3.13-8-7-8z"
                  fill="currentColor"
                />
                <path
                  d="M9.5 11.5c.5-.5 1.2-1 2.5-1s2 .5 2.5 1c.5.5.5 1.5 0 2s-1.2 1-2.5 1-2-.5-2.5-1c-.5-.5-.5-1.5 0-2z"
                  fill="#fff"
                  opacity="0.9"
                />
              </svg>
            </div>
            <div>
              <div className="text-xl font-semibold text-gray-200">shuuuu</div>
              <div className="text-gray-400 text-sm italic">
                don’t tell anyone...
              </div>
            </div>
          </motion.div>

          {/* Navbar */}
          <div className="mt-2 w-full">
            <Navbar />
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-gray-300 text-lg leading-relaxed">
            Welcome to the{" "}
            <span className="text-blue-400 font-semibold">
              Secret Entry Point
            </span>
            . Use the navigation above to manage attendance and view summaries
            for your event.
          </p>
          <p className="text-gray-500 text-sm">
            ⚠️ Keep this page private — it’s not accessible through the public
            interface. Only authorized personnel should access this route.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
