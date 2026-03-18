"use client";

import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { GrossOutContainer } from "@/src/components/GrossOutContainer";
import { SlimeBox } from "@/src/components/SlimeBox";

export default function HowToPlayPage() {
  const router = useRouter();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        type: "spring", 
        stiffness: 300 
      } 
    }
  };

  return (
    <GrossOutContainer>
      <div className="flex flex-col h-full p-4 relative">
        
        {/* Header */}
        <div className="text-center mb-2 mt-6">
          <motion.h1 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="font-display text-5xl text-fleshy-pink text-outline drop-shadow-chunky leading-none"
          >
            THE RULES
          </motion.h1>
          <p className="font-sans text-bruise-purple font-black uppercase tracking-widest text-[10px] mt-2">
            Try to make sense of the nonsense.
          </p>
        </div>

        {/* Scrollable Rules List */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex-grow flex flex-col gap-2 overflow-y-auto pb-4 px-1"
        >
          <motion.div variants={itemVariants}>
            <SlimeBox color="yellow" className="!min-h-[160px] !px-8 !py-6">
              <h2 className="font-display text-2xl text-white text-outline mb-2 leading-none tracking-wider">1. THE SETUP</h2>
              <p className="font-sans text-bruise-purple text-sm font-bold leading-snug">
                Everyone gets a <span className="bg-toxic-green text-bruise-purple px-1 rounded-sm border-2 border-bruise-purple shadow-chunky-green inline-block mb-1">Secret Target</span> and one <span className="bg-fleshy-pink text-white px-1 rounded-sm border-2 border-bruise-purple shadow-chunky inline-block mb-1">Sense</span> (Sight, Sound, Smell, Touch, Taste) to describe it.
              </p>
            </SlimeBox>
          </motion.div>

          <motion.div variants={itemVariants}>
            <SlimeBox color="pink" className="!min-h-[160px] !px-8 !py-6">
              <h2 className="font-display text-2xl text-white text-outline mb-2 leading-none tracking-wider">2. THE IMPOSTER</h2>
              <p className="font-sans text-bruise-purple text-sm font-bold leading-snug">
                One player is the <span className="bg-bruise-purple text-white px-1 rounded-sm border-2 border-bruise-purple inline-block mb-1">IMPOSTER</span>. They receive a totally fake target. They have to blend in and pretend they know what the real target is.
              </p>
            </SlimeBox>
          </motion.div>

          <motion.div variants={itemVariants}>
            <SlimeBox color="blue" className="!min-h-[160px] !px-8 !py-6">
              <h2 className="font-display text-2xl text-white text-outline mb-2 leading-none tracking-wider">3. THE CLUE</h2>
              <p className="font-sans text-bruise-purple text-sm font-bold leading-snug">
                Write a 50-character clue describing your target, but you can <span className="bg-warning-yellow text-bruise-purple px-1 rounded-sm border-2 border-bruise-purple inline-block mb-1">ONLY</span> use the Sense you were assigned!
              </p>
            </SlimeBox>
          </motion.div>

          <motion.div variants={itemVariants}>
            <SlimeBox color="orange" className="!min-h-[160px] !px-8 !py-6">
              <h2 className="font-display text-2xl text-white text-outline mb-2 leading-none tracking-wider">4. THE VOTE</h2>
              <p className="font-sans text-bruise-purple text-sm font-bold leading-snug">
                Read everyone's clues. Find the lie. Vote for the Meat-Sack you think is the Imposter.
              </p>
            </SlimeBox>
          </motion.div>

          <motion.div variants={itemVariants}>
            <SlimeBox color="green" className="!min-h-[160px] !px-8 !py-6">
              <h2 className="font-display text-2xl text-white text-outline mb-2 leading-none tracking-wider">5. THE STEAL</h2>
              <p className="font-sans text-bruise-purple text-sm font-bold leading-snug">
                If the Imposter is caught, they get one chance to steal the points by guessing the True Target. Keep clues vague to confuse them, but clear enough to prove your innocence!
              </p>
            </SlimeBox>
          </motion.div>
        </motion.div>

        {/* Back Button */}
        <div className="mt-auto pt-1 z-10">
          <SlimeBox 
            color="purple" 
            onClick={() => router.push("/")}
            className="!min-h-[80px] !p-2"
          >
            <span className="font-display text-3xl text-white text-outline tracking-wider leading-none">BACK TO MENU</span>
          </SlimeBox>
        </div>

      </div>
    </GrossOutContainer>
  );
}