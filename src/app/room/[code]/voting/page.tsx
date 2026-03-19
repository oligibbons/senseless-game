"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { submitVoteAction } from "@/src/app/actions/voting"; 
import { motion, Variants, AnimatePresence } from "framer-motion";
import { GrossOutContainer } from "@/src/components/GrossOutContainer";
import { SlimeBox } from "@/src/components/SlimeBox";
import { MeatSackLoader } from "@/src/components/MeatSackLoader";
import { GameIcon, IconType } from "@/src/components/GameIcon";
import { useAudio } from "@/src/components/AudioProvider";
import { Player } from "@/src/types/database";

// Mapping the database Sense string to our bespoke GameIcon types
const senseToIcon: Record<string, IconType> = {
  Sight: "sight",
  Sound: "sound",
  Smell: "smell",
  Touch: "touch",
  Taste: "taste",
};

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
        
        // Handle persistent state recovery
        const me = typedPlayers.find(p => p.id === localId);
        if (me && me.voted_for) {
          setHasVoted(true);
        }
      }
    };

    loadVotingData();

    // Listen for the host to transition the game status to resolution
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

  // Prevent players from voting for themselves
  const votablePlayers = players.filter(p => p.id !== playerId);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      transition: { type: "spring", stiffness: 300, damping: 20 } 
    }
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
        <h1 className="font-display text-6xl text-toxic-green text-outline drop-shadow-chunky uppercase">VOTE LOCKED</h1>
        <MeatSackLoader>
          <div className="flex flex-col items-center gap-6">
            <GameIcon type="splat" size={160} />
            <p className="font-display text-3xl text-white text-outline tracking-wider">Waiting for others to judge...</p>
          </div>
        </MeatSackLoader>
      </div>
    );
  }

  return (
    <GrossOutContainer delay={0.1}>
      <div className="flex flex-col h-full p-4 relative z-10">
        
        <div className="text-center mt-2 mb-4 shrink-0">
          <h1 className="font-display text-5xl text-warning-yellow text-outline drop-shadow-chunky uppercase leading-none">
            WHO IS THE IMPOSTER?
          </h1>
          <p className="font-sans text-white font-black uppercase tracking-widest text-[10px] text-outline mt-2">
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
            const isOtherSelected = selectedId !== null && !isSelected;
            
            return (
              <motion.div
                key={p.id}
                variants={itemVariants}
                onClick={() => handleSelectClue(p.id)}
                animate={{
                  scale: isSelected ? 1.05 : isOtherSelected ? 0.92 : 1,
                  filter: isOtherSelected ? "blur(6px)" : "blur(0px)",
                  opacity: isOtherSelected ? 0.6 : 1,
                  rotate: isSelected ? (idx % 2 === 0 ? 1 : -1) : 0
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="relative cursor-pointer"
              >
                <SlimeBox 
                  color={isSelected ? "yellow" : boxColors[idx % boxColors.length]} 
                  className={`!min-h-[120px] transition-all duration-300 ${isSelected ? 'ring-8 ring-white' : ''}`}
                >
                  <div className="flex justify-between items-center w-full px-2">
                    <div className="flex flex-col text-left max-w-[70%]">
                      <span className="font-display text-2xl text-white text-outline leading-none mb-1">
                        {p.player_name}
                      </span>
                      <p className="font-sans text-lg font-bold text-white text-outline leading-tight italic">
                        "{p.current_clue}"
                      </p>
                    </div>
                    
                    <GameIcon 
                      type={senseToIcon[p.assigned_sense || "Sight"]} 
                      size={70} 
                      className="drop-shadow-chunky"
                    />
                  </div>
                </SlimeBox>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="mt-auto pt-2 shrink-0">
          <SlimeBox 
            color="pink" 
            onClick={handleLockVote} 
            disabled={!selectedId || isSubmitting} 
            className="!min-h-[100px]"
          >
            <span className="font-display text-4xl text-white text-outline uppercase">
              {isSubmitting ? "LOCKING..." : "LOCK IN VOTE"}
            </span>
          </SlimeBox>
        </div>

      </div>
    </GrossOutContainer>
  );
}