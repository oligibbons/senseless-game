"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { submitClueAction } from "@/src/app/actions/writing";
import { SlimeBox } from "@/src/components/SlimeBox";
import { useAudio } from "@/src/components/AudioProvider";
import { motion, Variants } from "framer-motion";

const SENSE_UI: Record<string, { icon: string; label: string; color: string }> = {
  Sight: { icon: "👁️", label: "BLOODSHOT EYES", color: "text-fleshy-pink" },
  Sound: { icon: "👂", label: "OOZING EARS", color: "text-bruise-purple" },
  Smell: { icon: "👃", label: "HAIRY NOSE", color: "text-toxic-green" },
  Touch: { icon: "🖐️", label: "BLISTERED HANDS", color: "text-fleshy-pink" },
  Taste: { icon: "👅", label: "SLOBBERING TONGUE", color: "text-warning-yellow" },
};

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

      const { data: player } = await supabase
        .from("players")
        .select("is_imposter, assigned_sense, current_clue")
        .eq("id", localId)
        .single();

      if (!player) return;

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
    if (!playerId || clue.trim().length === 0) return;
    playSFX("ui_splat");
    setIsSubmitting(true);
    setErrorMsg("");

    const result = await submitClueAction(playerId, code, clue);

    if (result.success) {
      setIsSubmitted(true);
    } else {
      setErrorMsg(result.error || "Failed to submit clue.");
      setIsSubmitting(false);
    }
  };

  if (!target || !sense) {
    return <div className="flex items-center justify-center h-full font-display text-4xl text-bruise-purple animate-pulse">EXTRACTING DATA...</div>;
  }

  const activeSense = SENSE_UI[sense];
  const charsLeft = 50 - clue.length;

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-8">
        <h1 className="font-display text-6xl text-fleshy-pink text-outline drop-shadow-chunky">CLUE LOCKED</h1>
        <p className="font-sans text-bruise-purple text-xl font-bold">Waiting for the other meat-sacks...</p>
        <motion.div 
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-8xl"
        >
          {activeSense.icon}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 relative z-10">
      {errorMsg && (
        <div className="bg-warning-yellow text-bruise-purple font-bold p-3 rounded-xl text-center mb-4 border-4 border-bruise-purple">
          {errorMsg}
        </div>
      )}

      <div className="text-center mt-2 mb-2 flex flex-col items-center">
        <p className="font-sans text-bruise-purple font-black uppercase tracking-widest text-sm mb-[-10px] z-10 text-outline text-white">Your Target Is:</p>
        <SlimeBox color="yellow" className="min-h-[120px]">
          <h1 className="font-display text-5xl text-white text-outline drop-shadow-chunky leading-tight">
            {target}
          </h1>
        </SlimeBox>
      </div>

      <div className="text-center mb-6 flex flex-col items-center">
        <p className="font-sans text-bruise-purple/70 font-black uppercase tracking-widest text-xs mb-2">Describe it using only your:</p>
        <div className="text-6xl mb-1">{activeSense.icon}</div>
        <h2 className={`font-display text-4xl ${activeSense.color} text-outline tracking-widest drop-shadow-chunky`}>
          {activeSense.label}
        </h2>
      </div>

      <div className="mt-auto flex flex-col gap-4">
        <div className="relative">
          <textarea
            value={clue}
            onChange={(e) => setClue(e.target.value)}
            maxLength={50}
            disabled={isSubmitting}
            placeholder="Type your clue here..."
            className="w-full h-32 bg-white text-bruise-purple font-sans font-bold text-2xl p-4 rounded-xl border-8 border-bruise-purple shadow-chunky focus:outline-none focus:border-fleshy-pink resize-none disabled:opacity-50"
          />
          <span className={`absolute bottom-4 right-4 font-display text-2xl ${charsLeft <= 10 ? 'text-fleshy-pink animate-pulse' : 'text-bruise-purple/40'}`}>
            {charsLeft}
          </span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || clue.trim().length === 0}
          className="w-full bg-toxic-green text-white text-outline font-display text-4xl py-4 rounded-xl shadow-chunky border-4 border-bruise-purple disabled:opacity-50"
        >
          {isSubmitting ? "LOCKING..." : "Lock Clue"}
        </button>
      </div>
    </div>
  );
}