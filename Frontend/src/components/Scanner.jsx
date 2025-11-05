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

  // --- Helper: Extract regno or ID-like text ---
  const extractRegNo = (text) => {
    if (!text) return null;

    try {
      const url = new URL(text);
      const p =
        url.searchParams.get("regno") ||
        url.searchParams.get("id") ||
        url.searchParams.get("q");
      if (p) return p;
    } catch (_) {}

    const m = text.match(/\b[A-Za-z0-9]{5,20}\b/);
    return m ? m[0] : text.trim();
  };

  // --- Load available cameras ---
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

  // --- Start camera scan ---
  const startScanner = async () => {
    if (scanning || !selectedCameraId) return;

    const regionId = qrRegionId.current;
    const html5Qrcode = new Html5Qrcode(regionId, { verbose: false });
    html5QrcodeRef.current = html5Qrcode;

    const config = {
      fps: 20, // Faster scanning
      qrbox: { width: 250, height: 180 },
      aspectRatio: 1.5,
      disableFlip: false,
      rememberLastUsedCamera: true,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
    };

    let lastCaptureTime = 0;

    try {
      await html5Qrcode.start(
        { deviceId: { exact: selectedCameraId } },
        config,
        async (text) => {
          const now = Date.now();
          if (now - lastCaptureTime < 800) return; // 🔥 ignore too-frequent reads
          lastCaptureTime = now;

          console.log("📸 Raw scanned text:", text);
          const extracted = extractRegNo(text);
          console.log("🎯 Extracted RegNo:", extracted);

          if (extracted) {
            await stopScanner();
            setDecodedText(text);
            setRegno(extracted);
            onScan?.(extracted);
          }
        },
        (err) => {
          // ignore minor decode errors
        }
      );

      setScanning(true);
      setDecodedText("");
      setRegno("");
    } catch (err) {
      console.error("Scanner failed to start:", err);
      alert("Unable to access camera. Please allow permissions.");
    }
  };

  // --- Stop camera scan ---
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

  const handleMark = async () => {
    if (!regno) return;
    setLoading(true);
    try {
      console.log("📝 Marking attendance for:", regno); // 👈 log regno when marking
      await onMark?.(regno);
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
          RegNo is captured.
        </small>
      )}
    </div>
  );
}
