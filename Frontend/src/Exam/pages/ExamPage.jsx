import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ExamLobby from "../components/ExamLobby";
import ExamEnvironment from "../components/ExamEnvironment";
import ExamSidebar from "../components/ExamSidebar";
import ExamHeader from "../components/ExamHeader";
import ExamQuestionPanel from "../components/ExamQuestionPanel";
import ExamConfirmModal from "../components/ExamConfirmModal";
import { ExamSuccessToast, ExamErrorToast } from "../components/ExamToasts";
import {
  getQuestionsForUser,
  getCorrectAnswers,
} from "../../services/questions";
import { submitTestResult } from "../../services/api";
import { checkLogin } from "../../services/auth";

export default function ExamPage() {
  const navigate = useNavigate();

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
  const [timeRemaining, setTimeRemaining] = useState(60 * 60);
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

  const lobbyCameraRef = useRef(null);
  const overlayCameraRef = useRef(null);
  const lobbyScreenRef = useRef(null);
  const overlayScreenRef = useRef(null);
  const containerRef = useRef(null);
  const isTestStartedRef = useRef(false);
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
      if (lobbyCameraRef.current) lobbyCameraRef.current.srcObject = stream;
      if (overlayCameraRef.current) overlayCameraRef.current.srcObject = stream;
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
          "Screen share stopped. Returning to lobby. Re-share to resume.",
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
        video: {
          displaySurface: "monitor",
        },
        selfBrowserSurface: "exclude",
        systemAudio: "exclude",
        surfaceSwitching: "include",
        monitorTypeSurfaces: "include",
      });
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();

      // Enforce entire screen selection if supported by browser
      if (settings.displaySurface && settings.displaySurface !== "monitor") {
        stream.getTracks().forEach((t) => t.stop());
        setError("You must share your ENTIRE screen. Application windows or tabs are not allowed.");
        setInfo("");
        return;
      }
      screenStreamRef.current = stream;
      if (lobbyScreenRef.current) lobbyScreenRef.current.srcObject = stream;
      if (overlayScreenRef.current) overlayScreenRef.current.srcObject = stream;
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
    const compatibilityOk = true;
    const browserOk = true;
    const cameraOk = isCameraOn && !!cameraStreamRef.current;
    const screenOk = isScreenSharing && !!screenStreamRef.current;
    const micOk = !!(
      cameraStreamRef.current &&
      cameraStreamRef.current.getAudioTracks &&
      cameraStreamRef.current.getAudioTracks().length > 0
    );
    const fullscreenOk = !!document.fullscreenElement;
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
        setError("Please enter the correct security code.");
      } else {
        setError(
          "Please complete all checks (camera, microphone, screen share, fullscreen, and code 000000) before beginning.",
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
        const copy = { ...prev };
        delete copy[qid];
        return copy;
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

  const handleCodeChange = (idx, val) => {
    const v = (val || "").slice(-1);
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


  // --- Persistence Logic ---

  // Load state from local storage on mount
  useEffect(() => {
    const savedState = localStorage.getItem("examState");
    console.log("Checking for saved state:", savedState ? "Found" : "Not Found");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Validate if saved state belongs to current user if needed, or just restore
        // For now, restoring mostly everything
        if (parsed.isTestStarted || (parsed.answers && Object.keys(parsed.answers).length > 0)) {
          console.log("Restoring exam state...");
          setAnswers(parsed.answers || {});
          setMarkedForReview(parsed.markedForReview || {});
          setLives(parsed.lives ?? 5);
          setTimeRemaining(parsed.timeRemaining ?? 3600);
          setCurrentIndex(parsed.currentIndex || 0);
          // We don't restore camera/screen streams directly effectively, 
          // user needs to re-enable them in the lobby if they were kicked out or if we land them in paused state.
          // However, if we set isTestStarted to true immediately, they might face "Life Lost" if streams aren't ready.
          // SAFER APPROACH: Restore data but keep user in Lobby (isTestStarted = false) with canResume = true
          // AND let them click "Resume Assessment" to re-initialize streams.

          // Actually, let's keep isTestStarted = false so they go through validity checks again.
          setIsTestStarted(false);
          setCanResume(true);

          setInfo("Previous session restored. Please enable devices and resume.");
        }
      } catch (e) {
        console.error("Failed to parse saved exam state", e);
        localStorage.removeItem("examState");
      }
    }
  }, []);

  // Save state to local storage whenever critical data changes
  useEffect(() => {
    if (submitSuccess) return; // Stop saving if already submitted

    if (isTestStarted || canResume || Object.keys(answers).length > 0) {
      const stateToSave = {
        answers,
        markedForReview,
        lives,
        timeRemaining,
        currentIndex,
        isTestStarted: isTestStarted || canResume, // Ensure we mark it as started/resumable even if currently in lobby
        lastUpdated: Date.now(),
      };
      localStorage.setItem("examState", JSON.stringify(stateToSave));
    }
  }, [answers, markedForReview, lives, timeRemaining, currentIndex, isTestStarted, canResume, submitSuccess]);

  const handleSubmitTest = async (options = {}) => {
    if (submitting) return;
    const answeredCount = Object.values(answers).filter(
      (val) => val !== undefined,
    ).length;
    const unanswered = questions.length - answeredCount;

    // Only show confirmation if this is a manual submit
    if (!options.auto && unanswered > 0 && !showConfirmSubmit) {
      setUnansweredCount(unanswered);
      setShowConfirmSubmit(true);
      return;
    }
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
        correctAnswers: getCorrectAnswers(),
        score: 0,
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

      // Clear local storage on successful submit
      localStorage.removeItem("examState");

      if (options.auto) {
        setInfo("Test auto-submitted.");
      }

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
        error.message || "Failed to submit test. Please try again.",
      );
      setSubmitting(false);
    }
  };

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
    return () => {
      stopTracks(cameraStreamRef);
      stopTracks(screenStreamRef);
    };
  }, [stopTracks]);

  useEffect(() => {
    if (isTestStarted && !testStartTime) {
      setTestStartTime(Date.now());
    }
  }, [isTestStarted, testStartTime]);

  useEffect(() => {
    isTestStartedRef.current = isTestStarted;
  }, [isTestStarted]);

  useEffect(() => {
    const onFsChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (isTestStartedRef.current && !fs) {
        setLives((prevLives) => {
          const newLives = prevLives - 1;
          if (newLives <= 0) {
            const answeredCount = Object.values(answers).filter(
              (val) => val !== undefined,
            ).length;
            setInfo(
              `No lives remaining. Auto-submitting test with ${answeredCount} of ${questions.length} questions answered...`,
            );
            setTimeout(() => {
              handleSubmitTest({ auto: true });
            }, 2000);
            return 0;
          } else {
            setShowLifeLost(true);
            setTimeout(() => setShowLifeLost(false), 3000);
            setIsTestStarted(false);
            setCanResume(true);
            setInfo(
              `Life lost! ${newLives} ${newLives === 1 ? "life" : "lives"
              } remaining. Fullscreen exited. Returning to lobby. Enter fullscreen to resume.`,
            );
            return newLives;
          }
        });
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    setIsFullscreen(!!document.fullscreenElement);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

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
      setLives((prevLives) => {
        const newLives = prevLives - 1;
        if (newLives <= 0) {
          const answeredCount = Object.values(answers).filter(
            (val) => val !== undefined,
          ).length;
          setInfo(
            `No lives remaining. Auto-submitting test with ${answeredCount} of ${questions.length} questions answered...`,
          );
          setTimeout(() => {
            handleSubmitTest({ auto: true });
          }, 2000);
          return 0;
        } else {
          setShowLifeLost(true);
          setTimeout(() => setShowLifeLost(false), 3000);
          setIsTestStarted(false);
          setCanResume(true);
          setInfo(
            `Life lost! ${newLives} ${newLives === 1 ? "life" : "lives"
            } remaining. A required permission or mode was lost. Fix the issue and resume.`,
          );
          return newLives;
        }
      });
    }
  }, [isCameraOn, isScreenSharing, isTestStarted]);

  useEffect(() => {
    let timer;
    if (isTestStarted) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTestStarted]);

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
      {!isTestStarted && (
        <div className="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-[340px_1fr] gap-8 relative">
          <ExamLobby
            lives={lives}
            showLifeLost={showLifeLost}
            user={user}
            questions={questions}
          />
          <ExamEnvironment
            isCameraOn={isCameraOn}
            isScreenSharing={isScreenSharing}
            isFullscreen={isFullscreen}
            cameraStreamRef={cameraStreamRef}
            lobbyCameraRef={lobbyCameraRef}
            lobbyScreenRef={lobbyScreenRef}
            securityCode={securityCode}
            handleToggleCamera={handleToggleCamera}
            handleToggleScreenShare={handleToggleScreenShare}
            handleToggleFullscreen={handleToggleFullscreen}
            handleCodeChange={handleCodeChange}
            handleCodeKeyDown={handleCodeKeyDown}
            handleCodePaste={handleCodePaste}
            error={error}
            info={info}
            canResume={canResume}
            handleStartTest={handleStartTest}
          />
        </div>
      )}

      {isTestStarted && (
        <div className="flex flex-1 h-screen overflow-hidden">
          <ExamSidebar
            questions={questions}
            currentIndex={currentIndex}
            answers={answers}
            markedForReview={markedForReview}
            setCurrentIndex={setCurrentIndex}
            isCameraOn={isCameraOn}
            isScreenSharing={isScreenSharing}
            overlayCameraRef={overlayCameraRef}
            overlayScreenRef={overlayScreenRef}
          />
          <main className="flex-1 bg-linear-to-br from-white to-gray-50 relative overflow-y-auto">
            <ExamConfirmModal
              show={showConfirmSubmit}
              unansweredCount={unansweredCount}
              onCancel={() => setShowConfirmSubmit(false)}
              onConfirm={handleSubmitTest}
            />
            {submitSuccess && <ExamSuccessToast />}
            <ExamErrorToast
              message={submitError}
              onClose={() => setSubmitError("")}
            />
            <ExamHeader
              currentIndex={currentIndex}
              questions={questions}
              lives={lives}
              timeRemaining={timeRemaining}
              submitting={submitting}
              onSubmit={handleSubmitTest}
              formatTime={formatTime}
            />
            <ExamQuestionPanel
              currentQuestion={currentQuestion}
              questions={questions}
              answers={answers}
              markedForReview={markedForReview}
              selectAnswer={selectAnswer}
              toggleMarkForReview={toggleMarkForReview}
              currentIndex={currentIndex}
              setCurrentIndex={setCurrentIndex}
              error={error}
            />
          </main>
        </div>
      )}
    </div>
  );
}
