"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SINGLE_VARIANTS = [
  "[NAME] is picking their nose...",
  "Someone check on [NAME], they might have been swallowed by their phone.",
  "Waiting for [NAME]'s single brain cell to hit the corner like a DVD logo.",
  "Extracting final thoughts from [NAME]...",
  "[NAME] is currently experiencing a mental blue screen.",
  "Poking [NAME] with a stick...",
  "[NAME] is typing with their toes...",
  "We are forcefully extracting the clue from [NAME]...",
  "[NAME] is lost in the sauce.",
  "Dispatching a search party for [NAME]..."
];

const PLURAL_VARIANTS = [
  "[NAMES] are sharing a single brain cell...",
  "Waiting for [NAMES] to finish their staring contest...",
  "Sending a search and rescue team for [NAMES]...",
  "[NAMES] are desperately trying to make sense of the nonsense...",
  "Harvesting organs from [NAMES] while we wait...",
  "[NAMES] are currently AFK (Away From Kranium)...",
  "Poking [NAMES] with extremely long sticks...",
  "[NAMES] are communicating via dial-up internet...",
  "Waiting for [NAMES] to evolve...",
  "Extracting fluids from [NAMES]..."
];

export function DynamicDowntime({ waitingOn }: { waitingOn: string[] }) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (waitingOn.length === 0) {
      setText("Waiting for the server to catch up...");
      return;
    }

    const updateText = () => {
      let formattedNames = "";
      let templateList = [];

      // Grammatically join the names based on how many people are holding up the game
      if (waitingOn.length === 1) {
        formattedNames = waitingOn[0];
        templateList = SINGLE_VARIANTS;
      } else if (waitingOn.length === 2) {
        formattedNames = `${waitingOn[0]} and ${waitingOn[1]}`;
        templateList = PLURAL_VARIANTS;
      } else {
        const last = waitingOn[waitingOn.length - 1];
        const others = waitingOn.slice(0, -1).join(", ");
        formattedNames = `${others}, and ${last}`;
        templateList = PLURAL_VARIANTS;
      }

      // Pick a random insult/status
      const randomTemplate = templateList[Math.floor(Math.random() * templateList.length)];
      setText(randomTemplate.replace(/\[NAME\]|\[NAMES\]/g, formattedNames));
    };

    updateText(); // Fire immediately
    const interval = setInterval(updateText, 4500); // Cycle every 4.5 seconds

    return () => clearInterval(interval);
  }, [waitingOn]);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={text}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.3 }}
        className="font-sans text-bruise-purple text-xl font-bold uppercase text-balance"
      >
        {text}
      </motion.p>
    </AnimatePresence>
  );
}