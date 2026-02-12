"use client";
import React from "react";
import { AnimatedTooltip } from "./ui/animated-tooltip";

// Team members shown in the footer tooltip strip
const people = [
  {
    id: 1,
    name: "Kollepara Jayanth",
    designation: "Full Stack Developer",
    image:
      "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=3387&q=80",
  },
  {
    id: 2,
    name: "Kollepara Abhiram",
    designation: "Database Manager",
    image:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=800&q=60",
  },
  {
    id: 3,
    name: "Minnu",
    designation: "UI Designer",
    image:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=60",
  },
  {
    id: 4,
    name: "Emily Davis",
    designation: "UX Designer",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=800&q=60",
  },
  {
    id: 5,
    name: "Tyler Durden",
    designation: "Soap Developer",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=3540&q=80",
  },
  {
    id: 6,
    name: "Dora",
    designation: "The Explorer",
    image:
      "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=3534&q=80",
  },
];

export default function FooterProfile() {
  return (
    <footer className="py-4 border-t border-slate-900 bg-black/40 backdrop-blur-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col gap-2">
        <div className="flex flex-col md:flex-row items-center md:items-center gap-3 w-full">
          <div className="flex-1 flex justify-center md:justify-start">
            <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Tara
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center scale-90">
            <AnimatedTooltip items={people} />
          </div>

          <div className="flex-1 flex justify-center md:justify-end">
            <div className="text-[10px] text-slate-400 text-center md:text-left leading-tight">
              <h6 className="font-semibold mb-0.5">
                Contact: kolleparajayanth@gmail.com
              </h6>
              <p>+91 8869965959</p>
            </div>
          </div>
        </div>

        <p className="text-slate-500 text-[9px] text-center">
          © {new Date().getFullYear()} Tara. Built for Excellence.
        </p>
      </div>
    </footer>
  );
}
