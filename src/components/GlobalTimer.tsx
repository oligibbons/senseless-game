"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAudio } from "./AudioProvider";

interface GlobalTimerProps {
  duration?: number;
  onTimeUp: () => void;
  isHost: boolean;
  /* * NOTE: We don't need a specific "reset" prop. 
   * When implementing this, pass `key={room.current_prompt_id}`. 
   * React will automatically unmount and reset this component when the key changes!
   */
}

export default function GlobalTimer({ duration = 90, onTimeUp, isHost }: GlobalTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const { playSFX } = useAudio();

  useEffect(() => {
    // If time runs out, ONLY the host triggers the completion action.
    // This prevents 8 players from firing 8 database updates simultaneously.
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
  }, [timeLeft, isHost, onTimeUp, playSFX]);

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