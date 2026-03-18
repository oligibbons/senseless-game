"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { submitVoteAction } from "@/src/app/actions/voting";
import { Player } from "@/src/types/database";
import { motion } from "framer-motion";
import { GrossOutContainer } from "@/src/components/GrossOutContainer";
import { SlimeBox } from "@/src/components/SlimeBox";

// Fisher-Yates shuffle to randomize clues
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function VotingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [clues, setClues] = useState<Player[]>([]);
  const [selectedSuspect, setSelectedSuspect] = useState<string | null>(null);
  const [isVoted, setIsVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const localId = localStorage.getItem("senseless_player_id");
    if (!localId) {
      router.replace("/");
      return;
    }
    setPlayerId(localId);

    const loadVotingData = async () => {
      const { data: playersData } = await supabase
        .from("players")
        .select("id, current_clue, assigned_sense, voted_for")
        .eq("room_code", code);

      if (!playersData) return;

      const me = playersData.find(p => p.id === localId);
      if (me && me.voted_for) {
        setIsVoted(true);
      }

      const validClues = playersData.filter(p => p.current_clue) as Player[];
      setClues(shuffleArray(validClues));
    };

    loadVotingData();

    const channel = supabase
      .channel(`voting_${code}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `room_code=eq.${code}` },
        (payload) => {
          if (payload.new.game_status === "resolution") {
            router.push(`/room/${code}/resolution`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, router]);

  const handleVote = async () => {
    if (!playerId || !selectedSuspect) return;
    setIsSubmitting(true);
    setErrorMsg("");

    const result = await submitVoteAction(playerId, code, selectedSuspect);

    if (result.success) {
      setIsVoted(true);
    } else {
      setErrorMsg(result.error || "Failed to cast vote.");
      setIsSubmitting(false);
    }
  };

  if (clues.length === 0) {
    return (
      <div className="flex items-center justify-center h-full font-display text-4xl text-bruise-purple animate-pulse">
        GATHERING CLUES...
      </div>
    );
  }

  if (isVoted) {
    return (
      <GrossOutContainer>
        <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-8">
          <motion.h1 
            initial={{ rotate: -10, scale: 0.5 }}
            animate={{ rotate: 0, scale: 1 }}
            className="font-display text-7xl text-fleshy-pink drop-shadow-chunky leading-none"
          >
            VOTE CAST
          </motion.h1>
          <p className="font-sans text-xl font-bold text-bruise-purple">Awaiting the verdict...</p>
          <div className="w-16 h-16 border-8 border-bruise-purple border-t-fleshy-pink rounded-full animate-spin"></div>
        </div>
      </GrossOutContainer>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -50 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300 } }
  };

  const boxColors: ("blue" | "pink" | "purple" | "orange")[] = ["blue", "purple", "orange", "pink"];

  return (
    <GrossOutContainer>
      <div className="flex flex-col h-full p-4">
        {errorMsg && (
          <div className="bg-warning-yellow text-bruise-purple font-bold p-3 rounded-xl text-center mb-4 border-4 border-bruise-purple">
            {errorMsg}
          </div>
        )}

        <div className="text-center mt-2 mb-4 space-y-1">
          <h1 className="font-display text-5xl text-bruise-purple drop-shadow-chunky leading-none">
            WHO IS THE IMPOSTER?
          </h1>
          <p className="font-sans text-bruise-purple/70 font-black uppercase text-xs tracking-widest">Read the clues. Trust no one.</p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex-grow flex flex-col gap-2 overflow-y-auto pb-4 px-2"
        >
          {clues.map((suspect, idx) => {
            if (suspect.id === playerId) return null;

            const isSelected = selectedSuspect === suspect.id;
            const color = boxColors[idx % boxColors.length];

            return (
              <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={suspect.id}
                className={isSelected ? "drop-shadow-[0px_0px_10px_rgba(255,0,127,0.8)] scale-105 transition-all z-10" : "transition-all z-0"}
              >
                <SlimeBox
                  color={isSelected ? "yellow" : color}
                  onClick={() => setSelectedSuspect(suspect.id)}
                  className="min-h-[120px] !p-4"
                >
                  <div className={`font-sans font-black text-[10px] uppercase tracking-widest mb-1 ${isSelected ? "text-bruise-purple/70" : "text-white/70"}`}>
                    Sense: {suspect.assigned_sense}
                  </div>
                  <div className={`font-display text-3xl leading-tight ${isSelected ? "text-bruise-purple" : "text-white"}`}>
                    "{suspect.current_clue}"
                  </div>
                </SlimeBox>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Action Footer */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-auto pt-4"
        >
          <button
            onClick={handleVote}
            disabled={!selectedSuspect || isSubmitting}
            className={`w-full font-display text-4xl py-4 rounded-xl border-4 border-bruise-purple transition-all ${
              selectedSuspect && !isSubmitting
                ? "bg-fleshy-pink text-white shadow-chunky active:translate-y-1 active:shadow-none"
                : "bg-gray-300 text-gray-500 opacity-50 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? "CASTING VOTE..." : "Lock Vote"}
          </button>
        </motion.div>
      </div>
    </GrossOutContainer>
  );
}