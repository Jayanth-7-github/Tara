import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createEvent, updateEvent } from "../services/api";

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

async function resizeImage(file, maxWidth = 1200, quality = 0.8) {
  if (!file) return null;
  const imgData = await toBase64(file);
  const img = document.createElement("img");
  img.src = imgData;
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
  });

  const canvas = document.createElement("canvas");
  const ratio = img.width / img.height || 1;
  const width = Math.min(maxWidth, img.width);
  const height = Math.round(width / ratio);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export default function EventForm({
  initialData = null,
  mode = "create",
  eventId = null,
  onSuccess = null,
}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initialData?.title || "");
  const [venue, setVenue] = useState(initialData?.venue || "");
  const [managerEmail, setManagerEmail] = useState(
    initialData?.managerEmail || ""
  );
  const [date, setDate] = useState(
    initialData?.date
      ? new Date(initialData.date).toISOString().slice(0, 16)
      : ""
  );
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(initialData?.imageUrl || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setTitle(initialData?.title || "");
    setVenue(initialData?.venue || "");
    setManagerEmail(initialData?.managerEmail || "");
    setDate(
      initialData?.date
        ? new Date(initialData.date).toISOString().slice(0, 16)
        : ""
    );
    setDescription(initialData?.description || "");
    setPreview(initialData?.imageUrl || null);
  }, [initialData]);

  const handleFile = (e) => {
    const f = e.target.files && e.target.files[0];
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(initialData?.imageUrl || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!title || !date) {
      setError("Please fill title, date and manager email");
      return;
    }

    // basic client-side email validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!managerEmail || !emailRegex.test(String(managerEmail))) {
      setError("Please provide a valid manager email");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let imageBase64 = null;
      let imageType = null;
      if (file) {
        const resized = await resizeImage(file, 1200, 0.8);
        imageBase64 = resized;
        imageType = "image/jpeg";
      }

      const payload = {
        title,
        description,
        venue,
        managerEmail,
        date,
        imageBase64,
        imageType,
      };

      if (mode === "create") {
        await createEvent(payload);
        if (onSuccess) return onSuccess();
        return navigate("/main");
      } else {
        if (!eventId) throw new Error("Missing eventId for update");
        await updateEvent(eventId, payload);
        if (onSuccess) return onSuccess();
        return navigate("/main");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-4xl mx-auto bg-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 sm:p-8 space-y-8 shadow-2xl relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <label className="block group/input">
          <span className="text-sm font-medium text-gray-300 mb-1.5 block group-focus-within/input:text-blue-400 transition-colors">Event Title</span>
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              placeholder="e.g. Annual Tech Symposium"
            />
            <div className="absolute inset-0 rounded-xl bg-blue-500/5 opacity-0 group-focus-within/input:opacity-100 pointer-events-none transition-opacity" />
          </div>
        </label>

        <label className="block group/input">
          <span className="text-sm font-medium text-gray-300 mb-1.5 block group-focus-within/input:text-blue-400 transition-colors">Venue</span>
          <div className="relative">
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              placeholder="e.g. Main Auditorium"
            />
          </div>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <label className="block group/input">
          <span className="text-sm font-medium text-gray-300 mb-1.5 block group-focus-within/input:text-blue-400 transition-colors">Manager Email</span>
          <div className="relative">
            <input
              type="email"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              required
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              placeholder="manager@example.com"
            />
          </div>
        </label>

        <label className="block group/input">
          <span className="text-sm font-medium text-gray-300 mb-1.5 block group-focus-within/input:text-blue-400 transition-colors">Date & Time</span>
          <div className="relative">
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all [color-scheme:dark]"
            />
          </div>
        </label>
      </div>

      <label className="block group/input">
        <span className="text-sm font-medium text-gray-300 mb-1.5 block group-focus-within/input:text-blue-400 transition-colors">Description</span>
        <div className="relative">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
            placeholder="Describe the event details..."
          />
        </div>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-300 mb-1.5 block">Event Image (Optional)</span>
        <div className="relative group/image">
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="block w-full text-sm text-gray-400
              file:mr-4 file:py-2.5 file:px-4
              file:rounded-xl file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-700
              file:cursor-pointer cursor-pointer
              bg-gray-800/50 border border-gray-700 rounded-xl
              focus:outline-none transition-colors
            "
          />
        </div>

        {preview && (
          <div className="mt-4 relative rounded-xl overflow-hidden border border-gray-700 bg-black/50 aspect-video group/preview">
            <img
              src={preview}
              alt="preview"
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white font-medium">Image Preview</span>
            </div>
          </div>
        )}
      </label>

      <div className="pt-2">
        <button
          disabled={loading}
          type="submit"
          className={`
            w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all duration-300
            flex items-center justify-center gap-2
            ${loading
              ? 'bg-gray-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/25 active:scale-[0.98]'
            }
          `}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{mode === "create" ? "Creating Event..." : "Updating Event..."}</span>
            </>
          ) : (
            <>
              {mode === "create" ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create Event</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Update Event</span>
                </>
              )}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
