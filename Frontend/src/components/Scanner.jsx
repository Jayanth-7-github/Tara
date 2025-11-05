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
        setCameras(devices || []);
        if (devices.length > 0) setSelectedCameraId(devices[0].id);
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
    <div className="flex flex-col gap-3 items-start w-full max-w-md mx-auto">
      <div className="flex items-center gap-3 w-full">
        <select
          value={selectedCameraId || ""}
          onChange={(e) => setSelectedCameraId(e.target.value)}
          className="border rounded-md px-2 py-1 flex-grow"
          disabled={scanning}
        >
          {cameras.length === 0 && <option>No cameras found</option>}
          {cameras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label || c.id}
            </option>
          ))}
        </select>

        {!scanning ? (
          <button
            onClick={startScanner}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
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

      <div
        id={qrRegionId.current}
        className={`w-[320px] h-[250px] border rounded-md overflow-hidden shadow-md transition-all ${
          regno ? "opacity-30 pointer-events-none" : "opacity-100"
        }`}
      />

      {decodedText && (
        <div className="mt-2 text-gray-700 text-sm bg-gray-50 border px-3 py-2 rounded-md w-full">
          <strong>Captured:</strong> {decodedText}
        </div>
      )}

      {regno && (
        <div className="mt-2 w-full bg-green-50 border border-green-300 text-green-800 p-3 rounded-lg shadow-sm">
          <div className="font-semibold mb-2">
            ✅ Registration Number: {regno}
          </div>
          <button
            onClick={handleMark}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white font-medium ${
              loading
                ? "bg-green-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading ? "Marking..." : "Mark Attendance"}
          </button>
        </div>
      )}

      {!regno && (
        <small className="text-gray-500">
          Point your camera at an ID or QR code. Scanning stops once a valid
          RegNo (8–15 digits) is confirmed.
        </small>
      )}
    </div>
  );
}
