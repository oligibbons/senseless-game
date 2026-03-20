"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";

export type SFX =
  | "ui_squish" | "ui_splat" | "ui_error"
  | "lobby_join" | "lobby_start" | "lobby_nuke"
  | "write_reveal" | "phase_transition"
  | "vote_cast"
  | "res_drumroll" | "res_caught" | "res_escaped"
  | "steal_alarm" | "steal_success" | "steal_fail";

const SFX_MAP: Record<SFX, string> = {
  ui_squish: "/sfx_ui_squish.wav",
  ui_splat: "/sfx_ui_splat.wav",
  ui_error: "/sfx_ui_error.mp3",
  lobby_join: "/sfx_lobby_join.wav",
  lobby_start: "/sfx_lobby_start.mp3",
  lobby_nuke: "/sfx_lobby_nuke.wav",
  write_reveal: "/sfx_write_reveal.mp3",
  phase_transition: "/sfx_phase_transition.wav",
  vote_cast: "/sfx_vote_cast.wav",
  res_drumroll: "/sfx_res_drumroll.wav",
  res_caught: "/sfx_res_caught.wav",
  res_escaped: "/sfx_res_escaped.wav",
  steal_alarm: "/sfx_steal_alarm.wav",
  steal_success: "/sfx_steal_success.wav",
  steal_fail: "/sfx_steal_fail.wav",
};

interface AudioContextType {
  playSFX: (sfx: SFX) => void;
  isMuted: boolean;
  toggleMute: (e: React.MouseEvent) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error("useAudio must be used within an AudioProvider");
  return context;
};

export function AudioProvider({ children }: { children: ReactNode }) {
  const bgmRef = useRef<HTMLAudioElement>(null);
  const sfxRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Background Music Logic
  useEffect(() => {
    const audio = bgmRef.current;
    if (!audio) return;

    audio.volume = 0.35;
    audio.loop = true;

    const handleFirstInteraction = () => {
      if (!hasInteracted) {
        audio.play().then(() => {
          setHasInteracted(true);
        }).catch((e) => console.warn("Autoplay blocked:", e));
      }
    };

    window.addEventListener("click", handleFirstInteraction, { once: true });
    window.addEventListener("touchstart", handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, [hasInteracted]);

  // Sync mute state to the audio element
  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  // Zero-latency SFX player using preloaded elements
  const playSFX = (sfx: SFX) => {
    if (isMuted) return;
    
    const baseAudio = sfxRefs.current[sfx];
    if (baseAudio) {
      // Clone the node so the same sound can overlap if triggered rapidly
      const clone = baseAudio.cloneNode(true) as HTMLAudioElement;
      clone.volume = 0.8;
      clone.play().catch((e) => console.warn("SFX blocked:", e));
      
      // Clean up the clone after it finishes playing
      clone.onended = () => clone.remove();
    } else {
      // Fallback just in case the ref isn't bound yet
      const audio = new Audio(SFX_MAP[sfx]);
      audio.volume = 0.8;
      audio.play().catch((e) => console.warn("SFX blocked:", e));
    }
  };

  return (
    <AudioContext.Provider value={{ playSFX, isMuted, toggleMute }}>
      {/* Background Theme */}
      <audio ref={bgmRef} src="/senseless_theme.mp3" preload="auto" />
      
      {/* Hidden preloaded SFX elements */}
      {Object.entries(SFX_MAP).map(([key, src]) => (
        <audio 
          key={key} 
          ref={(el) => { sfxRefs.current[key] = el; }} 
          src={src} 
          preload="auto" 
        />
      ))}
      
      <button
        onClick={toggleMute}
        className="absolute top-4 right-4 z-50 w-12 h-12 bg-white border-4 border-bruise-purple rounded-full shadow-chunky flex items-center justify-center font-display text-2xl active:scale-90 transition-transform"
        aria-label={isMuted ? "Unmute Theme" : "Mute Theme"}
      >
        {isMuted ? "🔇" : "🔊"}
      </button>
      
      {children}
    </AudioContext.Provider>
  );
}