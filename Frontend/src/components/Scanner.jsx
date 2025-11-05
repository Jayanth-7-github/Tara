import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function Scanner({ onScan, onMark }) {
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

  return (
    <div className="flex flex-col gap-3 items-center w-full max-w-md mx-auto">
      <div className="flex justify-between items-center w-full">
        {/* Removed manual camera select for mobile-focused behavior.
            A back/rear camera is chosen by default when available. */}
        <div className="text-sm text-gray-400">Student Verification</div>

        <div className="shrink-0">
          {!scanning ? (
            <button
              onClick={startScanner}
              disabled={!selectedCameraId}
              className={`px-4 py-2 rounded-md text-white ${
                selectedCameraId
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-700 cursor-not-allowed"
              }`}
            >
              Start Scan
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <div
          id={qrRegionId.current}
          className={`w-[320px] h-[250px] border border-gray-700 rounded-md overflow-hidden shadow-md transition-all bg-gray-900/60 ${
            regno ? "opacity-30 pointer-events-none" : "opacity-100"
          } mx-auto`}
        />

        {/* Decorative surroundings */}
        <div
          className={`absolute inset-0 rounded-md pointer-events-none ${
            regno ? "opacity-30" : "opacity-100"
          }`}
        >
          {/* Soft glowing ring */}
          <div className="absolute inset-0 rounded-md ring-2 ring-blue-600/20 animate-pulse" />

          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-blue-500/70 rounded-bl-md" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-blue-500/70 rounded-br-md" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-blue-500/70 rounded-tl-md" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-blue-500/70 rounded-tr-md" />

          {/* Center guide */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-gray-300">
            Align ID here
          </div>

          {/* Subtle scan line */}
          <div className="absolute left-0 right-0 top-1/2 h-px bg-linear-to-r from-transparent via-blue-400/40 to-transparent opacity-70 animate-[scan_2s_linear_infinite]" />
        </div>
      </div>

      {decodedText && (
        <div className="mt-2 text-gray-200 text-sm bg-gray-800 border border-gray-700 px-3 py-2 rounded-md w-full">
          <strong>Captured:</strong> {decodedText}
        </div>
      )}

      {regno && (
        <div className="mt-2 w-full bg-green-900 border border-green-700 text-green-200 p-3 rounded-lg shadow-sm">
          <div className="font-semibold mb-2">
            ✅ Registration Number: {regno}
          </div>
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
