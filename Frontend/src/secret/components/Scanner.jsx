import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function Scanner({ onScan, onMark, studentFound = null }) {
  const qrRegionId = useRef(`html5qr-region-${crypto.randomUUID()}`);
  const html5QrcodeRef = useRef(null);

  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [decodedText, setDecodedText] = useState("");
  const [regno, setRegno] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Extract registration number safely ---
  const extractRegNo = (text) => {
    if (!text) return null;
    const raw = String(text).trim();
    console.log("📸 Raw scan:", raw);

    // If URL, check common params
    try {
      const url = new URL(raw);
      const p =
        url.searchParams.get("regno") ||
        url.searchParams.get("id") ||
        url.searchParams.get("q");
      if (p) return p.trim();
    } catch (_) {}

    // Look for 10–15 digit student IDs
    const numMatch = raw.match(/\b\d{8,15}\b/);
    if (numMatch) return numMatch[0];

    // Look for alphanumeric codes like VV40041378
    const alphaNum = raw.match(/\b[A-Za-z]{0,3}\d{5,12}\b/);
    if (alphaNum) return alphaNum[0];

    return null;
  };

  // --- Load cameras ---
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        const list = devices || [];
        setCameras(list);
        // Prefer a back/rear camera for mobile (labels often include back/rear/environment)
        // Explicitly avoid front/selfie cameras (labels may include front, user, selfie)
        const backRegex = /back|rear|environment|facing back/i;
        const frontRegex = /front|user|selfie|facing front/i;

        const foundBack = list.find((d) => backRegex.test(d.label || ""));
        if (foundBack) {
          setSelectedCameraId(foundBack.id);
        } else {
          // choose the first device that does NOT look like a front camera
          const nonFront = list.find((d) => !frontRegex.test(d.label || ""));
          if (nonFront) setSelectedCameraId(nonFront.id);
          else {
            // No back/non-front camera detected — do not auto-select a front camera
            setSelectedCameraId(null);
          }
        }
      })
      .catch(() => setCameras([]));

    return () => stopScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Start scanner ---
  const startScanner = async () => {
    if (scanning || !selectedCameraId) return;

    const regionId = qrRegionId.current;
    const html5Qrcode = new Html5Qrcode(regionId, { verbose: false });
    html5QrcodeRef.current = html5Qrcode;

    const config = {
      fps: 20,
      qrbox: { width: 280, height: 90 },
      aspectRatio: 1.2,
      rememberLastUsedCamera: true,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    };

    const candidateMap = new Map();
    const confirmCount = 2; // need two identical reads
    const confirmTime = 1000;

    try {
      await html5Qrcode.start(
        { deviceId: { exact: selectedCameraId } },
        config,
        async (text) => {
          const extracted = extractRegNo(text);
          if (!extracted) return;

          // Filter short/incomplete results
          if (extracted.length < 8) {
            console.warn("⚠️ Skipped short regno:", extracted);
            return;
          }

          const now = Date.now();
          const prev = candidateMap.get(extracted) || { count: 0, time: now };
          candidateMap.set(extracted, {
            count: prev.count + 1,
            time: now,
          });

          // Confirmed same RegNo twice quickly
          if (prev.count + 1 >= confirmCount && now - prev.time < confirmTime) {
            console.log("✅ Confirmed RegNo:", extracted);
            await stopScanner();
            setDecodedText(text);
            setRegno(extracted);
            onScan?.(extracted);
            candidateMap.clear();
          }
        },
        (err) => {}
      );

      setScanning(true);
      setDecodedText("");
      setRegno("");
    } catch (err) {
      console.error("❌ Failed to start scanner:", err);
      alert("Unable to access camera. Please allow permissions.");
    }
  };

  // --- Stop scanner ---
  const stopScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (_) {}
      html5QrcodeRef.current = null;
    }
    setScanning(false);
  };

  // --- Handle mark attendance ---
  const handleMark = async () => {
    if (!regno) return;
    setLoading(true);
    try {
      await onMark?.(regno);
      // restart scanner for next scan
      setTimeout(() => {
        setRegno("");
        setDecodedText("");
        startScanner();
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  const handleScannerClick = () => {
    if (!selectedCameraId) return;
    if (scanning) {
      stopScanner();
    } else {
      startScanner();
    }
  };

  return (
    <div className="flex flex-col gap-3 items-center w-full max-w-md mx-auto">
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
        <div className="w-full text-center">
          <div className="text-lg font-semibold text-white mb-1">
            Student ID Verification
          </div>
          <div className="text-sm text-gray-400">
            {!scanning ? "Tap to start scanning" : "Tap to stop scanning"}
          </div>
        </div>
      </div>

      <div className="relative cursor-pointer" onClick={handleScannerClick}>
        <div
          id={qrRegionId.current}
          className={`w-[320px] h-[250px] border border-gray-700 rounded-md overflow-hidden shadow-md transition-all ${
            regno
              ? "bg-gray-900/60 opacity-30 pointer-events-none"
              : scanning
              ? "bg-gray-900/60"
              : "bg-gray-800/80"
          } mx-auto`}
        />

        {/* Professional Scanner Overlay */}
        <div
          className={`absolute inset-0 rounded-md pointer-events-none transition-opacity duration-300 ${
            regno ? "opacity-30" : "opacity-100"
          }`}
        >
          {/* Active scanning indicator */}
          {scanning && (
            <>
              <div className="absolute inset-0 rounded-md ring-2 ring-blue-500/30 animate-pulse" />
              <div className="absolute inset-0 rounded-md bg-linear-to-b from-blue-500/5 to-transparent" />
            </>
          )}

          {/* Modern corner markers */}
          <div className="absolute top-3 left-3 w-8 h-8 border-t-[3px] border-l-[3px] border-blue-500 rounded-tl-lg" />
          <div className="absolute top-3 right-3 w-8 h-8 border-t-[3px] border-r-[3px] border-blue-500 rounded-tr-lg" />
          <div className="absolute bottom-3 left-3 w-8 h-8 border-b-[3px] border-l-[3px] border-blue-500 rounded-bl-lg" />
          <div className="absolute bottom-3 right-3 w-8 h-8 border-b-[3px] border-r-[3px] border-blue-500 rounded-br-lg" />

          {/* Center guide - show when not scanning */}
          {!scanning && (
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
              <svg
                className="w-16 h-16 mx-auto mb-3 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
              <div className="text-sm font-medium text-gray-300">
                Tap to Start
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Position ID card barcode within frame
              </div>
            </div>
          )}

          {/* Scanning animation line */}
          {scanning && (
            <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-linear-to-r from-transparent via-blue-400 to-transparent animate-[scan_2s_ease-in-out_infinite]" />
          )}
        </div>
      </div>

      {decodedText && (
        <div className="mt-2 text-gray-200 text-sm bg-gray-800 border border-gray-700 px-3 py-2 rounded-md w-full">
          <strong>Captured:</strong> {decodedText}
        </div>
      )}

      {regno && (
        <div
          className={`mt-2 w-full p-3 rounded-lg shadow-sm ${
            studentFound === false
              ? "bg-red-900 border border-red-700 text-red-200"
              : "bg-green-900 border border-green-700 text-green-200"
          }`}
        >
          <div className="font-semibold mb-2">
            {studentFound === false ? "❌" : "✅"} Registration Number: {regno}
          </div>
          {studentFound === false && (
            <div className="text-sm text-red-300 mt-1">Not Registered</div>
          )}
        </div>
      )}

      {!regno && (
        <small className="text-gray-400">
          Point your camera at an ID back barcode.
        </small>
      )}
    </div>
  );
}
