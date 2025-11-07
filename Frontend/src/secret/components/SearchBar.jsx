import { useState, useEffect, useRef } from "react";
import { searchStudents } from "../../services/api";

export default function SearchBar({ onSearch }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Search for students as user types
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (value.trim().length >= 2) {
        try {
          const results = await searchStudents(value.trim());
          setFilteredStudents(results);
          setShowDropdown(results.length > 0);
        } catch (err) {
          console.error("Filter search failed:", err);
          setFilteredStudents([]);
          setShowDropdown(false);
        }
      } else {
        setFilteredStudents([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const regNo = value.trim();
    if (!regNo) return;
    setLoading(true);

    try {
      await onSearch(regNo);
      setShowDropdown(false);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
      setValue("");
    }
  };

  const handleSelectStudent = async (regno) => {
    setValue("");
    setShowDropdown(false);
    setLoading(true);
    try {
      await onSearch(regno);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full max-w-md mx-auto">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-center gap-3 w-full bg-gray-800/70 shadow-sm rounded-xl border border-gray-700 p-2 sm:p-3 text-white"
      >
        <input
          type="text"
          aria-label="Registration number"
          placeholder="Type to filter registration numbers..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full sm:flex-1 px-3 py-2 border-none focus:ring-0 focus:outline-none text-white placeholder-gray-400 text-sm sm:text-base bg-transparent rounded-lg"
        />

        {/* <button
          type="submit"
          disabled={loading || !value.trim()}
          className={`w-full sm:w-auto px-4 sm:px-5 py-2 rounded-lg text-white font-medium transition text-sm sm:text-base ${
            loading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Searching..." : "Search"}
        </button> */}
      </form>

      {/* Dropdown with filtered students */}
      {showDropdown && filteredStudents.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
          {filteredStudents.map((student) => (
            <button
              key={student._id}
              onClick={() => handleSelectStudent(student.regno)}
              className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-b-0"
            >
              <div className="font-semibold text-white text-sm">
                {student.regno}
              </div>
              <div className="text-gray-400 text-xs mt-1">
                {student.name}
                {student.department && ` • ${student.department}`}
                {student.year && ` • Year ${student.year}`}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
