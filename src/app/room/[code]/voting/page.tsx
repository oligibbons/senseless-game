// src/app/room/[code]/voting/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { submitVoteAction, forceAdvancePhaseAction } from "@/src/app/actions/voting"; 
import { Player, Room } from "@/src/types/database";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { GrossOutContainer } from "@/src/components/GrossOutContainer";
import { SlimeBox } from "@/src/components/SlimeBox";
import { GameIcon, IconType } from "@/src/components/GameIcon";
import { MeatSackLoader } from "@/src/components/MeatSackLoader";
import { useAudio } from "@/src/components/AudioProvider";
import { BumpyText } from "@/src/components/BumpyText";
import GlobalTimer from "@/src/components/GlobalTimer";

// ADDED: Mapping the string sense from DB to our Icon component types
const senseToIcon: Record<string, IconType> = {
  Sight: "sight",
  Sound: "sound",
  Smell: "smell",
  Touch: "touch",
  Taste: "taste",
};

export default function VotingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { playSFX } = useAudio();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const localId = localStorage.getItem("senseless_player_id");
    if (!localId) {
      router.replace("/");
      return;
    }
    setPlayerId(localId);

    const fetchData = async () => {
      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", code)
        .single();

      if (roomData) {
        setRoom(roomData as Room);
        setIsHost(roomData.host_id === localId);
        
        if ((roomData.game_status as string) === "resolution") {
          router.push(`/room/${code}/resolution`);
        }
      }

      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .eq("room_code", code);

      if (playersData) {
        setPlayers(playersData as Player[]);
        const me = playersData.find(p => p.id === localId);
        if (me?.voted_for) setHasVoted(true);
      }
    };

    fetchData();

    const channel = supabase
      .channel(`voting_${code}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `room_code=eq.${code}` },
        (payload) => {
          const updatedRoom = payload.new as Room;
          setRoom(updatedRoom);
          
          if ((updatedRoom.game_status as string) === "resolution") {
            router.push(`/room/${code}/resolution`);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "players", filter: `room_code=eq.${code}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, router]);

  const handleVote = async () => {
    if (!playerId || !selectedId || isSubmitting || hasVoted) return;

    playSFX("ui_squish");
    setIsSubmitting(true);

    try {
      const result = await submitVoteAction(playerId, code, selectedId);
      if (result.success) {
        setHasVoted(true);
      } else {
        console.error(result.error);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("Voting failed:", err);
      setIsSubmitting(false);
    }
  };

  const handleTimeUp = async () => {
    if (!isHost) return;
    await forceAdvancePhaseAction(code, "resolution");
  };

  if (!room || !playerId || players.length === 0) {
    return (
      <MeatSackLoader className="flex items-center justify-center flex-grow min-h-full">
        <div className="font-display text-4xl text-fleshy-pink text-outline uppercase">
          Sniffing out the imposter...
        </div>
      </MeatSackLoader>
    );
  }

  const otherPlayers = players.filter(p => p.id !== playerId);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    show: { opacity: 1, scale: 1, y: 0 }
  };

  return (
    <GrossOutContainer>
      <div className="flex flex-col flex-grow min-h-full p-4 text-center">
        <div className="mt-4 mb-2">
          <motion.h1 
            initial={{ rotate: -2 }}
            animate={{ rotate: 2 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="font-display text-4xl sm:text-5xl text-warning-yellow text-outline text-white uppercase leading-none"
          >
            <BumpyText text="WHO IS SENSELESS?" />
          </motion.h1>
          <p className="font-sans text-white font-black text-xs uppercase mt-2 tracking-widest bg-bruise-purple inline-block px-3 py-1 rounded-full border-2 border-white">
            Find the Imposter
          </p>
        </div>
        
        {!hasVoted && (
          <div className="mb-2">
            <GlobalTimer 
              key={code} 
              duration={60} 
              isHost={isHost} 
              onTimeUp={handleTimeUp} 
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {!hasVoted ? (
            <motion.div 
              key="voting-grid"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="flex-grow flex flex-col gap-4 overflow-y-auto pb-6 px-1 mt-2"
            >
              {otherPlayers.map((player) => (
                <motion.div key={player.id} variants={itemVariants}>
                  <SlimeBox
                    color={selectedId === player.id ? "yellow" : "purple"}
                    onClick={() => setSelectedId(player.id)}
                    className={`!p-4 transition-all ${selectedId === player.id ? "scale-105 border-white border-4 shadow-[0_0_20px_rgba(255,215,0,0.6)]" : "opacity-90 grayscale-[20%]"}`}
                  >
                    <div className="flex flex-col w-full text-left gap-3 relative z-10">
                      
                      {/* Top Row: Name and Icon */}
                      <div className="flex items-center justify-between pb-2 border-b-4 border-black/20">
                        <span className="font-display text-3xl text-white text-outline uppercase tracking-wider">
                          {player.player_name}
                        </span>
                        {/* CHANGED: Swapped out text pill for our chunky icon */}
                        {player.assigned_sense && (
                          <div className="bg-white rounded-full p-1 border-4 border-bruise-purple shadow-sm transform rotate-3">
                            <GameIcon type={senseToIcon[player.assigned_sense]} size={30} />
                          </div>
                        )}
                      </div>

                      {/* Middle Row: The actual clue */}
                      <div className="bg-white p-4 rounded-xl border-4 border-bruise-purple min-h-[80px] flex items-center justify-center text-center shadow-inner relative overflow-hidden">
                        <p className={`font-sans font-black leading-tight text-bruise-purple relative z-10 ${player.current_clue ? "text-xl sm:text-2xl" : "text-sm opacity-50 italic"}`}>
                          {player.current_clue ? `"${player.current_clue}"` : "[ Failed to write a clue in time ]"}
                        </p>
                      </div>

                    </div>
                    {/* Background Icon Watermark */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none z-0">
                       <GameIcon type="imposter" size={100} />
                    </div>
                  </SlimeBox>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="waiting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-grow flex flex-col items-center justify-center gap-6"
            >
              <SlimeBox color="blue" className="!p-8 animate-pulse w-full max-w-sm">
                <h2 className="font-display text-4xl text-white text-outline leading-none mb-4 uppercase">
                  Accusation Cast!
                </h2>
                <p className="font-sans text-white font-bold text-sm text-outline">
                  Waiting for the other meat-sacks to point fingers...
                </p>
              </SlimeBox>

              <div className="w-full max-w-sm">
                <GlobalTimer 
                  key={code} 
                  duration={60} 
                  isHost={isHost} 
                  onTimeUp={handleTimeUp} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-auto pt-2 pb-4">
          {!hasVoted && (
            <SlimeBox
              color="green"
              onClick={handleVote}
              disabled={!selectedId || isSubmitting}
              className={`!min-h-[80px] !p-4 transition-all ${!selectedId ? 'grayscale opacity-50' : 'cursor-pointer hover:scale-[1.02] active:scale-95'}`}
            >
              <span className="font-display text-4xl text-white text-outline uppercase">
                {isSubmitting ? "Accusing..." : "VOTE NOW"}
              </span>
            </SlimeBox>
          )}
        </div>
      </div>
    </GrossOutContainer>
  );
}