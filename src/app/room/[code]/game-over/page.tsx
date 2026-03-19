"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { playAgainAction } from "@/src/app/actions/lobby";
import { Player } from "@/src/types/database";
import { motion, Variants } from "framer-motion";
import { GrossOutContainer } from "@/src/components/GrossOutContainer";
import { SlimeBox } from "@/src/components/SlimeBox";
import { GameIcon, IconType } from "@/src/components/GameIcon";
import { MeatSackLoader } from "@/src/components/MeatSackLoader";
import { useAudio } from "@/src/components/AudioProvider";

// Strict typing for the data we are pulling from Postgres
type GameOverPlayer = Pick<Player, "id" | "player_name" | "score" | "stats">;

interface Award {
  title: string;
  winnerName: string;
  description: string;
  color: "pink" | "blue" | "green" | "purple" | "orange" | "yellow";
  icon: IconType;
}

export default function GameOverPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { playSFX } = useAudio();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [winner, setWinner] = useState<GameOverPlayer | null>(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const localId = localStorage.getItem("senseless_player_id");
    if (!localId) {
      router.replace("/");
      return;
    }
    setPlayerId(localId);

    const fetchGameData = async () => {
      const { data: room } = await supabase
        .from("rooms")
        .select("host_id")
        .eq("room_code", code)
        .single();
        
      if (room) setHostId(room.host_id);

      const { data: playersData } = await supabase
        .from("players")
        .select("id, player_name, score, stats")
        .eq("room_code", code);

      if (!playersData) return;
      const players = playersData as GameOverPlayer[];

      // 1. Determine Winner (Highest Score)
      const sortedByScore = [...players].sort((a, b) => b.score - a.score);
      setWinner(sortedByScore[0]);

      // 2. Calculate Funny Awards Client-Side
      let calculatedAwards: Award[] = [];
      
      // -- Big Brain (Most Correct Guesses)
      const mostCorrect = [...players].sort((a, b) => (b.stats?.correct_guesses || 0) - (a.stats?.correct_guesses || 0))[0];
      if (mostCorrect && (mostCorrect.stats?.correct_guesses || 0) > 0) {
        calculatedAwards.push({
          title: "Big Brain",
          winnerName: mostCorrect.player_name,
          description: `Nailed ${mostCorrect.stats?.correct_guesses} correct guesses.`,
          color: "blue",
          icon: "sight"
        });
      }

      // -- Sneaky Meat-Sack (Fooled the most people)
      const mostFooled = [...players].sort((a, b) => (b.stats?.fooled_others || 0) - (a.stats?.fooled_others || 0))[0];
      if (mostFooled && (mostFooled.stats?.fooled_others || 0) > 0) {
        calculatedAwards.push({
          title: "Sneaky Meat-Sack",
          winnerName: mostFooled.player_name,
          description: `Fooled ${mostFooled.stats?.fooled_others} people with their lies.`,
          color: "green",
          icon: "imposter"
        });
      }

      // -- Blabbermouth (Longest Clue)
      const blabbermouth = [...players].sort((a, b) => (b.stats?.longest_clue || 0) - (a.stats?.longest_clue || 0))[0];
      if (blabbermouth && (blabbermouth.stats?.longest_clue || 0) > 0) {
        calculatedAwards.push({
          title: "Blabbermouth",
          winnerName: blabbermouth.player_name,
          description: `Wrote a massive ${blabbermouth.stats?.longest_clue} character clue.`,
          color: "purple",
          icon: "sound"
        });
      }

      // -- Man of Few Words (Shortest Clue)
      const shortest = [...players].sort((a, b) => (a.stats?.shortest_clue || 999) - (b.stats?.shortest_clue || 999))[0];
      if (shortest && (shortest.stats?.shortest_clue || 999) < 999 && (shortest.stats?.shortest_clue || 0) > 0) {
        calculatedAwards.push({
          title: "Man of Few Words",
          winnerName: shortest.player_name,
          description: `Only needed ${shortest.stats?.shortest_clue} characters to explain it.`,
          color: "orange",
          icon: "touch"
        });
      }

      // -- Trigger Happy (Most Wrong Guesses)
      const mostParanoid = [...players].sort((a, b) => (b.stats?.wrong_guesses || 0) - (a.stats?.wrong_guesses || 0))[0];
      if (mostParanoid && (mostParanoid.stats?.wrong_guesses || 0) > 0) {
        calculatedAwards.push({
          title: "Trigger Happy",
          winnerName: mostParanoid.player_name,
          description: `Voted for innocent people ${mostParanoid.stats?.wrong_guesses} times.`,
          color: "pink",
          icon: "splat"
        });
      }

      // -- Highly Suspicious (Most innocent votes received)
      const mostSus = [...players].sort((a, b) => (b.stats?.innocent_votes_received || 0) - (a.stats?.innocent_votes_received || 0))[0];
      if (mostSus && (mostSus.stats?.innocent_votes_received || 0) > 0) {
        calculatedAwards.push({
          title: "Highly Suspicious",
          winnerName: mostSus.player_name,
          description: `Accused ${mostSus.stats?.innocent_votes_received} times while totally innocent.`,
          color: "yellow",
          icon: "smell"
        });
      }

      // -- Master Thief (Successful Steals)
      const masterThief = [...players].sort((a, b) => (b.stats?.successful_steals || 0) - (a.stats?.successful_steals || 0))[0];
      if (masterThief && (masterThief.stats?.successful_steals || 0) > 0) {
        calculatedAwards.push({
          title: "Master Thief",
          winnerName: masterThief.player_name,
          description: `Successfully stole points ${masterThief.stats?.successful_steals} times!`,
          color: "orange",
          icon: "alarm"
        });
      }

      // -- Terrible Liar (Times Caught)
      const terribleLiar = [...players].sort((a, b) => (b.stats?.times_caught || 0) - (a.stats?.times_caught || 0))[0];
      if (terribleLiar && (terribleLiar.stats?.times_caught || 0) > 0) {
        calculatedAwards.push({
          title: "Terrible Liar",
          winnerName: terribleLiar.player_name,
          description: `Got caught red-handed ${terribleLiar.stats?.times_caught} times.`,
          color: "purple",
          icon: "taste"
        });
      }

      // 3. Shuffle the awards to keep the UI fresh
      calculatedAwards = calculatedAwards.sort(() => Math.random() - 0.5);

      setAwards(calculatedAwards);
    };

    fetchGameData();

    const channel = supabase
      .channel(`game_over_${code}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `room_code=eq.${code}` },
        (payload) => {
          if (payload.new.game_status === "lobby") {
            router.push(`/room/${code}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, router]);

  const handlePlayAgain = async () => {
    // --- FIX APPLIED HERE ---
    // Added 'hostId' to the check. TypeScript now knows 'hostId' 
    // is a string if the code continues past this line.
    if (playerId !== hostId || isResetting || !hostId) return;
    
    playSFX("lobby_start");
    setIsResetting(true);
    
    try {
      await playAgainAction(code, hostId);
    } catch (error) {
      console.error("Failed to reset:", error);
      setIsResetting(false);
    }
  };

  const handleReturnToMenu = () => {
    playSFX("ui_squish");
    router.replace("/");
  };

  if (!winner) {
    return (
      <MeatSackLoader className="flex items-center justify-center h-full">
        <div className="font-display text-4xl text-bruise-purple text-outline text-white uppercase">
          CALCULATING DAMAGE...
        </div>
      </MeatSackLoader>
    );
  }

  const isHost = playerId === hostId;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };
  
  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -50 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300 } }
  };

  return (
    <GrossOutContainer>
      <div className="flex flex-col h-full p-4 relative text-center">
        
        <div className="mt-4 mb-2 shrink-0">
          <motion.h1 
            initial={{ scale: 0.5, rotate: -2 }}
            animate={{ scale: 1, rotate: 0 }}
            className="font-display text-6xl text-toxic-green drop-shadow-chunky leading-none text-outline text-white uppercase"
          >
            GAME OVER
          </motion.h1>
        </div>

        {/* Winner Banner */}
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="mb-4 shrink-0">
          <SlimeBox color="yellow" className="!min-h-[140px] !p-6">
            <div className="flex flex-col items-center gap-2">
              <GameIcon type="crown" size={60} />
              <p className="font-sans text-white font-black uppercase tracking-widest text-[10px] text-outline mb-1">Grand Champion</p>
              <h2 className="font-display text-5xl text-white text-outline leading-none">{winner.player_name}</h2>
              <p className="font-display text-3xl text-fleshy-pink text-outline">{winner.score} PTS</p>
            </div>
          </SlimeBox>
        </motion.div>

        {/* Awards Scroll List */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex-grow flex flex-col gap-3 overflow-y-auto pb-4 px-1"
        >
          {awards.length === 0 && (
             <p className="font-sans text-white font-bold text-sm text-outline animate-pulse mt-4">No notable achievements. Everyone was incredibly average.</p>
          )}

          {awards.map((award, idx) => (
            <motion.div variants={itemVariants} key={idx}>
              <MeatSackLoader>
                <SlimeBox color={award.color} className="!min-h-[100px] !p-4 flex flex-col justify-center relative overflow-hidden">
                  <div className="flex items-center justify-between w-full relative z-10">
                    <div className="text-left max-w-[70%]">
                      <h3 className="font-display text-3xl text-white text-outline leading-none uppercase">{award.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="font-sans text-bruise-purple text-xs font-black uppercase tracking-tight bg-white inline-block px-2 py-1 rounded-sm border-2 border-bruise-purple shadow-[2px_2px_0px_0px_#12001A]">
                          {award.winnerName}
                        </p>
                      </div>
                      <p className="font-sans text-white text-[11px] font-bold text-outline mt-2 leading-tight">{award.description}</p>
                    </div>
                    <GameIcon type={award.icon} size={60} />
                  </div>
                </SlimeBox>
              </MeatSackLoader>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer Actions */}
        <div className="mt-auto pt-2 space-y-2 shrink-0">
          {isHost ? (
             <SlimeBox 
               color="blue" 
               onClick={handlePlayAgain} 
               disabled={isResetting}
               className="!min-h-[90px] !p-2 cursor-pointer"
             >
                <span className="font-display text-4xl text-white text-outline tracking-wider leading-none uppercase">
                  {isResetting ? "RESETTING..." : "PLAY AGAIN"}
                </span>
             </SlimeBox>
          ) : (
            <MeatSackLoader>
              <SlimeBox color="pink" className="!min-h-[90px] !p-2">
                 <span className="font-display text-2xl text-white text-outline leading-none tracking-wider uppercase">WAITING FOR HOST...</span>
              </SlimeBox>
            </MeatSackLoader>
          )}

          <button 
            onClick={handleReturnToMenu} 
            className="w-full bg-white text-bruise-purple font-display text-2xl py-3 rounded-xl border-4 border-bruise-purple shadow-chunky transition-transform active:scale-95 uppercase tracking-widest"
          >
            QUIT TO MENU
          </button>
        </div>

      </div>
    </GrossOutContainer>
  );
}