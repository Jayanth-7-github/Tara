import React from "react";
import { useLocation } from "react-router-dom";
import Hamburger from "./hamburger";

export default function PublicNavbar() {
  const location = useLocation();
  const isExamPage =
    location.pathname === "/test" || location.pathname === "/test/coding";

  if (isExamPage) return null;

  return (
    <header className="sticky top-0 z-50 bg-[#020617] shadow-[0_4px_30px_rgba(30,58,138,0.2)] border-b border-blue-900/30 text-white">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold tracking-wide bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          Tara
        </h2>
        <Hamburger />
      </div>
    </header>
  );
}
