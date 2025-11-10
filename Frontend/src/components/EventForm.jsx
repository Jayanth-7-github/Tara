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
      className="bg-gray-900/70 border border-gray-800 rounded-2xl p-4 sm:p-6 space-y-4"
    >
      {error && <div className="text-sm text-red-400">{error}</div>}

      <label className="block">
        <span className="text-sm text-gray-200">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm text-gray-200">Venue</span>
        <input
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          className="mt-1 w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm text-gray-200">Manager Email</span>
        <input
          value={managerEmail}
          onChange={(e) => setManagerEmail(e.target.value)}
          type="email"
          required
          className="mt-1 w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm text-gray-200">Date & time</span>
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm text-gray-200">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-white text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm text-gray-200">Image (optional)</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="mt-1 text-sm text-gray-300"
        />
        {preview && (
          <img
            src={preview}
            alt="preview"
            className="mt-2 w-full max-h-60 object-cover rounded"
          />
        )}
      </label>

      <div className="flex items-center gap-3">
        <button
          disabled={loading}
          type="submit"
          className="w-full sm:w-auto px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading
            ? mode === "create"
              ? "Creating..."
              : "Updating..."
            : mode === "create"
            ? "Create Event"
            : "Update Event"}
        </button>
      </div>
    </form>
  );
}
