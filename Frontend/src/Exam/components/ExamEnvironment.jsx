import React from "react";
import { SECURITY_CODE } from "../../services/constants";

export default function ExamEnvironment({
  isCameraOn,
  isScreenSharing,
  isFullscreen,
  cameraStreamRef,
  lobbyCameraRef,
  lobbyScreenRef,
  securityCode,
  handleToggleCamera,
  handleToggleScreenShare,
  handleToggleFullscreen,
  handleCodeChange,
  handleCodeKeyDown,
  handleCodePaste,
  error,
  info,
  canResume,
  handleStartTest,
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-lg p-8 w-full">
      <div className="mb-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Check</h1>
        <p className="text-gray-600 mt-2">
          Enable access to your Camera, Microphone and Screen Sharing
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-4">
        {/* Camera Section */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-full border-2 border-gray-300 rounded-lg bg-black/80 aspect-video flex items-center justify-center relative overflow-hidden shadow-md">
            {isCameraOn ? (
              <video
                ref={lobbyCameraRef}
                autoPlay
                muted
                playsInline
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-xs text-gray-300 font-medium">
                  Camera Off
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleToggleCamera}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium shadow-sm border transition-all text-sm ${isCameraOn
              ? "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"
              : "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
              }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span>{isCameraOn ? "Turn off" : "Turn on"} camera & mic</span>
          </button>
        </div>

        {/* Screen Share Section */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-full border-2 border-gray-300 rounded-lg bg-black/70 aspect-video flex items-center justify-center relative overflow-hidden shadow-md">
            {isScreenSharing ? (
              <video
                ref={lobbyScreenRef}
                autoPlay
                muted
                playsInline
                className="object-contain w-full h-full"
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-xs text-gray-300 font-medium">
                  No Screen Share
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleToggleScreenShare}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium shadow-sm border transition-all text-sm ${isScreenSharing
              ? "bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50"
              : "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
              }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span>{isScreenSharing ? "Stop" : "Start"} screen sharing</span>
          </button>
        </div>
      </div>



      <div className="space-y-6 mt-6">
        {/* Fullscreen check */}
        <div
          className={`flex items-start gap-4 p-4 rounded-lg border-2 ${isFullscreen
            ? "bg-green-50 border-green-300"
            : "bg-red-50 border-red-300"
            }`}
        >
          <div
            className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm ${isFullscreen ? "bg-green-500" : "bg-red-500"
              }`}
          >
            {isFullscreen ? (
              <svg
                className="w-3 h-3 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-3 h-3 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <div className="flex-1 flex justify-between items-center">
            <div>
              <div className="font-semibold text-gray-900">Fullscreen Mode</div>
              <div className="text-sm text-gray-700 mt-0.5">
                {isFullscreen
                  ? "Fullscreen is enabled."
                  : "Please enable fullscreen before starting."}
              </div>
            </div>
            <button
              onClick={handleToggleFullscreen}
              className={`hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full transition-colors font-medium shadow-sm border text-xs ${isFullscreen
                ? "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                : "bg-gray-800 text-white border-gray-900 hover:bg-black"
                }`}
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isFullscreen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V5a1 1 0 011-1h3M4 16v3a1 1 0 001 1h3m7-15h3a1 1 0 011 1v3m-4 8h3a1 1 0 001-1v-3"
                  />
                )}
              </svg>
              <span>{isFullscreen ? "Exit Fullscreen" : "Enable Fullscreen"}</span>
            </button>
          </div>
        </div>

        {/* Security code */}
        <div className="p-4 rounded-lg bg-gray-50 border-2 border-gray-300">
          <div className="font-semibold text-gray-900 mb-1">
            Enter the Security code
          </div>

          <div className="flex gap-3">
            {securityCode.map((c, i) => (
              <input
                key={i}
                id={`sec-${i}`}
                value={c}
                onChange={(e) =>
                  handleCodeChange(
                    i,
                    e.target.value.replace(/\s/g, "").slice(-1)
                  )
                }
                onKeyDown={(e) => handleCodeKeyDown(i, e)}
                onPaste={i === 0 ? handleCodePaste : undefined}
                className="w-12 h-12 border-2 border-gray-300 rounded-lg text-center text-xl font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-300 transition-all shadow-sm"
              />
            ))}
          </div>
        </div>
      </div>

      {
        error && (
          <div className="mt-6 text-red-800 bg-red-100 border-2 border-red-300 rounded-lg px-5 py-3 text-sm font-medium shadow-sm flex items-start gap-3">
            <svg
              className="w-5 h-5 shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )
      }

      {
        !error && info && (
          <div className="mt-6 text-blue-800 bg-blue-100 border-2 border-blue-300 rounded-lg px-5 py-3 text-sm font-medium shadow-sm flex items-start gap-3">
            <svg
              className="w-5 h-5 shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            {info}
          </div>
        )
      }

      <div className="mt-8 flex items-center gap-3 border-t border-gray-200 pt-6">
        <button
          onClick={handleStartTest}
          className={`ml-auto px-8 py-3.5 rounded-lg text-white font-bold text-base shadow-lg transition-all ${isCameraOn &&
            isScreenSharing &&
            isFullscreen &&
            cameraStreamRef.current &&
            cameraStreamRef.current.getAudioTracks &&
            cameraStreamRef.current.getAudioTracks().length > 0 &&
            securityCode.join("") === SECURITY_CODE
            ? "bg-linear-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 hover:shadow-xl transform hover:scale-105"
            : "bg-gray-400 cursor-not-allowed opacity-60"
            }`}
        >
          {canResume ? "Resume Assessment" : "Begin Assessment"}
        </button>
      </div>
    </section >
  );
}
