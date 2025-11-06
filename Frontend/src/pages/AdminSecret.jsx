import React, { useState } from "react";
import { motion } from "framer-motion";
import AdminNavbar from "../components/AdminNavbar";

export default function AdminSecret() {
  const [pass, setPass] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  function handleUnlock() {
    // simple local gate: token used throughout the app
    if (pass === "12345678987654321") setUnlocked(true);
    else setUnlocked(false);
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900 text-white font-sans py-10 px-5">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto bg-gray-800/60 backdrop-blur-xl border border-gray-700/70 shadow-2xl rounded-2xl p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-400">Admin Secret</h1>
            <p className="text-gray-400 text-sm">
              Enter the admin passphrase to unlock admin-only tools.
            </p>
          </div>
          {/* <AdminNavbar /> */}
        </div>

        {unlocked ? (
          // When unlocked, only show the admin navbar as requested
          <div className="flex items-center justify-center">
            <AdminNavbar />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300">Passphrase</label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full mt-1 p-2 rounded bg-gray-900/40 border border-gray-700 text-white"
                placeholder="Enter admin token"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleUnlock}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
              >
                Unlock
              </button>
              <button
                onClick={() => {
                  setPass("");
                  setUnlocked(false);
                }}
                className="px-3 py-2 rounded bg-gray-700 text-gray-200"
              >
                Clear
              </button>
            </div>

            <div className="mt-4 p-4 rounded bg-red-900/10 border border-red-700/30 text-red-200">
              <strong>Locked:</strong>
              <p className="mt-2 text-sm">
                Enter the correct passphrase to unlock.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
