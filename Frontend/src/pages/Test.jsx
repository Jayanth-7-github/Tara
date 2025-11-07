import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getQuestionsForUser, getCorrectAnswers } from "../services/questions";
import { checkLogin } from "../services/auth";
import { submitTestResult } from "../services/api";

export default function Test() {
  const navigate = useNavigate();

  // Lobby / test mode state
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [questions] = useState(getQuestionsForUser());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [securityCode, setSecurityCode] = useState(["", "", "", "", "", ""]);
  const [canResume, setCanResume] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60 * 60); // 60 minutes in seconds
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [testStartTime, setTestStartTime] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [lives, setLives] = useState(5);
  const [showLifeLost, setShowLifeLost] = useState(false);

  // Refs for media elements & container (fullscreen)
  // Separate refs for lobby and in-test overlay to avoid ref switching issues
  const lobbyCameraRef = useRef(null);
  const overlayCameraRef = useRef(null);
  const lobbyScreenRef = useRef(null);
  const overlayScreenRef = useRef(null);
  const containerRef = useRef(null);
  const isTestStartedRef = useRef(false);

  // Media streams retained for stopping
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const stopTracks = useCallback((streamRef) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleToggleCamera = async () => {
    setError("");
    setInfo("");
    if (isCameraOn) {
      stopTracks(cameraStreamRef);
      setIsCameraOn(false);
      setInfo("Camera turned off");
      if (isTestStarted) {
        setIsTestStarted(false);
        setCanResume(true);
        setInfo("Camera disabled. Returning to lobby. Re-enable to resume.");
      }
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      cameraStreamRef.current = stream;
      // Attach to any mounted camera elements
      if (lobbyCameraRef.current) lobbyCameraRef.current.srcObject = stream;
      if (overlayCameraRef.current) overlayCameraRef.current.srcObject = stream;
      // If user stops camera/mic via browser UI, reflect change and drop to lobby when testing
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          setIsCameraOn(false);
          stopTracks(cameraStreamRef);
          if (isTestStartedRef.current) {
            setIsTestStarted(false);
            setCanResume(true);
            setInfo("Camera/Microphone access lost. Fix and resume.");
          }
        };
      });
      setIsCameraOn(true);
      setInfo("Camera is on");
    } catch (e) {
      setError("Camera permission denied or unavailable");
    }
  };

  const handleToggleScreenShare = async () => {
    setError("");
    setInfo("");
    if (isScreenSharing) {
      stopTracks(screenStreamRef);
      setIsScreenSharing(false);
      setInfo("Screen share stopped");
      if (isTestStarted) {
        setIsTestStarted(false);
        setCanResume(true);
        setInfo(
          "Screen share stopped. Returning to lobby. Re-share to resume."
        );
      }
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Screen share not supported in this browser");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      screenStreamRef.current = stream;
      if (lobbyScreenRef.current) lobbyScreenRef.current.srcObject = stream;
      if (overlayScreenRef.current) overlayScreenRef.current.srcObject = stream;
      // If user stops sharing via browser UI, reflect change
      const [track] = stream.getVideoTracks();
      track.onended = () => {
        setIsScreenSharing(false);
        stopTracks(screenStreamRef);
        if (isTestStartedRef.current) {
          setIsTestStarted(false);
          setCanResume(true);
          setInfo("Screen share lost. Fix and resume.");
        }
      };
      setIsScreenSharing(true);
      setInfo("Screen sharing started");
    } catch (e) {
      setError("Screen share permission denied or cancelled");
    }
  };

  const handleToggleFullscreen = () => {
    const elem = containerRef.current || document.documentElement;
    if (!document.fullscreenElement) {
      elem
        .requestFullscreen?.()
        .catch(() => setError("Could not enter fullscreen"));
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleStartTest = () => {
    // Guard: require checks similar to screenshot flow
    const compatibilityOk = true; // assume supported
    const browserOk = true; // assume OK; can add detailed UA check later
    const cameraOk = isCameraOn && !!cameraStreamRef.current;
    const screenOk = isScreenSharing && !!screenStreamRef.current;
    const micOk = !!(
      cameraStreamRef.current &&
      cameraStreamRef.current.getAudioTracks &&
      cameraStreamRef.current.getAudioTracks().length > 0
    );
    const fullscreenOk = !!document.fullscreenElement;
    // Security code must be exactly six zeros
    const codeString = securityCode.join("");
    const codeOk = codeString === "000000";
    if (
      !(
        compatibilityOk &&
        browserOk &&
        cameraOk &&
        micOk &&
        screenOk &&
        fullscreenOk &&
        codeOk
      )
    ) {
      if (!codeOk) {
        setError("Security code must be exactly 000000.");
      } else {
        setError(
          "Please complete all checks (camera, microphone, screen share, fullscreen, and code 000000) before beginning."
        );
      }
      return;
    }
    setError("");
    setIsTestStarted(true);
    if (!isCameraOn) handleToggleCamera();
  };

  const currentQuestion = questions[currentIndex];

  const selectAnswer = (qid, option) => {
    setAnswers((prev) => {
      if (option === undefined) {
        // Remove the key from the object when clearing
        const { [qid]: removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [qid]: option };
    });
  };

  const toggleMarkForReview = (qid) => {
    setMarkedForReview((prev) => ({
      ...prev,
      [qid]: !prev[qid],
    }));
  };

  // Security code handlers
  const handleCodeChange = (idx, val) => {
    const v = (val || "").slice(-1); // single char
    const next = [...securityCode];
    next[idx] = v;
    setSecurityCode(next);
    if (v && idx < next.length - 1) {
      const el = document.getElementById(`sec-${idx + 1}`);
      el?.focus();
    }
  };
  const handleCodeKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !securityCode[idx] && idx > 0) {
      const el = document.getElementById(`sec-${idx - 1}`);
      el?.focus();
    }
  };
  const handleCodePaste = (e) => {
    const text = (e.clipboardData?.getData("text") || "")
      .replace(/\s+/g, "")
      .slice(0, 6);
    if (!text) return;
    const next = Array(6).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setSecurityCode(next);
    const last = Math.min(text.length - 1, 5);
    setTimeout(() => document.getElementById(`sec-${last}`)?.focus(), 0);
  };

  // Submit test handler
  const handleSubmitTest = async () => {
    if (submitting) return;

    // Count answered questions (only those with actual values, not undefined)
    const answeredCount = Object.values(answers).filter(
      (val) => val !== undefined
    ).length;
    const unanswered = questions.length - answeredCount;

    // Show confirmation UI if not all questions are answered
    if (unanswered > 0 && !showConfirmSubmit) {
      setUnansweredCount(unanswered);
      setShowConfirmSubmit(true);
      return;
    }

    // Proceed with submission
    setShowConfirmSubmit(false);
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const timeSpent = testStartTime
        ? Math.floor((Date.now() - testStartTime) / 1000)
        : 3600 - timeRemaining;

      const testData = {
        testTitle: "Module Practice Assessment | Polymorphism",
        answers,
        markedForReview,
        correctAnswers: getCorrectAnswers(), // Send correct answers for backend validation
        score: 0, // Will be calculated on backend
        totalQuestions: questions.length,
        timeSpent,
        environment: {
          cameraEnabled: isCameraOn,
          screenShareEnabled: isScreenSharing,
          fullscreenUsed: isFullscreen,
        },
      };

      await submitTestResult(testData);
      setSubmitSuccess(true);

      // Wait 2 seconds to show success message, then cleanup and redirect
      setTimeout(() => {
        stopTracks(cameraStreamRef);
        stopTracks(screenStreamRef);
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        navigate("/main");
      }, 2000);
    } catch (error) {
      console.error("Submit error:", error);
      setSubmitError(
        error.message || "Failed to submit test. Please try again."
      );
      setSubmitting(false);
    }
  };

  // Check authentication
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const response = await checkLogin();
        if (!response.authenticated) {
          navigate("/login", { replace: true });
        } else {
          setUser(response.user);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        navigate("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, [navigate]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopTracks(cameraStreamRef);
      stopTracks(screenStreamRef);
    };
  }, [stopTracks]);

  // Track test start time
  useEffect(() => {
    if (isTestStarted && !testStartTime) {
      setTestStartTime(Date.now());
    }
  }, [isTestStarted, testStartTime]);

  // Keep a ref of test started state for async callbacks
  useEffect(() => {
    isTestStartedRef.current = isTestStarted;
  }, [isTestStarted]);

  // Track fullscreen state and auto return to lobby if exited during test
  useEffect(() => {
    const onFsChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (isTestStartedRef.current && !fs) {
        // Lose a life
        setLives((prevLives) => {
          const newLives = prevLives - 1;
          if (newLives <= 0) {
            // Auto-submit when lives reach 0
            const answeredCount = Object.values(answers).filter(
              (val) => val !== undefined
            ).length;
            setInfo(
              `No lives remaining. Auto-submitting test with ${answeredCount} of ${questions.length} questions answered...`
            );
            setTimeout(() => {
              handleSubmitTest();
            }, 2000);
            return 0;
          } else {
            setShowLifeLost(true);
            setTimeout(() => setShowLifeLost(false), 3000);
            setIsTestStarted(false);
            setCanResume(true);
            setInfo(
              `Life lost! ${newLives} ${
                newLives === 1 ? "life" : "lives"
              } remaining. Fullscreen exited. Returning to lobby. Enter fullscreen to resume.`
            );
            return newLives;
          }
        });
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    // initialize
    setIsFullscreen(!!document.fullscreenElement);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // If any requirement is lost during the test, bounce back to lobby (excluding fullscreen - handled separately)
  useEffect(() => {
    if (!isTestStarted) return;
    const micOk = !!(
      cameraStreamRef.current &&
      cameraStreamRef.current.getAudioTracks &&
      cameraStreamRef.current.getAudioTracks().length > 0
    );
    const videoOk = !!(
      cameraStreamRef.current &&
      cameraStreamRef.current.getVideoTracks &&
      cameraStreamRef.current.getVideoTracks().length > 0
    );
    const screenOk = !!(isScreenSharing && screenStreamRef.current);
    if (!(videoOk && micOk && screenOk)) {
      // Lose a life
      setLives((prevLives) => {
        const newLives = prevLives - 1;
        if (newLives <= 0) {
          // Auto-submit when lives reach 0
          const answeredCount = Object.values(answers).filter(
            (val) => val !== undefined
          ).length;
          setInfo(
            `No lives remaining. Auto-submitting test with ${answeredCount} of ${questions.length} questions answered...`
          );
          setTimeout(() => {
            handleSubmitTest();
          }, 2000);
          return 0;
        } else {
          setShowLifeLost(true);
          setTimeout(() => setShowLifeLost(false), 3000);
          setIsTestStarted(false);
          setCanResume(true);
          setInfo(
            `Life lost! ${newLives} ${
              newLives === 1 ? "life" : "lives"
            } remaining. A required permission or mode was lost. Fix the issue and resume.`
          );
          return newLives;
        }
      });
    }
  }, [isCameraOn, isScreenSharing, isTestStarted]);

  // Re-attach streams after re-renders (e.g., switching to test view)
  useEffect(() => {
    if (isCameraOn && cameraStreamRef.current) {
      if (
        lobbyCameraRef.current &&
        lobbyCameraRef.current.srcObject !== cameraStreamRef.current
      ) {
        lobbyCameraRef.current.srcObject = cameraStreamRef.current;
      }
      if (
        overlayCameraRef.current &&
        overlayCameraRef.current.srcObject !== cameraStreamRef.current
      ) {
        overlayCameraRef.current.srcObject = cameraStreamRef.current;
      }
    }
  }, [isCameraOn, isTestStarted]);

  useEffect(() => {
    if (isScreenSharing && screenStreamRef.current) {
      if (
        lobbyScreenRef.current &&
        lobbyScreenRef.current.srcObject !== screenStreamRef.current
      ) {
        lobbyScreenRef.current.srcObject = screenStreamRef.current;
      }
      if (
        overlayScreenRef.current &&
        overlayScreenRef.current.srcObject !== screenStreamRef.current
      ) {
        overlayScreenRef.current.srcObject = screenStreamRef.current;
      }
    }
  }, [isScreenSharing, isTestStarted]);

  // Timer countdown effect
  useEffect(() => {
    if (!isTestStarted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTestStarted]);

  // Format time remaining as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-screen bg-gray-50 text-gray-900 flex flex-col overflow-y-auto"
    >
      {/* ====== LOBBY / ENVIRONMENT SETUP ====== */}
      {!isTestStarted && (
        <div className="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-[340px_1fr] gap-8 relative">
          {/* Life Lost Notification in Lobby */}
          {showLifeLost && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-gray-500 text-white px-8 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce">
              <div className="text-5xl">💔</div>
              <div>
                <div className="font-bold text-xl">Life Lost!</div>
                <div className="text-sm">
                  {lives} {lives === 1 ? "life" : "lives"} remaining
                </div>
              </div>
            </div>
          )}

          {/* Left steps / summary */}
          <aside className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 h-fit">
            <h2 className="text-xl font-bold mb-6 text-gray-900">
              Take an Assessment
            </h2>
            <div className="space-y-5 text-sm">
              <div className="border border-gray-200 rounded-lg p-4 bg-linear-to-br from-blue-50 to-indigo-50 shadow-sm">
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-700">
                  <div>
                    <div className="text-gray-500 mb-1 font-medium">
                      Proctoring
                    </div>
                    <span className="font-bold text-gray-900 text-sm">
                      Remote
                    </span>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1 font-medium">
                      Max. Duration
                    </div>
                    <span className="font-bold text-gray-900 text-sm">1h</span>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500 mb-1 font-medium">
                      Total Questions
                    </div>
                    <span className="font-bold text-gray-900 text-sm">
                      {questions.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shadow-md">
                    1
                  </div>
                  <div className="text-gray-800 font-semibold">
                    Environment Setup
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div className="text-gray-600 font-medium">Test</div>
                </div>
              </div>

              {/* User Info */}
              {user && (
                <div className="border-t border-gray-200 pt-5 mt-5">
                  <div className="text-xs text-gray-500 mb-1 font-medium">
                    Logged in as
                  </div>
                  <div className="text-sm text-gray-900 font-semibold wrap-break-word">
                    {user.regno || user.email}
                  </div>
                  {user.name && (
                    <div className="text-xs text-gray-600 mt-1">
                      {user.name}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* Right main content */}
          <section className="bg-white border border-gray-200 rounded-xl shadow-xl p-8">
            <div className="border-b border-gray-200 pb-5 mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Setup Your Test Environment
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                To proceed, please ensure you pass all the following checks.
              </p>
            </div>

            {/* Checks */}
            <div className="space-y-6">
              {/* Browser compatibility */}
              <div className="flex items-start gap-4 p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0 shadow-sm">
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
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    Browser Compatibility
                  </div>
                  <div className="text-sm text-gray-700 mt-0.5">
                    Your browser is recognized to take this assessment.
                  </div>
                </div>
              </div>
              {/* Browser check */}
              <div className="flex items-start gap-4 p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0 shadow-sm">
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
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    Browser Check
                  </div>
                  <div className="text-sm text-gray-700 mt-0.5">
                    You are all set!
                  </div>
                </div>
              </div>

              {/* Camera, Microphone & Screen Share */}
              <div
                className={`p-4 rounded-lg border-2 ${
                  isCameraOn &&
                  isScreenSharing &&
                  cameraStreamRef.current &&
                  cameraStreamRef.current.getAudioTracks &&
                  cameraStreamRef.current.getAudioTracks().length > 0
                    ? "bg-green-50 border-green-300"
                    : "bg-red-50 border-red-300"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                      isCameraOn &&
                      isScreenSharing &&
                      cameraStreamRef.current &&
                      cameraStreamRef.current.getAudioTracks &&
                      cameraStreamRef.current.getAudioTracks().length > 0
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  >
                    {isCameraOn &&
                    isScreenSharing &&
                    cameraStreamRef.current &&
                    cameraStreamRef.current.getAudioTracks &&
                    cameraStreamRef.current.getAudioTracks().length > 0 ? (
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
                  <div className="font-semibold text-gray-900">
                    Enable access to your Camera, Microphone and Screen Sharing
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="border-2 border-gray-300 rounded-lg bg-black/80 aspect-video flex items-center justify-center relative overflow-hidden shadow-md">
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
                  <div className="border-2 border-gray-300 rounded-lg bg-black/70 aspect-video flex items-center justify-center relative overflow-hidden shadow-md">
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
                </div>
                <div className="flex flex-wrap gap-4 text-sm mt-4">
                  <button
                    onClick={handleToggleCamera}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium shadow-sm"
                  >
                    {isCameraOn ? "Disable" : "Enable"} Camera & Microphone
                  </button>
                  <button
                    onClick={handleToggleScreenShare}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium shadow-sm"
                  >
                    {isScreenSharing ? "Disable" : "Enable"} Screen Sharing
                  </button>
                  <button
                    onClick={handleToggleFullscreen}
                    className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 transition-colors font-medium shadow-sm hidden md:inline-block"
                  >
                    Toggle Fullscreen
                  </button>
                </div>
              </div>

              {/* Fullscreen check */}
              <div
                className={`flex items-start gap-4 p-4 rounded-lg border-2 ${
                  isFullscreen
                    ? "bg-green-50 border-green-300"
                    : "bg-red-50 border-red-300"
                }`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                    isFullscreen ? "bg-green-500" : "bg-red-500"
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
                <div>
                  <div className="font-semibold text-gray-900">
                    Fullscreen Mode
                  </div>
                  <div className="text-sm text-gray-700 mt-0.5">
                    {isFullscreen
                      ? "Fullscreen is enabled."
                      : "Please enable fullscreen before starting."}
                  </div>
                </div>
              </div>

              {/* Security code */}
              <div className="p-4 rounded-lg bg-gray-50 border-2 border-gray-300">
                <div className="font-semibold text-gray-900 mb-1">
                  Enter the Security code
                </div>
                <div className="text-sm text-gray-700 mb-4">
                  This test requires a security code to proceed. Please reach
                  out to your mentor/invigilator for the code.
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

            {error && (
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
            )}
            {!error && info && (
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
            )}

            <div className="mt-8 flex items-center gap-3 border-t border-gray-200 pt-6">
              <button
                onClick={handleStartTest}
                className={`ml-auto px-8 py-3.5 rounded-lg text-white font-bold text-base shadow-lg transition-all ${
                  isCameraOn &&
                  isScreenSharing &&
                  isFullscreen &&
                  cameraStreamRef.current &&
                  cameraStreamRef.current.getAudioTracks &&
                  cameraStreamRef.current.getAudioTracks().length > 0 &&
                  securityCode.join("") === "000000"
                    ? "bg-linear-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 hover:shadow-xl transform hover:scale-105"
                    : "bg-gray-400 cursor-not-allowed opacity-60"
                }`}
              >
                {canResume ? "Resume Assessment" : "Begin Assessment"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ====== TEST INTERFACE (THEMED) ====== */}
      {isTestStarted && (
        <div className="flex flex-1 h-screen overflow-hidden">
          {/* Sidebar styled like theme */}
          <aside className="w-64 bg-linear-to-b from-gray-50 to-gray-100 border-r border-gray-200 shadow-lg flex flex-col relative">
            {/* Camera and Screen Preview in Sidebar */}
            <div className="px-4 py-4 border-b border-gray-200 bg-white/50 backdrop-blur">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">
                Monitoring
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Camera Preview */}
                <div className="relative">
                  <div className="text-[10px] font-medium text-gray-600 mb-1 flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
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
                    Camera
                  </div>
                  <div className="w-full h-20 bg-black/80 rounded-lg overflow-hidden shadow-md ring-1 ring-blue-300">
                    {isCameraOn ? (
                      <video
                        ref={overlayCameraRef}
                        autoPlay
                        muted
                        playsInline
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-white">
                        <svg
                          className="w-4 h-4 mb-0.5"
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
                        <span className="text-[8px]">Camera Off</span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Screen Preview */}
                <div className="relative">
                  <div className="text-[10px] font-medium text-gray-600 mb-1 flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
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
                    Screen
                  </div>
                  <div className="w-full h-20 bg-black/70 rounded-lg overflow-hidden shadow-md ring-1 ring-indigo-300">
                    {isScreenSharing ? (
                      <video
                        ref={overlayScreenRef}
                        autoPlay
                        muted
                        playsInline
                        className="object-contain w-full h-full"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-white">
                        <svg
                          className="w-4 h-4 mb-0.5"
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
                        <span className="text-[8px]">No Share</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Question Panel Header */}
            <div className="px-5 py-3 border-b border-gray-200 bg-white/50 backdrop-blur">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Question Panel
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-6 grid grid-cols-4 gap-3 content-start">
              {questions.map((q, idx) => {
                const answered = answers[q.id] !== undefined;
                const isCurrent = idx === currentIndex;
                const isMarked = markedForReview[q.id];
                const isAnsweredAndMarked = answered && isMarked;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`aspect-square rounded-lg border-2 text-sm font-semibold flex items-center justify-center transition-all duration-200 relative group shadow-sm hover:shadow-md ${
                      isCurrent
                        ? "border-blue-500 ring-2 ring-blue-300 bg-blue-50 text-blue-700 scale-105"
                        : isAnsweredAndMarked
                        ? "border-purple-400 bg-purple-50 text-purple-700 hover:border-purple-500"
                        : isMarked
                        ? "border-orange-400 bg-orange-50 text-orange-700 hover:border-orange-500"
                        : answered
                        ? "border-green-400 bg-green-50 text-green-700 hover:border-green-500"
                        : "border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                    title={q.text}
                  >
                    {q.id}
                    {answered && !isCurrent && !isMarked && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm" />
                    )}
                    {isMarked && !answered && !isCurrent && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                        </svg>
                      </span>
                    )}
                    {isAnsweredAndMarked && !isCurrent && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 bg-white/80 backdrop-blur">
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-gray-600">Current</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-gray-600">Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-gray-600">Review</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-gray-600">Both</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 bg-linear-to-br from-white to-gray-50 relative overflow-y-auto">
            {/* Confirmation Modal */}
            {showConfirmSubmit && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                      <svg
                        className="w-6 h-6 text-orange-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Incomplete Test
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        You have{" "}
                        <span className="font-bold text-orange-600">
                          {unansweredCount}
                        </span>{" "}
                        unanswered question(s). Do you still want to submit your
                        test?
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowConfirmSubmit(false)}
                          className="flex-1 px-4 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                          Go Back
                        </button>
                        <button
                          onClick={handleSubmitTest}
                          className="flex-1 px-4 py-2.5 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-700 transition-colors"
                        >
                          Submit Anyway
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success/Error Messages */}
            {submitSuccess && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <div className="font-bold text-lg">
                    Test Submitted Successfully!
                  </div>
                  <div className="text-sm">Redirecting to dashboard...</div>
                </div>
              </div>
            )}
            {submitError && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 max-w-md">
                <svg
                  className="w-6 h-6 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <div className="font-bold text-lg">Submission Failed</div>
                  <div className="text-sm">{submitError}</div>
                </div>
                <button
                  onClick={() => setSubmitError("")}
                  className="ml-2 text-white hover:text-gray-200 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Header bar */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur-sm z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <h1 className="text-base font-bold text-gray-800">
                  Event Assessment 
                </h1>
                <div className="text-xs px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-medium">
                  Question {currentIndex + 1} / {questions.length}
                </div>
              </div>
              <div className="flex items-center gap-6">
                {/* Lives Display */}
                <div
                  className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                    lives <= 2
                      ? "bg-red-50 border-red-200 text-red-700"
                      : lives <= 3
                      ? "bg-orange-50 border-orange-200 text-orange-700"
                      : "bg-green-50 border-green-200 text-green-700"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-semibold">
                    {lives} {lives === 1 ? "Life" : "Lives"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-700 bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-200">
                  <svg
                    className="w-4 h-4 text-yellow-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-semibold">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
                <button
                  className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSubmitTest}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Finish Assessment"}
                </button>
              </div>
            </div>

            {/* Camera / Screen overlay - REMOVED, now in sidebar */}

            <div className="max-w-4xl mx-auto px-10 py-10 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="text-sm flex items-center gap-2 cursor-pointer transition-colors"
                    onClick={() => toggleMarkForReview(currentQuestion.id)}
                  >
                    <span
                      className={`inline-flex w-5 h-5 border-2 rounded items-center justify-center transition-colors ${
                        markedForReview[currentQuestion.id]
                          ? "bg-orange-500 border-orange-500"
                          : "border-gray-400 hover:border-gray-600"
                      }`}
                    >
                      {markedForReview[currentQuestion.id] && (
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
                      )}
                    </span>
                    <span
                      className={`font-medium ${
                        markedForReview[currentQuestion.id]
                          ? "text-orange-700"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      {markedForReview[currentQuestion.id]
                        ? "Marked for review"
                        : "Mark for review"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold">
                  <div className="px-3 py-1.5 bg-green-50 border-2 border-green-400 text-green-700 rounded-lg shadow-sm">
                    +1
                  </div>
                  <div className="px-3 py-1.5 bg-red-50 border-2 border-red-400 text-red-700 rounded-lg shadow-sm">
                    0
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                <p className="text-sm font-semibold text-gray-500 mb-3">
                  Question {currentQuestion.id} of {questions.length}
                </p>
                <p className="text-lg text-gray-900 leading-relaxed font-medium mb-6">
                  {currentQuestion.text}
                </p>
                <hr className="my-6 border-gray-200" />
                <div className="space-y-3">
                  {currentQuestion.options.map((opt, index) => {
                    const selected = answers[currentQuestion.id] === index;
                    return (
                      <button
                        key={opt}
                        onClick={() => selectAnswer(currentQuestion.id, index)}
                        className={`w-full text-left px-5 py-4 border-2 rounded-xl text-base flex items-center gap-4 transition-all duration-200 ${
                          selected
                            ? "bg-blue-50 border-blue-500 ring-2 ring-blue-300 shadow-md"
                            : "bg-white hover:bg-gray-50 border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md"
                        }`}
                      >
                        <span
                          className={`inline-flex w-5 h-5 border-2 rounded-full items-center justify-center shrink-0 transition-colors ${
                            selected
                              ? "border-blue-600 bg-blue-100"
                              : "border-gray-400"
                          }`}
                        >
                          {selected && (
                            <span className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                          )}
                        </span>
                        <span
                          className={`font-medium ${
                            selected ? "text-gray-900" : "text-gray-700"
                          }`}
                        >
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div
                  className="mt-6 flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-800 transition-colors"
                  onClick={() => selectAnswer(currentQuestion.id, undefined)}
                >
                  <span className="inline-block w-5 h-5 border-2 border-gray-400 rounded hover:border-gray-600 transition-colors" />
                  <span className="font-medium">Clear Response</span>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-6">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  className={`px-6 py-3 rounded-lg text-sm font-medium border-2 transition-all ${
                    currentIndex === 0
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md"
                  }`}
                >
                  ← Previous
                </button>
                <button
                  disabled={currentIndex === questions.length - 1}
                  onClick={() =>
                    setCurrentIndex((i) =>
                      Math.min(questions.length - 1, i + 1)
                    )
                  }
                  className={`px-6 py-3 rounded-lg text-sm font-medium border-2 transition-all ${
                    currentIndex === questions.length - 1
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md"
                  }`}
                >
                  Next →
                </button>
                <div className="ml-auto flex gap-3">
                  <button
                    className="px-8 py-3 rounded-lg text-sm font-bold bg-linear-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSubmitTest}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit Test"}
                  </button>
                </div>
              </div>
              {error && (
                <div className="text-red-600 text-sm pt-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 font-medium">
                  {error}
                </div>
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
