"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GrossOutContainer } from "@/src/components/GrossOutContainer";
import { SlimeBox } from "@/src/components/SlimeBox";
import Image from "next/image";
import { hostGameAction, joinGameAction } from "@/src/app/actions/home";

export default function LandingPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleHost = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    setErrorMsg("");

    const result = await hostGameAction(name.trim());
    if (result.success && result.roomCode && result.playerId) {
      localStorage.setItem("senseless_player_id", result.playerId);
      router.push(`/room/${result.roomCode}`);
    } else {
      setErrorMsg(result.error || "Failed to host game.");
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim() || roomCode.trim().length !== 4) return;
    setIsLoading(true);
    setErrorMsg("");

    const result = await joinGameAction(name.trim(), roomCode.trim());
    if (result.success && result.roomCode && result.playerId) {
      localStorage.setItem("senseless_player_id", result.playerId);
      router.push(`/room/${result.roomCode}`);
    } else {
      setErrorMsg(result.error || "Failed to join game.");
      setIsLoading(false);
    }
  };

  return (
    <GrossOutContainer>
      <div className="flex flex-col h-full p-4 relative justify-center">
        
        {/* Animated Logo */}
        <div className="text-center mb-6 flex flex-col items-center">
          <motion.div
            animate={{ 
              rotate: [-2, 2, -2], 
              scale: [0.97, 1.03, 0.97] 
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          >
            <Image 
              src="/Senseless Logo.png" 
              alt="Senseless Game Logo" 
              width={260} 
              height={120} 
              className="drop-shadow-chunky"
              priority
            />
          </motion.div>
        </div>

        {errorMsg && (
          <div className="bg-warning-yellow text-bruise-purple font-bold p-3 rounded-xl text-center mb-4 border-4 border-bruise-purple shadow-chunky z-10 relative">
            {errorMsg}
          </div>
        )}

        <div className="space-y-3 z-10 relative">
          
          <SlimeBox color="pink" className="!min-h-[110px] !p-4">
            <p className="text-white font-black uppercase text-[10px] tracking-widest mb-1 text-outline">Meat-Sack Name</p>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="ENTER NAME..."
              disabled={isLoading}
              className="w-full bg-white text-bruise-purple font-display text-2xl text-center py-2 rounded-xl border-4 border-bruise-purple focus:outline-none focus:border-toxic-green uppercase placeholder:text-bruise-purple/30 disabled:opacity-50 transition-colors"
              maxLength={15}
            />
          </SlimeBox>

          <SlimeBox color="blue" className="!min-h-[110px] !p-4">
            <p className="text-white font-black uppercase text-[10px] tracking-widest mb-1 text-outline">Room Code (To Join)</p>
            <input 
              type="text" 
              value={roomCode} 
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              placeholder="4-LETTER CODE..."
              disabled={isLoading}
              className="w-full bg-white text-bruise-purple font-display text-2xl text-center py-2 rounded-xl border-4 border-bruise-purple focus:outline-none focus:border-toxic-green uppercase placeholder:text-bruise-purple/30 disabled:opacity-50 transition-colors"
              maxLength={4}
            />
          </SlimeBox>

          <div className="flex gap-2 pt-2">
            <div className="flex-1">
              <SlimeBox 
                color="yellow" 
                onClick={handleJoin} 
                disabled={!name.trim() || roomCode.trim().length !== 4 || isLoading}
                className="!min-h-[90px] !p-2"
              >
                <span className="font-display text-2xl text-white text-outline tracking-wider leading-none">JOIN GAME</span>
              </SlimeBox>
            </div>
            <div className="flex-1">
              <SlimeBox 
                color="green" 
                onClick={handleHost} 
                disabled={!name.trim() || isLoading}
                className="!min-h-[90px] !p-2"
              >
                <span className="font-display text-2xl text-white text-outline tracking-wider leading-none">HOST GAME</span>
              </SlimeBox>
            </div>
          </div>

          {/* New How To Play Button */}
          <div className="pt-1">
            <SlimeBox 
              color="purple" 
              onClick={() => router.push("/how-to-play")} 
              disabled={isLoading}
              className="!min-h-[80px] !p-2"
            >
              <span className="font-display text-2xl text-white text-outline tracking-wider leading-none">HOW TO PLAY</span>
            </SlimeBox>
          </div>

        </div>
      </div>
    </GrossOutContainer>
  );
}