"use client";

import Image from "next/image";
import { motion, HTMLMotionProps } from "framer-motion";

// Master list of all bespoke game assets
export type IconType = 
  | "sight" 
  | "sound" 
  | "smell" 
  | "touch" 
  | "taste" 
  | "crown" 
  | "imposter" 
  | "alarm" 
  | "splat";

const iconMap: Record<IconType, string> = {
  sight: "/sense_sight.png",
  sound: "/sense_sound.png",
  smell: "/sense_smell.png",
  touch: "/sense_touch.png",
  taste: "/sense_taste.png",
  crown: "/icon_crown.png",
  imposter: "/icon_imposter.png",
  alarm: "/icon_alarm.png",
  splat: "/icon_splat.png",
};

interface GameIconProps extends HTMLMotionProps<"div"> {
  type: IconType;
  size?: number;
  className?: string;
}

export function GameIcon({ 
  type, 
  size = 100, 
  className = "", 
  ...props 
}: GameIconProps) {
  return (
    <motion.div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      // Default hover/tap behavior for icons if not overridden by parent
      whileHover={{ scale: 1.05, rotate: 2 }}
      whileTap={{ scale: 0.9, rotate: -2 }}
      {...props}
    >
      <Image
        src={iconMap[type]}
        alt={`${type} icon`}
        fill
        sizes={`${size}px`}
        className="object-contain drop-shadow-chunky"
        priority
      />
    </motion.div>
  );
}