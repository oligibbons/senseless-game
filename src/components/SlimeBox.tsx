// src/components/SlimeBox.tsx
"use client";

import Image from "next/image";
import { ReactNode } from "react";
import { useAudio } from "@/src/components/AudioProvider";
import { motion } from "framer-motion";

type SlimeColor = "blue" | "green" | "orange" | "pink" | "purple" | "yellow";

interface SlimeBoxProps {
  color: SlimeColor;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

const colorMap: Record<SlimeColor, string> = {
  blue: "/senseless_box_blue.png",
  green: "/senseless_box_green.png",
  orange: "/senseless_box_orange.png",
  pink: "/senseless_box_pink.png",
  purple: "/senseless_box_purple.png",
  yellow: "/senseless_box_yellow.png",
};

export function SlimeBox({ color, children, className = "", onClick, disabled = false }: SlimeBoxProps) {
  const { playSFX } = useAudio();
  const isInteractive = !!onClick && !disabled;

  const handleClick = (e: React.MouseEvent) => {
    if (disabled && onClick) {
      playSFX("ui_error"); // Play a gross error sound if they tap a disabled box
      return;
    }
    if (onClick) {
      playSFX("ui_squish"); // Squish on success!
      onClick();
    }
  };

  return (
    <motion.div
      onClick={onClick || disabled ? handleClick : undefined}
      // Visceral physical interaction states
      whileHover={isInteractive ? { scale: 1.02, rotate: Math.random() > 0.5 ? 1 : -1 } : {}}
      whileTap={isInteractive ? { scale: 0.92, rotate: Math.random() > 0.5 ? -2 : 2 } : {}}
      transition={{ type: "spring", stiffness: 500, damping: 15 }}
      role={onClick ? "button" : "presentation"}
      className={`relative flex items-center justify-center min-h-[140px] w-full p-6 ${
        isInteractive ? "cursor-pointer" : ""
      } ${disabled ? "opacity-50 cursor-not-allowed grayscale-[50%]" : ""} ${className}`}
    >
      {/* Slime Background */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
        <Image
          src={colorMap[color]}
          alt={`${color} slime box`}
          fill
          sizes="(max-width: 430px) 100vw, 430px"
          className="object-contain drop-shadow-chunky"
          priority
        />
      </div>
      
      {/* Subtle glossy wet highlight overlay to make the PNG feel slick and premium */}
      <div className="absolute top-[12%] left-[15%] right-[15%] h-[8%] bg-white/20 rounded-[100%] blur-[2px] pointer-events-none z-10 mix-blend-overlay" />

      {/* Content */}
      <div className="relative z-20 w-full text-center">
        {children}
      </div>
    </motion.div>
  );
}