"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { Player, Room } from "@/src/types/database";
import { startGameAction } from "@/src/app/actions/game";
import { closeRoomAction, updateSettingsAction, playAgainAction } from "@/src/app/actions/lobby";
import { motion, AnimatePresence } from "framer-motion";
import { GrossOutContainer } from "@/src/components/GrossOutContainer";
import { SlimeBox } from "@/src/components/SlimeBox";
import Image from "next/image";

export default function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
        .eq("room_code", code);

      if (playersData) setPlayers(playersData as Player[]);
    };

    fetchInitialState();

    const channel = supabase
      .channel(`room_${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_code=eq.${code}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPlayers((prev) => [...prev, payload.new as Player]);
          } else if (payload.eventType === "UPDATE") {
            setPlayers((prev) =>
              prev.map((p) => (p.id === payload.new.id ? (payload.new as Player) : p))
            );
          } else if (payload.eventType === "DELETE") {
            setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
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
  }, [code, router]);

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-6">
        <h1 className="font-display text-5xl text-fleshy-pink drop-shadow-chunky text-balance">ROOM CLOSED</h1>
        <p className="font-sans text-bruise-purple font-bold text-xl">{errorMsg}</p>
        <button onClick={() => router.replace("/")} className="bg-bruise-purple text-toxic-green font-display text-3xl px-8 py-3 rounded-xl shadow-chunky">Go Home</button>
      </div>
    );
  }

  if (!room || !currentPlayerId) {
    return <div className="flex items-center justify-center h-full font-display text-4xl text-fleshy-pink animate-pulse">CONNECTING...</div>;
  }

  const isHost = room.host_id === currentPlayerId;
  const canStart = players.length >= 3;
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const isGameOver = room.round_settings.mode === "rounds" 
    ? room.current_round >= room.round_settings.target && room.current_round > 0
    : sortedPlayers[0]?.score >= room.round_settings.target;

  const handleStartGame = async () => {
    if (!isHost || !canStart || isStarting) return;
    setIsStarting(true);
    const result = await startGameAction(code, currentPlayerId);
    if (!result.success) {
      setErrorMsg(result.error || "Failed to start.");
      setIsStarting(false);
    }
  };

  const handleNukeRoom = async () => {
    if (!isHost) return;
    await closeRoomAction(code, currentPlayerId);
  };

  const handleUpdateSettings = async (mode: 'rounds' | 'score', val: number) => {
    await updateSettingsAction(code, currentPlayerId, mode, val);
  };

  const handlePlayAgain = async () => {
    await playAgainAction(code, currentPlayerId);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300 } }
  };

  // Cycle colors for player boxes
  const boxColors: ("blue" | "pink" | "purple" | "orange")[] = ["pink", "blue", "purple", "orange"];

  return (
    <GrossOutContainer>
      <div className="flex flex-col h-full p-4 relative">
        
        {/* Header Area with Logo */}
        <div className="text-center mb-2 mt-4 flex flex-col items-center">
          <Image 
            src="/Senseless Logo.jpg" 
            alt="Senseless Game Logo" 
            width={280} 
            height={100} 
            className="mix-blend-multiply mb-2"
            priority
          />
          
          <SlimeBox color="yellow" className="min-h-[100px] -mt-4">
            <p className="font-sans text-bruise-purple font-black uppercase tracking-widest text-xs">Room Code</p>
            <motion.h1 
              initial={{ scale: 0.5, rotate: -2 }}
              animate={{ scale: 1, rotate: 0 }}
              className="font-display text-5xl text-bruise-purple tracking-widest leading-none"
            >
              {code}
            </motion.h1>
            <p className="font-sans text-bruise-purple font-bold uppercase tracking-widest text-[10px] mt-1">
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
            <h2 className="font-display text-4xl text-bruise-purple drop-shadow-chunky">
              Meat-Sacks
            </h2>
            {isHost && (
              <button 
                onClick={() => setShowSettings(!showSettings)} 
                className="text-xs bg-bruise-purple text-white px-3 py-2 rounded-xl shadow-chunky transition-transform active:scale-90 font-bold uppercase"
              >
                Config
              </button>
            )}
          </div>
          
          {sortedPlayers.map((player, idx) => (
            <motion.div variants={itemVariants} key={player.id}>
              <SlimeBox 
                color={player.id === currentPlayerId ? "yellow" : boxColors[idx % boxColors.length]}
                className="min-h-[90px] !p-4"
              >
                <div className="flex justify-between items-center w-full px-4 text-white">
                  <div className="flex flex-col text-left">
                    <span className={`font-display text-3xl truncate max-w-[160px] ${player.id === currentPlayerId ? "text-bruise-purple" : "text-white"}`}>
                      {player.player_name} {player.id === room.host_id && "👑"}
                    </span>
                    {player.id === currentPlayerId && (
                      <span className={`text-[10px] uppercase font-black tracking-tighter ${player.id === currentPlayerId ? "text-bruise-purple/70" : "text-white/70"}`}>(You)</span>
                    )}
                  </div>
                  <div className={`text-right ${player.id === currentPlayerId ? "text-bruise-purple" : "text-white"}`}>
                    <span className="font-display text-4xl block leading-none">{player.score}</span>
                    <span className="font-sans text-[10px] font-black uppercase opacity-80">PTS</span>
                  </div>
                </div>
              </SlimeBox>
            </motion.div>
          ))}
        </motion.div>

        {/* Host Settings Overlay */}
        <AnimatePresence>
          {showSettings && isHost && (
            <motion.div 
              initial={{ opacity: 0, y: 100 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 100 }} 
              className="absolute inset-x-4 bottom-24 bg-white border-8 border-bruise-purple p-6 rounded-3xl z-50 shadow-[8px_8px_0px_0px_rgba(255,0,127,1)] space-y-4"
            >
              <h3 className="font-display text-4xl text-bruise-purple text-center uppercase tracking-widest">Game Config</h3>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleUpdateSettings('rounds', 5)} 
                  className={`flex-1 py-2 font-display text-2xl rounded-xl border-4 transition-colors ${room.round_settings.mode === 'rounds' ? 'bg-fleshy-pink text-white border-bruise-purple shadow-chunky' : 'bg-white border-bruise-purple text-bruise-purple'}`}
                >
                  ROUNDS
                </button>
                <button 
                  onClick={() => handleUpdateSettings('score', 10)} 
                  className={`flex-1 py-2 font-display text-2xl rounded-xl border-4 transition-colors ${room.round_settings.mode === 'score' ? 'bg-fleshy-pink text-white border-bruise-purple shadow-chunky' : 'bg-white border-bruise-purple text-bruise-purple'}`}
                >
                  SCORE
                </button>
              </div>

              <div className="flex items-center justify-between bg-white p-3 rounded-xl border-4 border-bruise-purple shadow-chunky">
                <button 
                  onClick={() => handleUpdateSettings(room.round_settings.mode, Math.max(1, room.round_settings.target - 1))} 
                  className="text-5xl font-display text-bruise-purple px-4 active:scale-75 hover:text-fleshy-pink transition-colors"
                >-</button>
                <span className="font-display text-5xl text-bruise-purple">{room.round_settings.target}</span>
                <button 
                  onClick={() => handleUpdateSettings(room.round_settings.mode, room.round_settings.target + 1)} 
                  className="text-5xl font-display text-bruise-purple px-4 active:scale-75 hover:text-toxic-green transition-colors"
                >+</button>
              </div>

              <button 
                onClick={handleNukeRoom} 
                className="w-full bg-bruise-purple text-warning-yellow font-display text-3xl py-3 rounded-xl border-4 border-bruise-purple shadow-chunky transition-transform active:scale-95"
              >
                NUKE LOBBY
              </button>
              
              <button onClick={() => setShowSettings(false)} className="w-full text-bruise-purple/60 font-bold uppercase text-sm tracking-widest">Close Settings</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Footer */}
        <div className="mt-auto pt-2">
          {isGameOver ? (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="space-y-2">
              <div className="text-center animate-bounce">
                <p className="font-display text-4xl text-fleshy-pink drop-shadow-chunky uppercase">Winner: {sortedPlayers[0].player_name}</p>
              </div>
              {isHost && (
                <SlimeBox color="yellow" onClick={handlePlayAgain} className="!min-h-[100px]">
                   <span className="font-display text-4xl text-bruise-purple">PLAY AGAIN</span>
                </SlimeBox>
              )}
            </motion.div>
          ) : isHost ? (
             <SlimeBox 
               color="blue" 
               onClick={handleStartGame} 
               disabled={!canStart || isStarting}
               className="!min-h-[100px]"
             >
                <span className="font-display text-4xl text-white">
                  {isStarting ? "DEALING..." : room.current_round === 0 ? "START GAME" : "NEXT ROUND"}
                </span>
             </SlimeBox>
          ) : (
            <SlimeBox color="pink" className="!min-h-[100px] animate-pulse">
               <span className="font-display text-3xl text-white">WAITING FOR HOST...</span>
            </SlimeBox>
          )}
        </div>
      </div>
    </GrossOutContainer>
  );
}