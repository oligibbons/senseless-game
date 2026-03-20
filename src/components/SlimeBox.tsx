"use client";

import { ReactNode, useId } from "react";
import { motion } from "framer-motion";
import { useAudio } from "@/src/components/AudioProvider";

export type SlimeColor = "blue" | "green" | "orange" | "pink" | "purple" | "yellow";

interface SlimeBoxProps {
  children: ReactNode;
  color: SlimeColor;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

const colorMap: Record<SlimeColor, string> = {
  purple: "#A855F7", 
  pink: "#FF007F",   
  green: "#39FF14",  
  blue: "#06B6D4",   
  orange: "#FF6B35", 
  yellow: "#FFD700", 
};

export function SlimeBox({ children, color, className = "", onClick, disabled = false }: SlimeBoxProps) {
  const hexColor = colorMap[color] || colorMap.green;
  const filterId = useId().replace(/:/g, "-"); 
  const { playSFX } = useAudio();

  const isInteractive = !!onClick && !disabled;

  const handleClick = (e: React.MouseEvent) => {
    if (disabled && onClick) {
      playSFX("ui_error");
      return;
    }
    if (onClick) {
      playSFX("ui_squish");
      onClick();
    }
  };

  return (
    <div 
      // The wrapper ALWAYS keeps pb-12 for the drips. className is moved to the inner content!
      className={`relative w-full pb-12 ${disabled ? "opacity-50 cursor-not-allowed grayscale-[50%]" : ""}`}
      onClick={onClick || disabled ? handleClick : undefined}
      role={onClick ? "button" : "presentation"}
    >
      
      {/* 1. SLOW VISCOUS BOIL (SVG Filter) */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <filter id={`wavy-${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise">
            <animate attributeName="baseFrequency" values="0.01;0.018;0.01" dur={`${12 + Math.random() * 5}s`} repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="18" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {/* 2. VISUAL BACKGROUND (Filtered Layer) */}
      <div 
        className="absolute top-0 left-0 right-0 bottom-12 z-0 pointer-events-none" 
        style={{ filter: `url(#wavy-${filterId}) drop-shadow(8px 8px 0px rgba(18,0,26,0.9))` }}
      >
        <motion.div
          animate={{
            borderRadius: [
              "12px 32px 16px 40px",
              "32px 16px 40px 12px",
              "16px 40px 12px 32px",
              "12px 32px 16px 40px",
            ]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className={`w-full h-full border-[6px] border-bruise-purple`}
          style={{
            backgroundColor: hexColor,
            backgroundImage: `
              radial-gradient(ellipse at 15% 15%, rgba(255,255,255,0.6) 0%, transparent 25%),
              radial-gradient(circle at 85% 85%, rgba(0,0,0,0.4) 0%, transparent 40%),
              radial-gradient(ellipse at 50% 120%, rgba(0,0,0,0.5) 0%, transparent 60%),
              radial-gradient(circle at 12% 18%, rgba(0,0,0,0.2) 2px, transparent 2px),
              radial-gradient(circle at 16% 40%, rgba(0,0,0,0.15) 2.5px, transparent 2.5px),
              radial-gradient(circle at 82% 28%, rgba(0,0,0,0.25) 1.5px, transparent 1.5px),
              radial-gradient(circle at 88% 60%, rgba(0,0,0,0.2) 3px, transparent 3px),
              radial-gradient(circle at 35% 88%, rgba(0,0,0,0.15) 2px, transparent 2px),
              radial-gradient(circle at 65% 12%, rgba(0,0,0,0.25) 2.5px, transparent 2.5px),
              radial-gradient(circle at 72% 52%, rgba(0,0,0,0.2) 1px, transparent 1px),
              radial-gradient(circle at 28% 78%, rgba(0,0,0,0.25) 2px, transparent 2px)
            `,
            boxShadow: `
              inset 0px -30px 35px -10px rgba(0,0,0,0.6),  
              inset 0px 15px 18px -5px rgba(255,255,255,0.8), 
              inset -18px 0px 25px -10px rgba(0,0,0,0.4),  
              inset 18px 0px 25px -10px rgba(255,255,255,0.5) 
            `,
          }}
        >
          <div className="absolute top-[10%] left-[8%] w-8 h-6 sm:w-11 sm:h-8 bg-white/30 mix-blend-overlay shadow-[inset_0_5px_8px_rgba(255,255,255,0.9),inset_0_-5px_8px_rgba(0,0,0,0.6)] rounded-[40%_60%_70%_30%/40%_50%_60%_50%]" />
          <div className="absolute bottom-[20%] right-[12%] w-10 h-8 sm:w-14 sm:h-10 bg-black/20 mix-blend-overlay shadow-[inset_0_4px_6px_rgba(255,255,255,0.5),inset_0_-5px_8px_rgba(0,0,0,0.8)] rounded-[60%_40%_30%_70%/50%_60%_40%_50%]" />
          <div className="absolute top-[65%] right-[8%] w-6 h-6 sm:w-8 sm:h-8 bg-white/15 mix-blend-overlay shadow-[inset_0_3px_6px_rgba(255,255,255,0.7),inset_0_-4px_6px_rgba(0,0,0,0.5)] rounded-[50%_50%_40%_60%/60%_40%_50%_50%]" />
          <div className="absolute bottom-[35%] left-[6%] w-5 h-5 sm:w-7 sm:h-7 bg-black/25 mix-blend-overlay shadow-[inset_0_-4px_6px_rgba(0,0,0,0.7)] rounded-full" />

          <div className="absolute top-[22%] left-[12%] w-[38%] h-3 border-t-[5px] border-black/20 rounded-[50%] transform -rotate-6 blur-[1px]" />
          <div className="absolute bottom-[28%] right-[18%] w-[48%] h-4 border-b-[7px] border-black/20 rounded-[50%] transform rotate-12 blur-[2px]" />
          
          <div className="absolute top-2 left-[10%] right-[20%] h-4 sm:h-6 bg-gradient-to-r from-white/80 to-transparent rounded-[50%] blur-[1px] transform -rotate-2" />
        </motion.div>

        {/* 3. VISCOUS DRIPS */}
        <div className="absolute top-full left-0 right-0 z-20 flex justify-around px-10">
          <LiquidDrip delay={0} color={hexColor} height="h-12" />
          <LiquidDrip delay={2.2} color={hexColor} height="h-16" />
          <LiquidDrip delay={1.1} color={hexColor} height="h-10" />
          <LiquidDrip delay={3.7} color={hexColor} height="h-14" />
        </div>
      </div>

      {/* 4. THE CONTENT (Custom class names applied HERE so they don't break the wrapper padding) */}
      <motion.div 
        className={`relative z-20 w-full flex flex-col items-center justify-center p-6 min-h-[140px] text-center ${className} ${isInteractive ? "cursor-pointer" : ""}`}
        whileHover={isInteractive ? { scale: 1.02, rotate: -1 } : {}}
        whileTap={isInteractive ? { scale: 0.95 } : {}}
      >
        {children}
      </motion.div>

    </div>
  );
}

function LiquidDrip({ delay, color, height }: { delay: number; color: string; height: string }) {
  return (
    <div className="relative flex flex-col items-center w-5">
      <motion.div
        animate={{ 
          scaleY: [1, 2.8, 1], 
          scaleX: [1, 0.45, 1], 
        }}
        transition={{ 
          duration: 7, 
          repeat: Infinity, 
          delay: delay,
          ease: "easeInOut" 
        }}
        className={`w-4 ${height} border-[6px] border-t-0 border-bruise-purple origin-top -mt-[6px] z-10`}
        style={{ 
          backgroundColor: color,
          borderRadius: '40% 60% 60% 40% / 0% 0% 100% 100%',
          boxShadow: "inset 0px -8px 10px rgba(0,0,0,0.6)" 
        }}
      />
      <motion.div
        animate={{
          y: [0, 45, 70],
          opacity: [0, 1, 0],
          scale: [0, 1.2, 0.5]
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          delay: delay + 3.2, 
          ease: "easeIn"
        }}
        className="absolute top-[80%] w-3 h-3 border-[3px] border-bruise-purple rounded-full z-0"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}