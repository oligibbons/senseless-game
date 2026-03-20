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
import { DynamicDowntime } from "@/src/components/DynamicDowntime";

const SENSE_UI: Record<string, { icon: IconType; verb: string; color: string }> = {
  Sight: { icon: "sight", verb: "LOOK", color: "text-fleshy-pink" },
  Sound: { icon: "sound", verb: "SOUND", color: "text-bruise-purple" },
  Smell: { icon: "smell", verb: "SMELL", color: "text-toxic-green" },
  Touch: { icon: "touch", verb: "FEEL", color: "text-fleshy-pink" },
  Taste: { icon: "taste", verb: "TASTE", color: "text-warning-yellow" },
};

// Updated type to include player_name for our downtime text
type WritingPlayer = Pick<Player, "id" | "player_name" | "is_imposter" | "assigned_sense" | "current_clue">;

export default function WritingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { playSFX } = useAudio();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<WritingPlayer[]>([]);
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

      // Fetch ALL players to track who is still writing
      const { data: playersData } = await supabase
        .from("players")
        .select("id, player_name, is_imposter, assigned_sense, current_clue")
        .eq("room_code", code);

      if (!playersData) return;
      
      const typedPlayers = playersData as WritingPlayer[];
      setPlayers(typedPlayers);

      // Find the local user's specific data
      const me = typedPlayers.find(p => p.id === localId);
      if (!me) return;

      setSense(me.assigned_sense || "Sight");

      if (me.current_clue) {
        setIsSubmitted(true);
      }

      const { data: prompt } = await supabase
        .from("prompts")
        .select("true_target, imposter_target")
        .eq("id", room.current_prompt_id)
        .single();

      if (!prompt) return;

      setTarget(me.is_imposter ? prompt.imposter_target : prompt.true_target);
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
      .on(
        // Listen for player updates to dynamically update the downtime text
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "players", filter: `room_code=eq.${code}` },
        (payload) => {
          setPlayers((prev) => prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p)));
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
    if (!playerId || clue.trim().length === 0 || isSubmitting) return;
    
    playSFX("ui_splat");
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const result = await submitClueAction(playerId, code, clue);

      if (result.success) {
        setIsSubmitted(true);
        // Optimistically update local state to avoid waiting for the socket bounce-back
        setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, current_clue: clue } : p));
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
      <MeatSackLoader className="flex flex-col flex-grow min-h-full items-center justify-center">
        <div className="font-display text-4xl text-bruise-purple text-outline text-white uppercase">
          Extracting Data...
        </div>
      </MeatSackLoader>
    );
  }

  const activeSense = SENSE_UI[sense];
  const charsLeft = 50 - clue.length;
  const isDangerZone = charsLeft <= 10;
  
  // Calculate exactly who we are waiting on
  const waitingOnNames = players.filter(p => !p.current_clue).map(p => p.player_name);

  if (isSubmitted) {
    return (
      <div className="flex flex-col flex-grow min-h-full items-center justify-center p-6 text-center space-y-8">
        <h1 className="font-display text-6xl text-fleshy-pink text-outline drop-shadow-chunky uppercase">Clue Locked</h1>
        <MeatSackLoader className="flex flex-col items-center gap-6">
          <GameIcon type={activeSense.icon} size={150} />
          {/* Using our brand new Dynamic Downtime component */}
          <DynamicDowntime waitingOn={waitingOnNames} />
        </MeatSackLoader>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-grow min-h-full p-4 relative z-10">
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

      <div className="mt-auto pt-4 flex flex-col gap-4">
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
          className="!min-h-[100px] cursor-pointer mb-4"
        >
          <span className="font-display text-4xl text-white text-outline uppercase">
            {isSubmitting ? "Locking..." : "Lock Clue"}
          </span>
        </SlimeBox>
      </div>
    </div>
  );
}