import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEvent } from "../services/api";

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// Resize image client-side using canvas and return a dataURL (base64)
async function resizeImage(file, maxWidth = 1200, quality = 0.8) {
  if (!file) return null;
  const imgData = await toBase64(file);
  // create image element
  const img = document.createElement("img");
  img.src = imgData;
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
  });

  const canvas = document.createElement("canvas");
  const ratio = img.width / img.height;
  const width = Math.min(maxWidth, img.width);
  const height = Math.round(width / ratio);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export default function CreateEvent() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = (e) => {
    const f = e.target.files && e.target.files[0];
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!title || !date) {
      setError("Please fill title and date");
      return;
    }

    setLoading(true);
    try {
      let imageBase64 = null;
      let imageType = null;
      if (file) {
        // resize before upload to reduce DB size
        const resized = await resizeImage(file, 1200, 0.8);
        imageBase64 = resized; // data:<mime>;base64,...
        imageType = "image/jpeg";
      }

      const payload = {
        title,
        description,
        venue,
        date,
        imageBase64,
        imageType,
      };

      await createEvent(payload);
      // On success navigate to events list
      navigate("/main");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Create Event</h1>
          <p className="text-sm text-gray-400">
            Add event details and upload an image (optional).
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 space-y-4"
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
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? "Creating..." : "Create Event"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/events")}
              className="px-4 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
