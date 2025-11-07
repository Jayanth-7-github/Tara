import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyTestResults } from "../services/api";

const assignments = [
  {
    id: 1,
    title: "Maths Worksheet 3",
    course: "MAT101",
    due: "Nov 18, 2025",
    status: "Pending",
  },
  {
    id: 2,
    title: "Physics Lab Report",
    course: "PHY110",
    due: "Nov 22, 2025",
    status: "In Review",
  },
  {
    id: 3,
    title: "CS Mini Project",
    course: "CSE210",
    due: "Dec 02, 2025",
    status: "Assigned",
  },
];

export default function Assignments() {
  const [hasTestResults, setHasTestResults] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestResults = async () => {
      try {
        const response = await getMyTestResults();
        setHasTestResults(response.results && response.results.length > 0);
      } catch (error) {
        console.error("Failed to fetch test results:", error);
        setHasTestResults(false);
      } finally {
        setLoading(false);
      }
    };

    fetchTestResults();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-black to-gray-900 text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Assignments
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Track due dates and submission status.
            </p>
          </div>
          <Link to="/main" className="text-sm text-gray-300 hover:text-white">
            ← Back to Dashboard
          </Link>
        </header>

        <div className="grid gap-5">
          {assignments.map((asg) => (
            <article
              key={asg.id}
              className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-100 truncate">
                    {asg.title}
                  </h2>
                  <p className="text-xs text-gray-400">Course: {asg.course}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-emerald-600/30 text-emerald-300 border border-emerald-700/40">
                    Due {asg.due}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300 border border-gray-700">
                    {asg.status}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex gap-3 flex-wrap">
                <button className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 transition shadow">
                  View Details
                </button>
                <button className="px-4 py-2 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition">
                  Submit
                </button>
                {loading ? (
                  <button
                    disabled
                    className="px-4 py-2 text-sm rounded-lg bg-gray-600 cursor-not-allowed opacity-50"
                  >
                    Loading...
                  </button>
                ) : hasTestResults ? (
                  <button
                    disabled
                    className="px-4 py-2 text-sm rounded-lg bg-green-600/50 border border-green-500 text-green-200 cursor-not-allowed"
                  >
                    ✓ Test Taken
                  </button>
                ) : (
                  <Link
                    to="/test"
                    className="px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 transition shadow"
                  >
                    Take Test
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
