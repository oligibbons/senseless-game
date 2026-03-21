// src/components/GlobalTimer.tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAudio } from "./AudioProvider";

interface GlobalTimerProps {
  duration?: number;
  onTimeUp: () => void;
  isHost: boolean;
  isEnabled?: boolean; // ADDED: Allow disabling the timer entirely
}

export default function GlobalTimer({ duration = 90, onTimeUp, isHost, isEnabled = true }: GlobalTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const { playSFX } = useAudio();

  useEffect(() => {
    // If timers are turned off in lobby config, bypass all countdown logic
    if (!isEnabled) return;

    // If time runs out, ONLY the host triggers the completion action.
    if (timeLeft <= 0) {
      if (isHost) {
        onTimeUp();
      }
      return;
    }

    // Play a warning sound at the 10-second mark to induce panic
    if (timeLeft === 10) {
      playSFX("steal_alarm"); 
    }

    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, isHost, onTimeUp, playSFX, isEnabled]);

  // If Disabled, render a static "No Time Limit" UI
  if (!isEnabled) {
    return (
      <div className="w-full flex flex-col items-center gap-2 mt-6 opacity-80">
        <div className="w-full max-w-md h-8 bg-white border-4 border-black rounded-full shadow-chunky overflow-hidden relative">
          <div className="h-full bg-senseless-green w-full border-r-4 border-black" />
          <div className="absolute inset-0 flex items-center justify-center font-display font-bold text-black text-sm tracking-widest drop-shadow-sm mix-blend-difference text-white uppercase">
            NO TIME LIMIT
          </div>
        </div>
        <p className="text-xs font-bold uppercase opacity-60 text-center">
          Take your time, meat-sacks...
        </p>
      </div>
    );
  }

  // Calculate progress percentage for the shrinking bar
  const progress = (timeLeft / duration) * 100;

  // Determine color based on time left (green -> orange -> pink/red)
  let barColor = "bg-senseless-green";
  if (progress <= 50) barColor = "bg-senseless-orange";
  if (progress <= 20) barColor = "bg-senseless-pink";

  return (
    <div className="w-full flex flex-col items-center gap-2 mt-6">
      <div className="w-full max-w-md h-8 bg-white border-4 border-black rounded-full shadow-chunky overflow-hidden relative">
        <motion.div
          className={`h-full ${barColor} border-r-4 border-black`}
          initial={{ width: "100%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center font-display font-bold text-black text-sm tracking-widest drop-shadow-sm mix-blend-difference text-white">
          {timeLeft} SECONDS
        </div>
      </div>
      
      {/* Helper text explaining who has the power */}
      <p className="text-xs font-bold uppercase opacity-60 text-center">
        {isHost 
          ? "You are the host. The game will force-advance when time is up." 
          : "Waiting on slowpokes..."}
      </p>
    </div>
  );
}