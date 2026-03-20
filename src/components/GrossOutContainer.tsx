"use client";

import { motion } from "framer-motion";

export function GrossOutContainer({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        delay: delay,
      }}
      className="w-full flex flex-col flex-grow min-h-full"
    >
      {children}
    </motion.div>
  );
}

// Use this to violently shake the screen on big reveals
export function ScreenShake({ children, trigger }: { children: React.ReactNode, trigger: boolean }) {
    return (
        <motion.div
            animate={trigger ? { x: [-10, 10, -10, 10, 0], y: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.4, type: "spring" }}
            className="w-full flex flex-col flex-grow min-h-full"
        >
            {children}
        </motion.div>
    )
}