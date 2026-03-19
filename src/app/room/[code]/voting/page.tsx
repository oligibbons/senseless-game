"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { submitVoteAction } from "@/src/app/actions/voting"; 
import { motion, Variants } from "framer-motion";
import { GrossOutContainer, ScreenShake } from "@/src/components/GrossOutContainer";
import { SlimeBox } from "@/src/components/SlimeBox";
import { MeatSackLoader } from "@/src/components/MeatSackLoader";
import { useAudio } from "@/src/components/AudioProvider";
import { Player } from "@/src/types/database";

type VotingPlayer = Pick<Player, "id" | "player_name" | "current_clue" | "assigned_sense" | "voted_for">;

export default function VotingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { playSFX } = useAudio();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<VotingPlayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        .select("id, player_name, current_clue, assigned_sense, voted_for")
        .eq("room_code", code);

      if (playersData) {
        const typedPlayers = playersData as VotingPlayer[];
        setPlayers(typedPlayers);
        
        // Check if current player already voted (in case of refresh)
        const me = typedPlayers.find(p => p.id === localId);
        if (me && me.voted_for) {
          setHasVoted(true);
        }
      }
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

  const handleSelectClue = (targetId: string) => {
    if (hasVoted || isSubmitting) return;
    
    if (selectedId !== targetId) {
      playSFX("ui_squish");
      setSelectedId(targetId);
    }
  };

  const handleLockVote = async () => {
    if (!playerId || !selectedId || hasVoted || isSubmitting) return;
    
    playSFX("vote_cast"); 
    setIsSubmitting(true);
    
    const result = await submitVoteAction(playerId, selectedId, code);
    
    if (result.success) {
      setHasVoted(true);
    } else {
      setIsSubmitting(false);
    }
  };

  // Filter out the current player so they can't vote for themselves
  const votablePlayers = players.filter(p => p.id !== playerId);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  // Heavy drop-in animation
  const dropVariants: Variants = {
    hidden: { opacity: 0, y: 100, rotate: -5 },
    show: { opacity: 1, y: 0, rotate: 0, transition: { type: "spring", stiffness: 300, damping: 15, mass: 1.2 } }
  };

  const boxColors: ("pink" | "blue" | "green" | "purple" | "orange" | "yellow")[] = ["blue", "purple", "orange", "pink", "green", "yellow"];

  if (players.length === 0) {
    return (
      <MeatSackLoader className="flex items-center justify-center h-full">
        <div className="font-display text-4xl text-fleshy-pink text-outline drop-shadow-chunky">GATHERING CLUES...</div>
      </MeatSackLoader>
    );
  }

  if (hasVoted) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-8">
        <h1 className="font-display text-6xl text-toxic-green text-outline drop-shadow-chunky">VOTE LOCKED</h1>
        <MeatSackLoader>
          <p className="font-display text-3xl text-white text-outline tracking-wider">Waiting for the others to judge...</p>
        </MeatSackLoader>
      </div>
    );
  }

  return (
    <GrossOutContainer delay={0.1}>
      <div className="flex flex-col h-full p-4 relative z-10">
        
        <div className="text-center mt-2 mb-4 shrink-0">
          <h1 className="font-display text-5xl text-warning-yellow text-outline drop-shadow-chunky uppercase">
            WHO IS THE IMPOSTER?
          </h1>
          <p className="font-sans text-white font-black uppercase tracking-widest text-xs text-outline mt-2">
            Tap a clue to select your target
          </p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex-grow flex flex-col gap-4 overflow-y-auto pb-6 px-1"
        >
          {votablePlayers.map((p, idx) => {
            const isSelected = selectedId === p.id;
            const isOtherSelected = selectedId !== null && selectedId !== p.id;
            
            return (
              <motion.div
                key={p.id}
                variants={dropVariants}
                // Visceral depth-of-field effect
                animate={{
                  scale: isSelected ? 1.05 : isOtherSelected ? 0.9 : 1,
                  opacity: isOtherSelected ? 0.5 : 1,
                  filter: isOtherSelected ? "blur(4px)" : "blur(0px)",
                  rotate: isSelected ? (idx % 2 === 0 ? 2 : -2) : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="relative cursor-pointer"
                onClick={() => handleSelectClue(p.id)}
              >
                <SlimeBox 
                  color={boxColors[idx % boxColors.length]} 
                  className={`!min-h-[120px] transition-all duration-300 ${isSelected ? 'ring-8 ring-white' : ''}`}
                >
                  <div className="flex flex-col text-left w-full h-full relative z-10">
                    <div className="flex justify-between items-start mb-2 border-b-2 border-white/20 pb-2">
                      <span className="font-display text-2xl text-white text-outline leading-none">
                        {p.player_name}
                      </span>
                      <span className="font-sans text-[10px] font-black uppercase bg-white text-bruise-purple px-2 py-1 rounded-sm border-2 border-bruise-purple shadow-[2px_2px_0px_0px_#12001A]">
                        {p.assigned_sense}
                      </span>
                    </div>
                    <p className="font-sans text-lg font-bold text-white text-outline leading-tight">
                      "{p.current_clue}"
                    </p>
                  </div>
                </SlimeBox>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="mt-auto pt-2 shrink-0">
          <button
            onClick={handleLockVote}
            disabled={!selectedId || isSubmitting}
            className={`w-full font-display text-4xl py-5 rounded-xl border-4 border-bruise-purple shadow-chunky transition-all ${
              selectedId 
                ? "bg-fleshy-pink text-white text-outline active:scale-95 active:shadow-[2px_2px_0px_0px_#12001A] active:translate-y-1" 
                : "bg-gray-300 text-gray-500 opacity-50 cursor-not-allowed grayscale"
            }`}
          >
            {isSubmitting ? "LOCKING..." : "LOCK IN VOTE"}
          </button>
        </div>

      </div>
    </GrossOutContainer>
  );
}