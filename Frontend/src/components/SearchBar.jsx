import { useState } from "react";

export default function SearchBar({ onSearch }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const regNo = value.trim();
    if (!regNo) return;
    setLoading(true);

    try {
      await onSearch(regNo);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
      setValue("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-3 w-full max-w-md mx-auto bg-white shadow-sm rounded-xl border border-gray-200 px-3 py-2"
    >
      <input
        type="text"
        aria-label="Registration number"
        placeholder="Enter registration number or scan ID..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 px-3 py-2 border-none focus:ring-0 focus:outline-none text-gray-800 text-base"
      />

      <button
        type="submit"
        disabled={loading || !value.trim()}
        className={`px-5 py-2 rounded-lg text-white font-medium transition ${
          loading
            ? "bg-blue-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "Searching..." : "Search"}
      </button>
    </form>
  );
}
