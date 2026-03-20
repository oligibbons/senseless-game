"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlimeBox } from "./SlimeBox";
import { GameIcon } from "./GameIcon";

export function ConnectionToast() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Initial check on mount
    if (typeof navigator !== "undefined") {
      setIsOffline(!navigator.onLine);
    }

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -150, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed top-4 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none"
        >
          <div className="w-full max-w-[400px]">
            {/* Thematic Fleshy Pink SlimeBox */}
            <SlimeBox color="pink" className="!p-4 !min-h-[80px] shadow-2xl">
              <div className="flex items-center gap-4">
                <GameIcon type="splat" size={40} className="animate-pulse" />
                <div className="flex flex-col text-left">
                  <h3 className="font-display text-2xl text-white text-outline leading-none uppercase">
                    Connection Severed!
                  </h3>
                  <p className="font-sans text-[10px] text-white font-black uppercase tracking-widest text-outline mt-1">
                    Stitching it back together...
                  </p>
                </div>
              </div>
            </SlimeBox>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}