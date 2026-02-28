import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";


export default function Assignments() {
  
  const [loading, setLoading] = useState(true);

  

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
          <Link to="/dashboard/student" className="text-sm text-gray-300 hover:text-white">
            ← Back to Dashboard
          </Link>
        </header>

        <div className="bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">No Assignments Yet</h2>
          <p className="text-gray-400">
            You haven't been assigned any tasks yet. Check back later!
          </p>
        </div>
      </div>
    </div>
  );
}
