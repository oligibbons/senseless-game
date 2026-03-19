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
    // INCREASED FREQUENCY: Generated 25 icons for a busier look
    const newIcons: FloatingIcon[] = Array.from({ length: 25 }).map((_, i) => {
      // Determine "depth" - 0 is far/blurry, 2 is near/clear
      const depth = Math.floor(Math.random() * 3);
      
      const sizes = [45, 65, 85];
      const blurs = ["blur(4px)", "blur(2px)", "blur(0px)"];
      
      // INCREASED OPACITY: Values tuned to remain visible against a white background
      const opacities = [0.15, 0.22, 0.3]; 

      return {
        id: i,
        src: ICONS[i % ICONS.length],
        x: Math.random() * 100, // Percentage
        y: Math.random() * 100, // Percentage
        size: sizes[depth],
        duration: 25 + Math.random() * 35, // slow drift
        delay: Math.random() * -20, // Negative delay for mid-animation start
        opacity: opacities[depth],
        blur: blurs[depth],
        rotation: Math.random() * 360,
      };
    });

    setIcons(newIcons);
  }, []);

  return (
    // Clean white background to replace the previous purple
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-white">
      {/* Background Vignette utility defined in globals.css for subtle depth */}
      <div className="absolute inset-0 bg-white-vignette opacity-100" />

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
              // Drifting motion with slightly increased variance for the busier field
              y: [`${icon.y}vh`, `${(icon.y + 15) % 100}vh`, `${icon.y}vh`],
              x: [`${icon.x}vw`, `${(icon.x + 8) % 100}vw`, `${icon.x}vw`],
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
              filter: icon.blur, 
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