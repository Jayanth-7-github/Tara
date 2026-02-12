import React, { useState } from "react";
import { motion } from "motion/react";
import { ImSpinner2 } from "react-icons/im";
import { getGoogleAuthUrl } from "../services/auth";

function GoogleButton() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setLoading(true);
    setTimeout(() => {
      window.location.href = getGoogleAuthUrl();
    }, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full"
    >
      <motion.button
        onClick={handleGoogleSignIn}
        whileHover={!loading && { scale: 1.02 }}
        whileTap={!loading && { scale: 0.97 }}
        disabled={loading}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className={`flex items-center justify-center w-full gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 transition-colors ${
          loading ? "opacity-70 cursor-not-allowed" : ""
        }`}
      >
        {loading ? (
          <ImSpinner2 className="animate-spin w-5 h-5 text-indigo-600" />
        ) : (
          <>
            <svg
              className="w-5 h-5"
              viewBox="0 0 533.5 544.3"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                fill="#4285F4"
                d="M533.5 278.4c0-18.9-1.6-37-4.6-54.6H272v103.3h146.9c-6.4 34.6-25 63.9-53.4 83.5v69.3h86.3c50.5-46.6 81.7-115.4 81.7-201.5z"
              />
              <path
                fill="#34A853"
                d="M272 544.3c72.6 0 133.6-24 178.2-65.4l-86.3-69.3c-24 16.2-54.9 25.8-91.9 25.8-70.6 0-130.5-47.6-151.9-111.6H30.1v70.1C74.8 485.6 167.6 544.3 272 544.3z"
              />
              <path
                fill="#FBBC05"
                d="M120.1 326.4c-10.9-32.7-10.9-67.9 0-100.6V155.7H30.1c-42.8 84.7-42.8 185.1 0 269.8l90-99.1z"
              />
              <path
                fill="#EA4335"
                d="M272 107.7c39.5 0 75.1 13.6 103 40.4l77.2-77.2C402.3 24.6 342.8 0 272 0 167.6 0 74.8 58.7 30.1 155.7l90 70.1C141.5 155.3 201.4 107.7 272 107.7z"
              />
            </svg>
            <span className="text-gray-100">Login with Google</span>
          </>
        )}
      </motion.button>
    </motion.div>
  );
}

export default GoogleButton;
