// src/components/SlimeBox.tsx
"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useAudio } from "@/src/components/AudioProvider";

export type SlimeColor = "blue" | "green" | "orange" | "pink" | "purple" | "yellow";

interface SlimeBoxProps {
  children: ReactNode;
  color: SlimeColor;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  staticMode?: boolean; // Turns off continuous morphing/breathing for scrollable lists
}

// SLIGHTLY MUTED PALETTE: Less "neon plastic", more "sickly slime"
const colorMap: Record<SlimeColor, string> = {
  purple: "#984DE3", 
  pink: "#ED1E79",   
  green: "#45DB26",  
  blue: "#16A8C7",   
  orange: "#F26522", 
  yellow: "#F2CC0F", 
};

interface DripConfig {
  id: number;
  left: string;
  width: string;
  height: string;
  duration: number;
  delay: number;
}

export function SlimeBox({ children, color, className = "", onClick, disabled = false, staticMode = false }: SlimeBoxProps) {
  const hexColor = colorMap[color] || colorMap.green;
  const { playSFX } = useAudio();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "100px" });
  
  const [drips, setDrips] = useState<DripConfig[]>([]);

  const isInteractive = !!onClick && !disabled;

  useEffect(() => {
    const numDrips = Math.floor(Math.random() * 4) + 2; // 2 to 5 drips
    const newDrips = Array.from({ length: numDrips }).map((_, i) => ({
      id: i,
      left: `${10 + Math.random() * 75}%`, 
      width: `${12 + Math.random() * 8}px`, 
      height: `${25 + Math.random() * 45}px`, 
      duration: 8 + Math.random() * 7, // 8s to 15s per cycle
      delay: -(Math.random() * 15), 
    }));
    setDrips(newDrips);
  }, []);

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

  const shouldAnimate = !staticMode && isInView;

  return (
    <motion.div 
      ref={containerRef}
      className={`relative w-full pb-12 ${disabled ? "opacity-50 cursor-not-allowed grayscale-[50%]" : ""} ${isInteractive ? "cursor-pointer" : ""}`}
      role={onClick ? "button" : "presentation"}
      whileHover={isInteractive ? { scale: 1.02, rotate: -1 } : {}}
      whileTap={isInteractive ? { scale: 0.95 } : {}}
      onClick={onClick || disabled ? handleClick : undefined}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes blobMorph {
            0%, 100% { border-radius: 12px 32px 16px 40px; }
            25% { border-radius: 32px 16px 40px 12px; }
            50% { border-radius: 16px 40px 12px 32px; }
            75% { border-radius: 32px 40px 16px 12px; }
          }
          @keyframes blobBreathe {
            0%, 100% { transform: scale3d(1, 1, 1); }
            50% { transform: scale3d(0.98, 0.97, 1); }
          }
          @keyframes dripStretch {
            0%, 100% { transform: scale3d(1, 1, 1); }
            50% { transform: scale3d(0.5, 2.5, 1); }
          }
          @keyframes dripDrop {
            0%, 45% { transform: translate3d(0, 0, 0) scale3d(0, 0, 1); opacity: 0; }
            50%  { transform: translate3d(0, 20px, 0) scale3d(1.2, 1.2, 1); opacity: 1; }
            100% { transform: translate3d(0, 90px, 0) scale3d(0.5, 0.5, 1); opacity: 0; }
          }
        `
      }} />

      <div 
        className="relative w-full"
        style={{ 
          animation: shouldAnimate ? 'blobBreathe 4.5s ease-in-out infinite' : 'none',
          transformOrigin: 'center center',
          filter: 'drop-shadow(8px 8px 0px rgba(18,0,26,0.9))',
          willChange: shouldAnimate ? 'transform' : 'auto'
        }}
      >
        <div
          className="relative w-full h-full border-bruise-purple overflow-hidden"
          style={{
            backgroundColor: hexColor,
            animation: shouldAnimate ? 'blobMorph 5s ease-in-out infinite' : 'none',
            borderRadius: '12px 32px 16px 40px',
            borderStyle: 'solid',
            borderWidth: '5px 7px 4px 6px',
            // Added back some cheap radial gradients for sludge texture
            backgroundImage: `
              linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 40%, rgba(0,0,0,0.15) 100%),
              radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 20%),
              radial-gradient(circle at 20% 80%, rgba(0,0,0,0.1) 0%, transparent 30%)
            `,
            boxShadow: 'inset -10px -10px 20px -5px rgba(0,0,0,0.4), inset 10px 10px 20px -5px rgba(255,255,255,0.6)',
            willChange: shouldAnimate ? 'border-radius' : 'auto',
            transform: 'translateZ(0)'
          }}
        >
          {/* Specular Wet Highlights */}
          <div className="absolute top-[8%] left-[8%] w-10 h-6 bg-white/50 rounded-[50%] transform -rotate-12 pointer-events-none blur-[1px]" />
          <div className="absolute top-[22%] left-[6%] w-4 h-4 bg-white/50 rounded-[50%] transform -rotate-12 pointer-events-none blur-[1px]" />
          
          {/* ORGANIC GROSSNESS: CSS "Pustules" and Bubbles inside the slime */}
          <div className="absolute top-[15%] right-[10%] w-12 h-10 bg-black/10 rounded-[40%_60%_70%_30%] mix-blend-overlay shadow-[inset_3px_3px_6px_rgba(0,0,0,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.3)] pointer-events-none" />
          <div className="absolute bottom-[20%] left-[12%] w-16 h-12 bg-black/15 rounded-[60%_40%_30%_70%] mix-blend-overlay shadow-[inset_4px_4px_8px_rgba(0,0,0,0.6),inset_-2px_-2px_4px_rgba(255,255,255,0.2)] pointer-events-none" />
          <div className="absolute top-[45%] right-[25%] w-6 h-6 bg-white/10 rounded-full mix-blend-overlay shadow-[inset_-2px_-2px_4px_rgba(255,255,255,0.6),inset_2px_2px_4px_rgba(0,0,0,0.2)] pointer-events-none" />

          <div className={`relative z-30 w-full flex flex-col items-center justify-center p-6 min-h-[140px] text-center break-words overflow-wrap-anywhere max-w-full ${className}`}>
            {children}
          </div>
        </div>

        {/* FIXED POSITION: top-[calc(100%-6px)] ensures it starts at the bottom and perfectly overlaps the 6px border */}
        <div className="absolute top-[calc(100%-6px)] left-0 right-0 z-10 pointer-events-none w-full h-0">
            {drips.map((drip) => (
              <LiquidDrip key={drip.id} config={drip} color={hexColor} shouldAnimate={shouldAnimate} />
            ))}
        </div>
      </div>
    </motion.div>
  );
}

function LiquidDrip({ config, color, shouldAnimate }: { config: DripConfig; color: string; shouldAnimate: boolean }) {
  return (
    <div 
      className="absolute flex flex-col items-center" 
      style={{ left: config.left, width: config.width, top: '0px' }}
    >
      <div 
        className="border-bruise-purple origin-top z-10"
        style={{ 
          width: '100%',
          height: config.height,
          borderStyle: 'solid',
          borderWidth: '0px 4px 4px 4px',
          backgroundColor: color,
          borderRadius: '40% 60% 60% 40% / 0% 0% 100% 100%',
          boxShadow: "inset -4px -4px 8px -2px rgba(0,0,0,0.4)",
          animation: shouldAnimate ? `dripStretch ${config.duration}s ease-in-out ${config.delay}s infinite` : 'none',
          willChange: shouldAnimate ? "transform" : "auto"
        }}
      />
      <div 
        className="absolute w-[140%] aspect-square border-[3px] border-bruise-purple rounded-full z-0"
        style={{ 
          top: '80%',
          backgroundColor: color,
          opacity: 0,
          animation: shouldAnimate ? `dripDrop ${config.duration}s ease-in ${config.delay}s infinite` : 'none',
          willChange: shouldAnimate ? "transform, opacity" : "auto"
        }}
      />
    </div>
  );
}