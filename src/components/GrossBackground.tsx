"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  size: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
  colorClass: string;
}

const COLORS = [
  "bg-fleshy-pink",
  "bg-toxic-green",
  "bg-warning-yellow",
  "bg-bruise-purple", // Adding some dark blobs for contrast
];

export function GrossBackground() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Generate only 15 particles to keep mobile performance buttery smooth
    const newParticles: Particle[] = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      size: Math.random() * 40 + 10, // 10px to 50px
      x: Math.random() * 100, // Random X percentage
      y: Math.random() * 100, // Random Y percentage
      duration: Math.random() * 10 + 10, // 10 to 20 seconds
      delay: Math.random() * 5,
      colorClass: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${p.colorClass} mix-blend-multiply`}
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            filter: "blur(2px)", // Gives them a soft, out-of-focus "mold spore" look
          }}
          animate={{
            y: ["-10vh", "10vh", "-10vh"],
            x: ["-5vw", "5vw", "-5vw"],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}