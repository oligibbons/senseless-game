"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { submitVoteAction } from "@/src/app/actions/game";
import { Player, Room } from "@/src/types/database";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { GrossOutContainer } from "@/src/components/GrossOutContainer";
import { SlimeBox } from "@/src/components/SlimeBox";
import { GameIcon } from "@/src/components/GameIcon";
import { MeatSackLoader } from "@/src/components/MeatSackLoader";
import { useAudio } from "@/src/components/AudioProvider";

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
        // Using Type Casting here to ensure the comparison works with your DB types
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
          
          // --- FIX APPLIED HERE ---
          // Changed "results" to "resolution" to match your file structure 
          // and used casting to prevent the "no overlap" type error.
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
    // Safety check for playerId and selectedId to satisfy string requirement
    if (!playerId || !selectedId || isSubmitting || hasVoted) return;

    playSFX("ui_squish");
    setIsSubmitting(true);

    try {
      const result = await submitVoteAction(code, playerId, selectedId);
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
        <div className="mt-6 mb-4">
          <motion.h1 
            initial={{ rotate: -2 }}
            animate={{ rotate: 2 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="font-display text-5xl text-warning-yellow text-outline text-white uppercase leading-none"
          >
            WHO IS SENSELESS?
          </motion.h1>
          <p className="font-sans text-white font-black text-xs uppercase mt-2 tracking-widest bg-bruise-purple inline-block px-3 py-1 rounded-full border-2 border-white">
            Find the Imposter
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!hasVoted ? (
            <motion.div 
              key="voting-grid"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="flex-grow flex flex-col gap-3 overflow-y-auto pb-6 px-1"
            >
              {otherPlayers.map((player) => (
                <motion.div key={player.id} variants={itemVariants}>
                  <SlimeBox
                    color={selectedId === player.id ? "yellow" : "purple"}
                    onClick={() => setSelectedId(player.id)}
                    className={`!p-4 transition-all ${selectedId === player.id ? "scale-105 border-white border-4" : "opacity-90"}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="text-left">
                        <h3 className="font-display text-2xl text-white text-outline leading-none uppercase">
                          {player.player_name}
                        </h3>
                        <p className="font-sans text-[10px] text-white font-bold opacity-80 mt-1 uppercase italic">
                          "{player.current_clue || "Thinking..."}"
                        </p>
                      </div>
                      <GameIcon type="imposter" size={40} className={selectedId === player.id ? "opacity-100" : "opacity-30"} />
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
              <SlimeBox color="blue" className="!p-8 animate-pulse">
                <h2 className="font-display text-4xl text-white text-outline leading-none mb-4 uppercase">
                  Accusation Cast!
                </h2>
                <p className="font-sans text-white font-bold text-sm text-outline">
                  Waiting for the other meat-sacks to point fingers...
                </p>
              </SlimeBox>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-auto pt-2">
          {!hasVoted && (
            <SlimeBox
              color="green"
              onClick={handleVote}
              disabled={!selectedId || isSubmitting}
              className={`!min-h-[90px] !p-4 transition-all ${!selectedId ? 'grayscale opacity-50' : 'cursor-pointer'}`}
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