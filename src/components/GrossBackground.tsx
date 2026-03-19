"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// Master list of background icons
const ICONS = [
  "/sense_sight.png",
  "/sense_sound.png",
  "/sense_smell.png",
  "/sense_touch.png",
  "/sense_taste.png",
];

interface FloatingIcon {
  id: number;
  src: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  blur: string;
  rotation: number;
}

export default function GrossBackground() {
  const [icons, setIcons] = useState<FloatingIcon[]>([]);

  useEffect(() => {
    // Generate a fixed set of floating icons once on mount
    const newIcons: FloatingIcon[] = Array.from({ length: 15 }).map((_, i) => {
      // Determine "depth" - 0 is far/blurry, 2 is near/clear
      const depth = Math.floor(Math.random() * 3);
      
      const sizes = [40, 60, 80];
      const blurs = ["blur(4px)", "blur(2px)", "blur(0px)"];
      const opacities = [0.05, 0.1, 0.15]; // Keep it subtle

      return {
        id: i,
        src: ICONS[i % ICONS.length],
        x: Math.random() * 100, // Percentage
        y: Math.random() * 100, // Percentage
        size: sizes[depth],
        duration: 20 + Math.random() * 40, // Very slow drift
        delay: Math.random() * -20, // Negative delay so they start mid-animation
        opacity: opacities[depth],
        blur: blurs[depth],
        rotation: Math.random() * 360,
      };
    });

    setIcons(newIcons);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#12001A]">
      {/* Background Gradient/Vignette */}
      <div className="absolute inset-0 bg-radial-vignette opacity-50" />

      <AnimatePresence>
        {icons.map((icon) => (
          <motion.div
            key={icon.id}
            initial={{ 
              x: `${icon.x}vw`, 
              y: `${icon.y}vh`, 
              rotate: icon.rotation, 
              opacity: 0 
            }}
            animate={{ 
              // Drifting motion
              y: [`${icon.y}vh`, `${(icon.y + 10) % 100}vh`, `${icon.y}vh`],
              x: [`${icon.x}vw`, `${(icon.x + 5) % 100}vw`, `${icon.x}vw`],
              rotate: [icon.rotation, icon.rotation + 360],
              opacity: icon.opacity
            }}
            transition={{
              duration: icon.duration,
              repeat: Infinity,
              delay: icon.delay,
              ease: "linear",
            }}
            className="absolute"
            style={{
              width: icon.size,
              height: icon.size,
              filter: `${icon.blur} grayscale(40%)`, // Slight desaturation for depth
            }}
          >
            <Image
              src={icon.src}
              alt="floating sense"
              fill
              className="object-contain"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}