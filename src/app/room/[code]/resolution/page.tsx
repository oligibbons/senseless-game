"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { finalizeRoundAction } from "@/src/app/actions/resolution";
import { Player, Prompt } from "@/src/types/database";
import levenshtein from "fast-levenshtein";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { GrossOutContainer, ScreenShake } from "@/src/components/GrossOutContainer";
import { SlimeBox } from "@/src/components/SlimeBox";
import { GameIcon, IconType } from "@/src/components/GameIcon";
import { MeatSackLoader } from "@/src/components/MeatSackLoader";
import { useAudio } from "@/src/components/AudioProvider";
import { BumpyText } from "@/src/components/BumpyText";

const senseToIcon: Record<string, IconType> = {
  Sight: "sight",
  Sound: "sound",
  Smell: "smell",
  Touch: "touch",
  Taste: "taste",
};

type ResolutionPlayer = Pick<Player, "id" | "player_name" | "is_imposter" | "voted_for" | "room_code" | "current_clue" | "assigned_sense">;

export default function ResolutionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { playSFX } = useAudio();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<ResolutionPlayer[]>([]);
  const [imposter, setImposter] = useState<ResolutionPlayer | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  
  const [isCaught, setIsCaught] = useState<boolean | null>(null);
  const [stealGuess, setStealGuess] = useState("");
  const [stealResult, setStealResult] = useState<"pending" | "success" | "failed">("pending");
  const [isFinalizing, setIsFinalizing] = useState(false);

  // New states for the Blind Voting Reveal
  const [revealPhase, setRevealPhase] = useState<"loading" | "tallying" | "drumroll" | "revealed">("loading");
  const [validVotes, setValidVotes] = useState<{voterName: string, targetId: string}[]>([]);
  const [shownVotes, setShownVotes] = useState<{voterName: string, targetId: string}[]>([]);

  const [hasPlayedReveal, setHasPlayedReveal] = useState(false);
  const [hasPlayedStealAlarm, setHasPlayedStealAlarm] = useState(false);
  const [hasPlayedStealResult, setHasPlayedStealResult] = useState(false);

  useEffect(() => {
    const localId = localStorage.getItem("senseless_player_id");
    if (!localId) {
      router.replace("/");
      return;
    }
    setPlayerId(localId);

    const loadResolutionData = async () => {
      const { data: room } = await supabase.from("rooms").select("current_prompt_id, host_id").eq("room_code", code).single();
      if (!room) return;
      setHostId(room.host_id);

      if (room.current_prompt_id) {
        const { data: promptData } = await supabase.from("prompts").select("*").eq("id", room.current_prompt_id).single();
        if (promptData) setPrompt(promptData as Prompt);
      }

      const { data: playersData } = await supabase
        .from("players")
        .select("id, player_name, is_imposter, voted_for, room_code, current_clue, assigned_sense")
        .eq("room_code", code);

      if (!playersData) return;
      
      const typedPlayers = playersData as ResolutionPlayer[];
      setPlayers(typedPlayers);
      
      const foundImposter = typedPlayers.find((p) => p.is_imposter);
      setImposter(foundImposter || null);

      if (foundImposter) {
        const voteCounts: Record<string, number> = {};
        typedPlayers.forEach((p) => {
          if (p.voted_for) voteCounts[p.voted_for] = (voteCounts[p.voted_for] || 0) + 1;
        });

        const maxVotes = Math.max(...Object.values(voteCounts), 0);
        const peopleWithMaxVotes = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);
        
        const caught = peopleWithMaxVotes.length === 1 && peopleWithMaxVotes[0] === foundImposter.id;
        setIsCaught(caught);
      }

      // Extract and shuffle the votes for the blind reveal sequence
      const votes = typedPlayers
        .filter(p => p.voted_for)
        .map(p => ({ voterName: p.player_name, targetId: p.voted_for as string }));
      
      setValidVotes(votes.sort(() => Math.random() - 0.5));
      setRevealPhase("tallying");
    };

    loadResolutionData();

    const channel = supabase
      .channel(`resolution_${code}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `room_code=eq.${code}` },
        (payload) => {
          const newStatus = payload.new.game_status as string;
          if (newStatus === "lobby") {
            router.push(`/room/${code}`);
          } else if (newStatus === "game_over") {
            router.push(`/room/${code}/game-over`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, router]);

  // --- THE TENSION BUILDER (Tallying Sequence) ---
  useEffect(() => {
    if (revealPhase !== "tallying" || validVotes.length === 0) return;

    if (shownVotes.length < validVotes.length) {
      // Drop a vote every 1.2 seconds
      const timer = setTimeout(() => {
        playSFX("ui_splat");
        setShownVotes(prev => [...prev, validVotes[prev.length]]);
      }, 1200);
      return () => clearTimeout(timer);
    } else if (shownVotes.length === validVotes.length) {
      // All votes cast. Pause, then trigger the drumroll.
      const timer = setTimeout(() => {
        setRevealPhase("drumroll");
        playSFX("res_drumroll");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [shownVotes.length, validVotes.length, revealPhase, playSFX]);

  // Transition from drumroll to final reveal
  useEffect(() => {
    if (revealPhase === "drumroll") {
      const timer = setTimeout(() => {
        setRevealPhase("revealed");
      }, 2500); // Wait for the drumroll sound to peak
      return () => clearTimeout(timer);
    }
  }, [revealPhase]);

  // Play the caught/escaped sound immediately upon reveal
  useEffect(() => {
    if (revealPhase === "revealed" && isCaught !== null && !hasPlayedReveal) {
      if (isCaught) playSFX("res_caught");
      else playSFX("res_escaped");
      setHasPlayedReveal(true);
    }
  }, [revealPhase, isCaught, hasPlayedReveal, playSFX]);

  // --- STEAL MECHANIC SOUNDS ---
  useEffect(() => {
    if (revealPhase === "revealed" && isCaught && stealResult === "pending" && !hasPlayedStealAlarm) {
      const t = setTimeout(() => {
        playSFX("steal_alarm");
        setHasPlayedStealAlarm(true);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [revealPhase, isCaught, stealResult, hasPlayedStealAlarm, playSFX]);

  useEffect(() => {
    if (stealResult !== "pending" && !hasPlayedStealResult) {
      if (stealResult === "success") playSFX("steal_success");
      if (stealResult === "failed") playSFX("steal_fail");
      setHasPlayedStealResult(true);
    }
  }, [stealResult, hasPlayedStealResult, playSFX]);

  const handleStealAttempt = async () => {
    if (!imposter || !prompt || isFinalizing) return;
    
    playSFX("ui_splat");
    setIsFinalizing(true);

    let success = false;
    const guess = stealGuess.trim().toLowerCase();
    const validAnswers = [prompt.true_target.toLowerCase(), ...prompt.true_synonyms.map(s => s.toLowerCase())];

    for (const answer of validAnswers) {
      const distance = levenshtein.get(guess, answer);
      if (distance <= 2) {
        success = true;
        break;
      }
    }

    setStealResult(success ? "success" : "failed");
    
    try {
      await finalizeRoundAction(code, imposter.id, true, success);
    } catch (error) {
      console.error("Failed to finalize steal:", error);
      setIsFinalizing(false);
    }
  };

  const handleHostContinue = async () => {
    if (!imposter || isFinalizing) return;
    
    playSFX("ui_splat");
    setIsFinalizing(true);
    
    try {
      await finalizeRoundAction(code, imposter.id, false, false);
    } catch (error) {
      console.error("Failed to continue:", error);
      setIsFinalizing(false);
    }
  };

  const getRoundScore = (p: ResolutionPlayer) => {
    let roundScore = 0;
    if (p.is_imposter) {
      if (!isCaught) roundScore += 2;
      if (isCaught && stealResult === "success") roundScore += 2;
    } else {
      if (p.voted_for === imposter?.id && stealResult !== "success") roundScore += 1;
      const votesAgainstThem = players.filter(voter => voter.voted_for === p.id).length;
      if (votesAgainstThem > 0) roundScore -= 1;
    }
    return roundScore;
  };

  if (!imposter || isCaught === null || revealPhase === "loading") {
    return (
      <MeatSackLoader className="flex items-center justify-center flex-grow min-h-full">
        <div className="font-display text-4xl text-bruise-purple text-outline text-white uppercase">
          Tallying Votes...
        </div>
      </MeatSackLoader>
    );
  }

  const isMeImposter = playerId === imposter.id;
  const isHost = playerId === hostId;

  const revealVariants: Variants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { scale: 1, opacity: 1 }
  };

  const stampVariants: Variants = {
    hidden: { scale: 3, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1, 
      transition: { type: "spring", stiffness: 300, damping: 10, delay: 0.5 } 
    }
  };

  const escapeVariants: Variants = {
    hidden: { y: -50, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { type: "spring", stiffness: 200, damping: 15, delay: 0.5 } 
    }
  };

  // --- RENDER THE BLIND TALLYING SCREEN ---
  if (revealPhase === "tallying" || revealPhase === "drumroll") {
    return (
      <GrossOutContainer>
        <div className="flex flex-col flex-grow min-h-full p-4 text-center justify-center">
          <motion.h1 
            animate={revealPhase === "drumroll" ? { y: [-5, 5, -5, 5, 0], x: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.1, repeat: revealPhase === "drumroll" ? Infinity : 0 }}
            className="font-display text-5xl text-warning-yellow text-outline drop-shadow-chunky uppercase mb-8 leading-none"
          >
            <BumpyText text={revealPhase === "drumroll" ? "THE TRUTH IS..." : "TALLYING VOTES..."} />
          </motion.h1>
          
          <div className="flex flex-col gap-3 w-full max-w-[350px] mx-auto">
            {players.map(p => {
              const votesReceived = shownVotes.filter(v => v.targetId === p.id);
              // Gently pulse the box if they are actively receiving votes
              return (
                <motion.div 
                  key={p.id}
                  animate={votesReceived.length > 0 ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <SlimeBox color="purple" className="!min-h-[80px] !p-4 relative overflow-hidden">
                    <div className="flex justify-between items-center w-full z-10 relative">
                      <span className="font-display text-3xl text-white text-outline leading-none text-left truncate pr-2">
                        {p.player_name}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        <AnimatePresence>
                          {votesReceived.map((v, i) => (
                            <motion.div
                              key={i}
                              initial={{ scale: 0, rotate: -45, opacity: 0 }}
                              animate={{ scale: 1, rotate: Math.random() * 20 - 10, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            >
                              <GameIcon type="splat" size={35} className="drop-shadow-chunky" />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  </SlimeBox>
                </motion.div>
              );
            })}
          </div>
        </div>
      </GrossOutContainer>
    );
  }

  // --- RENDER THE FINAL REVEAL (AUTOPSY) ---
  return (
    <ScreenShake trigger={isCaught && revealPhase === "revealed"}>
      <GrossOutContainer delay={0.1}>
        <div className="flex flex-col flex-grow min-h-full p-4 text-center overflow-y-auto pb-8">
          
          <div className="mt-4 space-y-2 border-b-8 border-bruise-purple pb-6 shrink-0 relative">
            <p className="font-sans text-bruise-purple/70 font-black uppercase tracking-widest text-xs">The Imposter Was</p>
            <SlimeBox color={isCaught ? "pink" : "yellow"} className="min-h-[160px] z-10">
              <div className="flex flex-col items-center gap-2">
                <GameIcon type="imposter" size={80} />
                <motion.h1 
                  variants={revealVariants}
                  initial="hidden"
                  animate="visible"
                  className="font-display text-5xl drop-shadow-chunky leading-none text-white text-outline"
                >
                  <BumpyText text={imposter.player_name} />
                </motion.h1>
              </div>
            </SlimeBox>

            {isCaught ? (
              <motion.div 
                variants={stampVariants}
                initial="hidden"
                animate="visible"
                className="bg-toxic-green text-white text-outline font-display text-5xl py-2 px-6 rounded-xl shadow-chunky inline-block transform rotate-2 border-4 border-bruise-purple -mt-8 relative z-20"
              >
                <BumpyText text="CAUGHT!" />
              </motion.div>
            ) : (
              <motion.div 
                variants={escapeVariants}
                initial="hidden"
                animate="visible"
                className="bg-fleshy-pink text-white text-outline font-display text-5xl py-2 px-6 rounded-xl shadow-chunky inline-block transform -rotate-2 border-4 border-bruise-purple -mt-8 relative z-20"
              >
                <BumpyText text="ESCAPED!" />
              </motion.div>
            )}
          </div>

          {isCaught && stealResult === "pending" && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex flex-col justify-center gap-4 mt-6 shrink-0"
            >
              {isMeImposter ? (
                <>
                  <p className="font-sans text-bruise-purple font-black text-sm uppercase tracking-widest">
                    You were caught. Guess the target to steal the points!
                  </p>
                  
                  <SlimeBox color="blue" className="min-h-[100px]">
                    <span className="text-white font-black uppercase text-[10px] tracking-widest block mb-1 text-outline">Category Hint</span>
                    <p className="font-display text-4xl text-white leading-none text-outline">{prompt?.category}</p>
                  </SlimeBox>

                  <input
                    type="text"
                    placeholder="EXACT TARGET..."
                    value={stealGuess}
                    onChange={(e) => setStealGuess(e.target.value)}
                    disabled={isFinalizing}
                    className="w-full bg-white text-bruise-purple font-display text-4xl text-center py-4 rounded-xl border-8 border-bruise-purple focus:outline-none focus:border-fleshy-pink shadow-chunky uppercase disabled:opacity-50 transition-colors"
                  />
                  
                  <SlimeBox 
                    color="orange" 
                    onClick={handleStealAttempt} 
                    disabled={isFinalizing || stealGuess.length < 2}
                    className="!min-h-[100px] mt-2 cursor-pointer"
                  >
                    <span className="font-display text-4xl text-white text-outline uppercase">
                      {isFinalizing ? "Checking..." : "Attempt Steal"}
                    </span>
                  </SlimeBox>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 mt-8">
                  <GameIcon type="alarm" size={120} className="animate-bounce" />
                  <p className="font-display text-4xl text-white text-outline drop-shadow-chunky uppercase">
                    {imposter.player_name} is stealing...
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {(stealResult !== "pending" || !isCaught) && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="flex flex-col gap-6 mt-4 w-full"
            >
              <SlimeBox color={stealResult === "success" ? "orange" : "purple"} className="min-h-[140px] shrink-0">
                {isCaught ? (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <p className="font-display text-4xl text-white text-outline leading-none uppercase">
                      {stealResult === "success" ? "Steal Successful!" : "Steal Failed!"}
                    </p>
                    <p className="font-sans font-black text-[10px] text-white text-outline uppercase tracking-widest">
                      True Target: <span className="text-toxic-green text-sm block mt-1">{prompt?.true_target}</span>
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <p className="font-display text-4xl text-white text-outline leading-tight uppercase">
                      The Imposter Survives!
                    </p>
                    <p className="font-sans font-black text-[10px] text-white text-outline uppercase tracking-widest mt-2">
                      True Target: <span className="text-toxic-green text-sm block mt-1">{prompt?.true_target}</span>
                    </p>
                  </div>
                )}
              </SlimeBox>

              <div className="mt-4 text-left w-full">
                <h3 className="font-display text-4xl text-fleshy-pink text-outline text-white mb-4 text-center drop-shadow-chunky">
                  <BumpyText text="THE AUTOPSY" />
                </h3>
                <div className="flex flex-col gap-4">
                  {players.map(p => {
                    const voters = players.filter(voter => voter.voted_for === p.id);
                    const delta = getRoundScore(p);
                    const deltaText = delta > 0 ? `+${delta}` : `${delta}`;
                    const deltaColor = delta > 0 ? "text-toxic-green" : delta < 0 ? "text-fleshy-pink" : "text-white/50";

                    return (
                      <div key={p.id} className={`p-4 rounded-xl border-4 border-bruise-purple shadow-chunky bg-white relative ${p.is_imposter ? 'ring-4 ring-warning-yellow' : ''}`}>
                        <div className="flex justify-between items-start mb-2 border-b-2 border-bruise-purple/10 pb-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                               <span className="font-display text-2xl text-bruise-purple leading-none">
                                {p.player_name}
                              </span>
                              {p.is_imposter && <GameIcon type="imposter" size={25} />}
                            </div>
                            <span className={`font-display text-xl mt-1 drop-shadow-chunky text-outline ${deltaColor}`}>
                              {deltaText} PTS
                            </span>
                          </div>
                          <GameIcon type={senseToIcon[p.assigned_sense || "Sight"]} size={40} />
                        </div>
                        <p className="font-sans text-sm font-bold text-bruise-purple italic">
                          "{p.current_clue}"
                        </p>
                        
                        {voters.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2 items-center">
                            <GameIcon type="splat" size={20} />
                            <p className="font-sans text-[10px] text-fleshy-pink font-black uppercase tracking-tighter">
                              Voted by: <span className="text-bruise-purple ml-1">{voters.map(v => v.player_name).join(", ")}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {isHost && (
                 <div className="sticky bottom-4 pt-4 mt-4 w-full">
                   <SlimeBox 
                     color="yellow" 
                     onClick={handleHostContinue} 
                     disabled={isFinalizing}
                     className="!min-h-[100px] cursor-pointer"
                   >
                     <span className="font-display text-4xl text-white text-outline uppercase">
                       {isFinalizing ? "Resetting..." : "Continue"}
                     </span>
                   </SlimeBox>
                 </div>
              )}
            </motion.div>
          )}
        </div>
      </GrossOutContainer>
    </ScreenShake>
  );
}