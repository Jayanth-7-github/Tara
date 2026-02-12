import React from "react";
import { useNavigate } from "react-router-dom";
import { BackgroundRippleEffect } from "../components/ui/background-ripple-effect";
import GoogleButton from "../components/Googlebutton";

export default function AuthEntry() {
  const navigate = useNavigate();

  const handleContinueEmail = () => {
    navigate("/login/email");
  };

  return (
    <div className="relative min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center px-4 py-10 font-sans overflow-hidden">
      <BackgroundRippleEffect rows={8} cols={24} cellSize={52} />

      <div className="relative z-10 w-full max-w-xl rounded-3xl bg-black/70 border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.75)] backdrop-blur-2xl px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-semibold tracking-tight bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Tara
            </span>
            <span className="text-xs text-gray-500">
              Attendance · Events · Exams
            </span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-2">
          Sign in to your account
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          Choose a sign-in method to continue. Social logins are placeholders
          for now; use email to access your dashboard.
        </p>

        <div className="mb-6">
          <GoogleButton />
        </div>
        <div className="my-5 flex items-center gap-3 text-xs text-gray-500">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="uppercase tracking-[0.2em] text-gray-500">or</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleContinueEmail}
            className="w-full rounded-xl bg-white text-gray-900 text-sm sm:text-base font-medium py-3 sm:py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.75)] hover:bg-gray-100 transition-colors"
          >
            Continue with Email
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full text-sm text-gray-400 hover:text-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-lg">←</span>
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}
