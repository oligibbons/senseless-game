"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { submitClueAction } from "@/src/app/actions/writing";
import { SlimeBox } from "@/src/components/SlimeBox";
import { useAudio } from "@/src/components/AudioProvider";
import { motion, useAnimation } from "framer-motion";
import { Player } from "@/src/types/database";
import { GameIcon, IconType } from "@/src/components/GameIcon";
import { MeatSackLoader } from "@/src/components/MeatSackLoader";

const SENSE_UI: Record<string, { icon: IconType; verb: string; color: string }> = {
  Sight: { icon: "sight", verb: "LOOK", color: "text-fleshy-pink" },
  Sound: { icon: "sound", verb: "SOUND", color: "text-bruise-purple" },
  Smell: { icon: "smell", verb: "SMELL", color: "text-toxic-green" },
  Touch: { icon: "touch", verb: "FEEL", color: "text-fleshy-pink" },
  Taste: { icon: "taste", verb: "TASTE", color: "text-warning-yellow" },
};

type WritingPlayer = Pick<Player, "is_imposter" | "assigned_sense" | "current_clue">;

export default function WritingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { playSFX } = useAudio();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [target, setTarget] = useState<string>("");
  const [sense, setSense] = useState<string>("");
  const [clue, setClue] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasRevealed, setHasRevealed] = useState(false);

  const inputShakeControls = useAnimation();

  useEffect(() => {
    const localId = localStorage.getItem("senseless_player_id");
    if (!localId) {
      router.replace("/");
      return;
    }
    setPlayerId(localId);

    const loadPhaseData = async () => {
      const { data: room } = await supabase
        .from("rooms")
        .select("current_prompt_id")
        .eq("room_code", code)
        .single();

      if (!room || !room.current_prompt_id) return;

      const { data: playerData } = await supabase
        .from("players")
        .select("is_imposter, assigned_sense, current_clue")
        .eq("id", localId)
        .single();

      if (!playerData) return;
      const player = playerData as WritingPlayer;

      setSense(player.assigned_sense || "Sight");

      if (player.current_clue) {
        setIsSubmitted(true);
      }

      const { data: prompt } = await supabase
        .from("prompts")
        .select("true_target, imposter_target")
        .eq("id", room.current_prompt_id)
        .single();

      if (!prompt) return;

      setTarget(player.is_imposter ? prompt.imposter_target : prompt.true_target);
    };

    loadPhaseData();

    const channel = supabase
      .channel(`writing_${code}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `room_code=eq.${code}` },
        (payload) => {
          if (payload.new.game_status === "voting") {
            router.push(`/room/${code}/voting`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, router]);

  useEffect(() => {
    if (target && sense && !hasRevealed && !isSubmitted) {
      playSFX("write_reveal");
      setHasRevealed(true);
    }
  }, [target, sense, hasRevealed, isSubmitted, playSFX]);

  const handleSubmit = async () => {
    // --- FIX ---
    // This check ensures 'playerId' is a string before the action call.
    if (!playerId || clue.trim().length === 0 || isSubmitting) return;
    
    playSFX("ui_splat");
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      // TypeScript now knows 'playerId' is string, not null.
      const result = await submitClueAction(playerId, code, clue);

      if (result.success) {
        setIsSubmitted(true);
      } else {
        setErrorMsg(result.error || "Failed to submit clue.");
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("A brain-fart occurred. Try again.");
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (clue.length >= 50 && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      playSFX("ui_error");
      inputShakeControls.start({
        x: [-12, 12, -10, 10, -5, 5, 0],
        transition: { duration: 0.4, type: "spring", stiffness: 500 }
      });
    }
  };

  if (!target || !sense) {
    return (
      <MeatSackLoader className="flex items-center justify-center h-full">
        <div className="font-display text-4xl text-bruise-purple text-outline text-white uppercase">
          Extracting Data...
        </div>
      </MeatSackLoader>
    );
  }

  const activeSense = SENSE_UI[sense];
  const charsLeft = 50 - clue.length;
  const isDangerZone = charsLeft <= 10;

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-8">
        <h1 className="font-display text-6xl text-fleshy-pink text-outline drop-shadow-chunky uppercase">Clue Locked</h1>
        <MeatSackLoader className="flex flex-col items-center gap-6">
          <GameIcon type={activeSense.icon} size={150} />
          <p className="font-sans text-bruise-purple text-xl font-bold uppercase">Waiting for the others...</p>
        </MeatSackLoader>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 relative z-10">
      {errorMsg && (
        <div className="bg-warning-yellow text-bruise-purple font-bold p-3 rounded-xl text-center mb-4 border-4 border-bruise-purple shadow-chunky uppercase">
          {errorMsg}
        </div>
      )}

      <div className="text-center mt-2 mb-6 flex flex-col items-center w-full">
        <SlimeBox color="yellow" className="min-h-[160px] !p-6 w-full">
          <h1 className="font-display text-4xl sm:text-5xl text-white text-outline drop-shadow-chunky leading-tight uppercase">
            What does <span className={activeSense.color}>{target}</span> {activeSense.verb} like?
          </h1>
        </SlimeBox>
        
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1], 
            rotate: [-5, 5, -5],
            y: [0, -10, 0]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="mt-4"
        >
          <GameIcon type={activeSense.icon} size={150} />
        </motion.div>
      </div>

      <div className="mt-auto flex flex-col gap-4">
        <motion.div animate={inputShakeControls} className="relative">
          <textarea
            value={clue}
            onChange={(e) => setClue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={50}
            disabled={isSubmitting}
            placeholder="Type your clue here..."
            className={`w-full h-32 bg-white text-bruise-purple font-sans font-bold text-2xl p-4 rounded-xl border-8 shadow-chunky focus:outline-none resize-none disabled:opacity-50 transition-colors ${
              isDangerZone ? "border-fleshy-pink focus:border-warning-yellow" : "border-bruise-purple focus:border-toxic-green"
            }`}
          />
          <motion.span 
            animate={isDangerZone ? { scale: [1, 1.3, 1], color: ["#FF007F", "#FFD700", "#FF007F"] } : { scale: 1, color: "rgba(18, 0, 26, 0.4)" }}
            transition={isDangerZone ? { repeat: Infinity, duration: 0.5, ease: "easeInOut" } : {}}
            className="absolute bottom-4 right-4 font-display text-3xl"
          >
            {charsLeft}
          </motion.span>
        </motion.div>

        <SlimeBox 
          color="green" 
          onClick={handleSubmit} 
          disabled={isSubmitting || clue.trim().length === 0}
          className="!min-h-[100px] cursor-pointer"
        >
          <span className="font-display text-4xl text-white text-outline uppercase">
            {isSubmitting ? "Locking..." : "Lock Clue"}
          </span>
        </SlimeBox>
      </div>
    </div>
  );
}