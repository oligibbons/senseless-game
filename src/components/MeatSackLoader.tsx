"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface MeatSackLoaderProps {
  children: ReactNode;
  className?: string;
}

export function MeatSackLoader({ children, className = "" }: MeatSackLoaderProps) {
  return (
    <motion.div
      animate={{
        // Irregular stretching and squashing to simulate breathing/digesting
        scaleX: [1, 1.04, 0.96, 1.02, 1],
        scaleY: [1, 0.95, 1.03, 0.98, 1],
        skewX: [0, 1, -1, 0],
      }}
      transition={{
        duration: 2.2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}