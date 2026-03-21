// src/app/room/[code]/page.tsx
"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { Player, Room } from "@/src/types/database";
import { startGameAction } from "@/src/app/actions/game";
import { closeRoomAction, updateSettingsAction, playAgainAction } from "@/src/app/actions/lobby";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { GrossOutContainer } from "@/src/components/GrossOutContainer";
import { SlimeBox } from "@/src/components/SlimeBox";
import { MeatSackLoader } from "@/src/components/MeatSackLoader";
import { GameIcon } from "@/src/components/GameIcon";
import Image from "next/image";
import { useAudio } from "@/src/components/AudioProvider";

export default function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { playSFX } = useAudio();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // New state to hold the slider value while dragging so we don't spam the database
  const [tempTarget, setTempTarget] = useState<number | null>(null);

  const prevPlayerCount = useRef(0);

  useEffect(() => {
    const localId = localStorage.getItem("senseless_player_id");
    if (!localId) {
      router.replace("/");
      return;
    }
    setCurrentPlayerId(localId);

    const fetchInitialState = async () => {
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", code)
        .single();

      if (roomError || !roomData) {
        setErrorMsg("Room collapsed or closed by host.");
        return;
      }
      setRoom(roomData as Room);

      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .eq("room_code", code)
        .order("player_name");

      if (playersData) {
        const typedPlayers = playersData as Player[];
        setPlayers(typedPlayers);
        prevPlayerCount.current = typedPlayers.length;
      }
    };

    fetchInitialState();

    const channel = supabase
      .channel(`room_${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_code=eq.${code}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPlayers((prev) => {
              const newPlayer = payload.new as Player;
              if (prev.some(p => p.id === newPlayer.id)) return prev;
              
              const newPlayersList = [...prev, newPlayer];
              if (newPlayersList.length > prevPlayerCount.current) {
                playSFX("lobby_join");
              }
              prevPlayerCount.current = newPlayersList.length;
              return newPlayersList.sort((a, b) => a.player_name.localeCompare(b.player_name));
            });
          } else if (payload.eventType === "UPDATE") {
            setPlayers((prev) =>
              prev.map((p) => (p.id === payload.new.id ? { ...p, ...(payload.new as Player) } : p))
            );
          } else if (payload.eventType === "DELETE") {
            setPlayers((prev) => {
              const remaining = prev.filter((p) => p.id !== payload.old.id);
              prevPlayerCount.current = remaining.length;
              return remaining;
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `room_code=eq.${code}` },
        (payload) => {
          const updatedRoom = payload.new as Room;
          setRoom(updatedRoom);
          if (updatedRoom.game_status === "writing") {
            router.push(`/room/${code}/writing`);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "rooms", filter: `room_code=eq.${code}` },
        () => {
          router.replace("/");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, router, playSFX]);

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow min-h-full p-6 text-center space-y-6">
        <h1 className="font-display text-5xl text-fleshy-pink text-outline drop-shadow-chunky text-balance">ROOM CLOSED</h1>
        <p className="font-sans text-bruise-purple font-bold text-xl">{errorMsg}</p>
        <button onClick={() => router.replace("/")} className="bg-bruise-purple text-toxic-green font-display text-3xl px-8 py-3 rounded-xl shadow-chunky transition-transform active:scale-95">Go Home</button>
      </div>
    );
  }

  if (!room || !currentPlayerId) {
    return (
      <MeatSackLoader className="flex items-center justify-center flex-grow min-h-full">
        <div className="font-display text-4xl text-fleshy-pink text-outline drop-shadow-chunky">
          CONNECTING...
        </div>
      </MeatSackLoader>
    );
  }

  const isHost = room.host_id === currentPlayerId;
  const canStart = players.length >= 3;
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const isGameOver = room.round_settings.mode === "rounds" 
    ? room.current_round >= room.round_settings.target && room.current_round > 0
    : sortedPlayers.length > 0 && sortedPlayers[0].score >= room.round_settings.target;

  const handleStartGame = async () => {
    if (!isHost || !canStart || isStarting || !currentPlayerId) return;
    playSFX("lobby_start");
    setIsStarting(true);
    const result = await startGameAction(code, currentPlayerId);
    if (!result.success) {
      setErrorMsg(result.error || "Failed to start.");
      setIsStarting(false);
    }
  };

  const handleUpdateSettings = async (mode: 'rounds' | 'score', val: number, timerEnabled?: boolean) => {
    if (!isHost || !currentPlayerId) return;
    await updateSettingsAction(code, currentPlayerId, mode, val, timerEnabled);
  };

  const handlePlayAgain = async () => {
    if (!isHost || !currentPlayerId) return;
    playSFX("lobby_start");
    await playAgainAction(code, currentPlayerId);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempTarget(Number(e.target.value));
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10); 
    }
  };

  const handleSliderCommit = async () => {
    if (tempTarget !== null && isHost && currentPlayerId) {
      playSFX("ui_squish");
      await handleUpdateSettings(room.round_settings.mode, tempTarget, room.round_settings.timer_enabled);
      setTempTarget(null);
    }
  };

  const handleTimerToggle = async () => {
    if (!isHost || !currentPlayerId) return;
    playSFX("ui_squish");
    // If undefined, assume it was true by default
    const currentTimerState = room.round_settings.timer_enabled !== false;
    await handleUpdateSettings(room.round_settings.mode, room.round_settings.target, !currentTimerState);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300 } }
  };

  const boxColors: ("blue" | "pink" | "purple" | "orange" | "green")[] = ["pink", "blue", "purple", "orange", "green"];

  return (
    <GrossOutContainer>
      <div className="flex flex-col flex-grow min-h-full p-4 relative">
        
        {/* Header Area */}
        <div className="text-center mb-2 mt-4 flex flex-col items-center">
          <motion.div
            animate={{ rotate: [-2, 2, -2], scale: [0.97, 1.03, 0.97] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="mb-2"
          >
            <Image 
              src="/Senseless Logo.png" 
              alt="Senseless Game Logo" 
              width={260} 
              height={100} 
              className="drop-shadow-chunky"
              priority
            />
          </motion.div>
          
          <SlimeBox color="yellow" className="!min-h-[90px] -mt-4 !p-4">
            <p className="font-sans text-white font-black uppercase tracking-widest text-xs text-outline mb-1">Room Code</p>
            <motion.h1 
              initial={{ scale: 0.5, rotate: -2 }}
              animate={{ scale: 1, rotate: 0 }}
              className="font-display text-5xl text-white tracking-widest leading-none text-outline"
            >
              {code}
            </motion.h1>
            <p className="font-sans text-white font-bold uppercase tracking-widest text-[10px] mt-1 text-outline">
              {room.round_settings.mode === 'rounds' 
                ? `Round ${room.current_round} / ${room.round_settings.target}` 
                : `First to ${room.round_settings.target} PTS`}
            </p>
          </SlimeBox>
        </div>

        {/* Player List */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex-grow flex flex-col gap-2 overflow-y-auto pb-4 px-2"
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-display text-3xl text-white text-outline drop-shadow-chunky">
              Meat-Sacks
            </h2>
            {isHost && (
              <button 
                onClick={() => {
                  playSFX("ui_squish");
                  setShowSettings(!showSettings);
                }} 
                className="text-xs bg-bruise-purple text-white px-3 py-2 rounded-xl shadow-chunky transition-transform active:scale-90 font-bold uppercase"
              >
                {showSettings ? "CLOSE" : "CONFIG"}
              </button>
            )}
          </div>

          {/* New Interactive Config Panel */}
          <AnimatePresence>
            {showSettings && isHost && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <SlimeBox color="purple" className="!p-4 flex flex-col gap-4">
                  
                  {/* Mode Selector */}
                  <div>
                    <p className="font-sans text-white font-black uppercase tracking-widest text-[10px] text-outline mb-2 text-left">
                      Win Condition
                    </p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { 
                          playSFX("ui_squish"); 
                          handleUpdateSettings('rounds', room.round_settings.mode === 'rounds' ? room.round_settings.target : 3, room.round_settings.timer_enabled); 
                        }}
                        className={`flex-1 font-display text-2xl py-2 rounded-xl border-4 transition-colors shadow-chunky ${room.round_settings.mode === 'rounds' ? 'bg-toxic-green border-white text-bruise-purple' : 'bg-bruise-purple border-bruise-purple text-white/50 shadow-none'}`}
                      >
                        ROUNDS
                      </button>
                      <button 
                        onClick={() => { 
                          playSFX("ui_squish"); 
                          handleUpdateSettings('score', room.round_settings.mode === 'score' ? room.round_settings.target : 10, room.round_settings.timer_enabled); 
                        }}
                        className={`flex-1 font-display text-2xl py-2 rounded-xl border-4 transition-colors shadow-chunky ${room.round_settings.mode === 'score' ? 'bg-toxic-green border-white text-bruise-purple' : 'bg-bruise-purple border-bruise-purple text-white/50 shadow-none'}`}
                      >
                        SCORE
                      </button>
                    </div>
                  </div>

                  {/* Tactile Slider */}
                  <div className="bg-bruise-purple/50 p-3 rounded-xl border-2 border-white/10">
                    <div className="flex justify-between items-end mb-2">
                      <label className="font-sans text-white font-bold text-xs uppercase tracking-widest text-outline">
                        {room.round_settings.mode === 'rounds' ? 'Total Rounds' : 'Target Points'}
                      </label>
                      <motion.span 
                        key={tempTarget}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        className="font-display text-4xl text-fleshy-pink text-outline leading-none drop-shadow-chunky"
                      >
                        {tempTarget !== null ? tempTarget : room.round_settings.target}
                      </motion.span>
                    </div>
                    <input 
                      type="range"
                      min="1"
                      max={room.round_settings.mode === 'rounds' ? "10" : "20"}
                      step="1"
                      value={tempTarget !== null ? tempTarget : room.round_settings.target}
                      onChange={handleSliderChange}
                      onMouseUp={handleSliderCommit}
                      onTouchEnd={handleSliderCommit}
                      className="w-full h-4 bg-bruise-purple rounded-full appearance-none outline-none cursor-pointer accent-[#FF007F] shadow-inner"
                    />
                  </div>

                  {/* ADDED: Timer Toggle */}
                  <div className="bg-bruise-purple/50 p-3 rounded-xl border-2 border-white/10 flex justify-between items-center">
                     <label className="font-sans text-white font-bold text-xs uppercase tracking-widest text-outline">
                        Round Timers
                      </label>
                      <button 
                        onClick={handleTimerToggle}
                        className={`font-display text-2xl px-6 py-1 rounded-xl border-4 transition-colors shadow-chunky ${room.round_settings.timer_enabled !== false ? 'bg-toxic-green border-white text-bruise-purple' : 'bg-fleshy-pink border-white text-white'}`}
                      >
                        {room.round_settings.timer_enabled !== false ? "ON" : "OFF"}
                      </button>
                  </div>

                </SlimeBox>
              </motion.div>
            )}
          </AnimatePresence>
          
          {sortedPlayers.map((player, idx) => (
            <motion.div variants={itemVariants} key={player.id}>
              <SlimeBox 
                color={player.id === currentPlayerId ? "yellow" : boxColors[idx % boxColors.length]}
                className="!min-h-[80px] !p-4"
              >
                <div className="flex justify-between items-center w-full text-white">
                  <div className="flex items-center gap-3">
                    {player.id === room.host_id && (
                       <GameIcon type="crown" size={40} className="drop-shadow-sm" />
                    )}
                    <div className="flex flex-col text-left">
                      <span className="font-display text-2xl text-white text-outline truncate max-w-[150px] leading-none">
                        {player.player_name}
                      </span>
                      {player.id === currentPlayerId && (
                        <span className="text-[10px] text-white text-outline uppercase font-black tracking-tighter mt-1">(You)</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-white relative">
                    {/* Score Delta Animation */}
                    <AnimatePresence>
                      {player.last_score_delta !== null && player.last_score_delta !== 0 && room.current_round > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20, scale: 0.5, rotate: -15 }}
                          animate={{ opacity: 1, y: -10, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10, delay: 0.5 + (idx * 0.1) }}
                          className={`absolute -left-10 -top-2 font-display text-4xl text-outline drop-shadow-chunky ${
                            player.last_score_delta > 0 ? "text-toxic-green" : "text-fleshy-pink"
                          }`}
                        >
                          {player.last_score_delta > 0 ? "+" : ""}{player.last_score_delta}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <span className="font-display text-3xl block leading-none text-outline">{player.score}</span>
                    <span className="font-sans text-[10px] font-black uppercase opacity-90 text-white text-outline block mt-1">PTS</span>
                  </div>
                </div>
              </SlimeBox>
            </motion.div>
          ))}
        </motion.div>

        {/* Action Footer */}
        <div className="mt-auto pt-2">
          {isGameOver ? (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="space-y-2">
              <div className="text-center flex items-center justify-center gap-3">
                <GameIcon type="imposter" size={50} className="animate-bounce" />
                <p className="font-display text-3xl text-fleshy-pink text-outline drop-shadow-chunky uppercase">Winner: {sortedPlayers[0]?.player_name}</p>
              </div>
              {isHost && (
                <SlimeBox color="yellow" onClick={handlePlayAgain} className="!min-h-[90px] !p-4 cursor-pointer">
                   <span className="font-display text-4xl text-white text-outline leading-none uppercase">Play Again</span>
                </SlimeBox>
              )}
            </motion.div>
          ) : isHost ? (
             <SlimeBox 
               color="blue" 
               onClick={handleStartGame} 
               disabled={!canStart || isStarting}
               className="!min-h-[90px] !p-4 cursor-pointer"
             >
                <span className="font-display text-3xl text-white text-outline tracking-wider leading-none uppercase">
                  {isStarting ? "DEALING..." : room.current_round === 0 ? "START GAME" : "NEXT ROUND"}
                </span>
             </SlimeBox>
          ) : (
            <MeatSackLoader>
              <SlimeBox color="pink" className="!min-h-[90px] !p-4">
                 <span className="font-display text-2xl text-white text-outline leading-none tracking-wider uppercase">Waiting for Host...</span>
              </SlimeBox>
            </MeatSackLoader>
          )}
        </div>
      </div>
    </GrossOutContainer>
  );
}