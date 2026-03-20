"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ 
        type: "spring", 
        stiffness: 350, 
        damping: 20,
        mass: 0.8
      }}
      className="flex flex-col flex-grow w-full min-h-full"
    >
      {children}
    </motion.div>
  );
}