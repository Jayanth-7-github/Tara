"use client";
import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

export const LampContainer = ({ children, className }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => setIsMobile(window.innerWidth < 640);
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  return (
    <div
      className={cn(
        "relative flex min-h-[60vh] md:min-h-screen flex-col items-stretch justify-start md:justify-center overflow-hidden bg-transparent w-full z-0",
        className,
      )}
    >
      <div className="relative flex w-full h-40 sm:h-52 md:h-72 scale-y-110 md:scale-y-125 items-center justify-center isolate z-0">
        {/* Left glow */}
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-x-0 h-40 sm:h-48 md:h-64 overflow-visible w-full bg-gradient-conic from-cyan-500 via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]"
        >
          <div className="absolute w-[100%] left-0 bg-slate-950/70 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute w-40 h-[100%] left-0 bg-slate-950/70 bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>

        {/* Right glow */}
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
        >
          <div className="absolute w-40 h-[100%] right-0 bg-slate-950/70 bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute w-[100%] right-0 bg-slate-950/70 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>

        {/* Light effects */}
        <div className="absolute top-1/2 h-32 sm:h-40 md:h-52 w-full translate-y-8 sm:translate-y-10 md:translate-y-12 scale-x-150 bg-slate-950/60 blur-2xl" />
        <div className="absolute top-1/2 z-50 h-32 sm:h-40 md:h-52 w-full bg-transparent opacity-10 backdrop-blur-md" />
        <div className="absolute inset-auto z-50 h-28 sm:h-32 md:h-36 w-[18rem] sm:w-[22rem] md:w-[28rem] -translate-y-1/2 rounded-full bg-cyan-500 opacity-50 blur-[80px]" />

        {/* Small glow line */}
        <motion.div
          initial={{ width: "8rem" }}
          whileInView={{ width: "16rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-30 h-28 sm:h-32 md:h-36 w-52 sm:w-60 md:w-64 -translate-y-[4.5rem] sm:-translate-y-[5.5rem] md:-translate-y-[6rem] rounded-full bg-cyan-400 blur-2xl"
        />

        {/* Main animated line (mobile reduced only) */}
        <motion.div
          initial={{ width: isMobile ? "8rem" : "15rem" }}
          whileInView={{ width: isMobile ? "18rem" : "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-50 h-0.5
                     -translate-y-[4rem] sm:-translate-y-[4.5rem] md:-translate-y-[6rem]
                     bg-cyan-400"
        />
      </div>

      <div
        className="relative z-50 flex flex-col items-center px-5 pt-0 md:pt-8 
                -translate-y-20 sm:-translate-y-26 md:-translate-y-44"
      >
        {children}
      </div>
    </div>
  );
};
