"use client";

import { useEffect, useRef, useState } from "react";

export function GlobalAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.5; // Don't blow their eardrums out immediately
    audio.loop = true;

    // Browsers block autoplay until the user interacts with the document.
    // We listen for the first click/touch to kick off the theme song.
    const handleFirstInteraction = () => {
      if (!hasInteracted) {
        audio.play().then(() => {
          setIsPlaying(true);
          setHasInteracted(true);
        }).catch((e) => {
          console.warn("Autoplay still blocked or failed:", e);
        });
      }
    };

    window.addEventListener("click", handleFirstInteraction, { once: true });
    window.addEventListener("touchstart", handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, [hasInteracted]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent this click from triggering other things
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <>
      <audio ref={audioRef} src="/senseless_theme.mp3" preload="auto" />
      
      <button
        onClick={toggleMute}
        className="absolute top-4 right-4 z-50 w-12 h-12 bg-white border-4 border-bruise-purple rounded-full shadow-chunky flex items-center justify-center font-display text-2xl active:scale-90 transition-transform"
        aria-label={isMuted ? "Unmute Theme" : "Mute Theme"}
      >
        {isMuted ? "🔇" : "🔊"}
      </button>
    </>
  );
}