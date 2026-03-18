"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { Player, Room } from "@/src/types/database";
import { startGameAction } from "@/src/app/actions/game";
import { closeRoomAction, updateSettingsAction, playAgainAction } from "@/src/app/actions/lobby";
import { motion, AnimatePresence } from "framer-motion";
import { GrossOutContainer } from "@/src/components/GrossOutContainer";

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
          router.replace("/"); // Host nuked the room, send everyone home
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
        <h1 className="font-display text-5xl text-warning-yellow drop-shadow-chunky">ROOM CLOSED</h1>
        <p className="font-sans text-white text-xl">{errorMsg}</p>
        <button onClick={() => router.replace("/")} className="bg-fleshy-pink text-white font-display text-3xl px-8 py-3 rounded-xl shadow-chunky">Go Home</button>
      </div>
    );
  }

  if (!room || !currentPlayerId) {
    return <div className="flex items-center justify-center h-full font-display text-4xl text-toxic-green animate-pulse">CONNECTING...</div>;
  }

  const isHost = room.host_id === currentPlayerId;
  const canStart = players.length >= 3;
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  // Dynamic Win Condition Logic
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

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300 } }
  };

  return (
    <GrossOutContainer>
      <div className="flex flex-col h-full p-6 relative">
        {/* Header Area */}
        <div className="text-center mb-6 mt-4">
          <p className="font-sans text-warning-yellow font-bold uppercase tracking-widest text-sm mb-1">Room Code</p>
          <motion.h1 
            initial={{ scale: 0.5, rotate: -2 }}
            animate={{ scale: 1, rotate: 0 }}
            className="font-display text-7xl text-white tracking-widest drop-shadow-chunky leading-none"
          >
            {code}
          </motion.h1>
          <p className="font-sans text-fleshy-pink font-bold uppercase tracking-widest text-xs mt-3">
            {room.round_settings.mode === 'rounds' 
              ? `Round ${room.current_round} / ${room.round_settings.target}` 
              : `First to ${room.round_settings.target} PTS`}
          </p>
        </div>

        {/* Player List */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex-grow flex flex-col gap-4 overflow-y-auto pb-4"
        >
          <h2 className="font-display text-3xl text-fleshy-pink border-b-4 border-fleshy-pink pb-2 flex justify-between items-center">
            <span>Meat-Sacks</span>
            {isHost && (
              <button 
                onClick={() => setShowSettings(!showSettings)} 
                className="text-sm bg-white text-bruise-purple px-3 py-1 rounded shadow-chunky transition-transform active:scale-90 font-bold"
              >
                SETTINGS
              </button>
            )}
          </h2>
          
          {sortedPlayers.map((player) => (
            <motion.div 
              variants={itemVariants}
              key={player.id} 
              className={`p-4 rounded-xl border-4 shadow-chunky flex justify-between items-center transition-colors ${
                player.id === currentPlayerId 
                  ? "bg-toxic-green border-bruise-purple text-bruise-purple" 
                  : "bg-white border-bruise-purple text-bruise-purple"
              }`}
            >
              <div className="flex flex-col">
                <span className="font-sans font-bold text-2xl truncate max-w-[180px]">
                  {player.player_name} {player.id === room.host_id && "👑"}
                </span>
                {player.id === currentPlayerId && (
                  <span className="text-xs opacity-80 uppercase font-black tracking-tighter">(You)</span>
                )}
              </div>
              <div className="text-right">
                <span className="font-display text-4xl block leading-none text-fleshy-pink">{player.score}</span>
                <span className="font-sans text-xs font-bold uppercase opacity-60">PTS</span>
              </div>
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
              className="absolute inset-x-6 bottom-24 bg-bruise-purple border-4 border-warning-yellow p-6 rounded-2xl z-50 shadow-2xl space-y-4"
            >
              <h3 className="font-display text-3xl text-warning-yellow text-center uppercase tracking-widest">Game Config</h3>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleUpdateSettings('rounds', 5)} 
                  className={`flex-1 py-2 font-bold rounded-lg border-2 transition-colors ${room.round_settings.mode === 'rounds' ? 'bg-warning-yellow text-bruise-purple border-white' : 'border-warning-yellow text-warning-yellow'}`}
                >
                  ROUNDS
                </button>
                <button 
                  onClick={() => handleUpdateSettings('score', 10)} 
                  className={`flex-1 py-2 font-bold rounded-lg border-2 transition-colors ${room.round_settings.mode === 'score' ? 'bg-warning-yellow text-bruise-purple border-white' : 'border-warning-yellow text-warning-yellow'}`}
                >
                  SCORE
                </button>
              </div>

              <div className="flex items-center justify-between bg-dark-void p-3 rounded-xl border-2 border-white/20">
                <button 
                  onClick={() => handleUpdateSettings(room.round_settings.mode, Math.max(1, room.round_settings.target - 1))} 
                  className="text-4xl font-display text-fleshy-pink px-4 active:scale-75"
                >-</button>
                <span className="font-display text-4xl text-white">{room.round_settings.target}</span>
                <button 
                  onClick={() => handleUpdateSettings(room.round_settings.mode, room.round_settings.target + 1)} 
                  className="text-4xl font-display text-toxic-green px-4 active:scale-75"
                >+</button>
              </div>

              <button 
                onClick={handleNukeRoom} 
                className="w-full bg-red-600 text-white font-display text-2xl py-2 rounded-xl border-4 border-bruise-purple shadow-chunky transition-transform active:scale-95"
              >
                NUKE LOBBY
              </button>
              
              <button onClick={() => setShowSettings(false)} className="w-full text-white/50 font-bold uppercase text-xs tracking-widest">Close Settings</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Footer */}
        <div className="mt-auto pt-6 border-t-4 border-dark-void">
          {isGameOver ? (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="space-y-4">
              <div className="text-center animate-bounce">
                <p className="font-display text-5xl text-toxic-green drop-shadow-chunky uppercase">Winner: {sortedPlayers[0].player_name}</p>
              </div>
              {isHost && (
                <button 
                  onClick={handlePlayAgain} 
                  className="w-full bg-warning-yellow text-bruise-purple font-display text-4xl py-4 rounded-xl shadow-chunky border-4 border-bruise-purple transition-transform active:scale-95"
                >
                  PLAY AGAIN
                </button>
              )}
            </motion.div>
          ) : isHost ? (
            <button 
              onClick={handleStartGame} 
              disabled={!canStart || isStarting}
              className={`w-full font-display text-4xl py-4 rounded-xl border-4 border-bruise-purple transition-all ${
                canStart && !isStarting 
                  ? "bg-toxic-green text-bruise-purple shadow-chunky active:translate-y-1 active:shadow-none" 
                  : "bg-gray-500 text-gray-300 opacity-50 cursor-not-allowed"
              }`}
            >
              {isStarting ? "DEALING..." : room.current_round === 0 ? "START GAME" : "NEXT ROUND"}
            </button>
          ) : (
            <div className="w-full text-center bg-dark-void border-4 border-fleshy-pink text-fleshy-pink font-display text-3xl py-4 rounded-xl animate-pulse">
              WAITING FOR HOST...
            </div>
          )}
        </div>
      </div>
    </GrossOutContainer>
  );
}