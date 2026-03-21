// src/components/GrossBackground.tsx
"use client";

import { useEffect, useState } from "react";

// Master list of background icons (Strictly SVGs)
const ICONS = [
  "/sense_sight.svg",
  "/sense_sound.svg",
  "/sense_smell.svg",
  "/sense_touch.svg",
  "/sense_taste.svg",
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
    // 25 icons for a busier look
    const newIcons: FloatingIcon[] = Array.from({ length: 25 }).map((_, i) => {
      // Determine "depth" - 0 is far/blurry, 2 is near/clear
      const depth = Math.floor(Math.random() * 3);
      
      const sizes = [45, 65, 85];
      const blurs = ["blur(4px)", "blur(2px)", "blur(0px)"];
      
      // Opacity tuned to remain visible against a white background
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

  // Avoid rendering anything on the server to prevent hydration mismatches with Math.random()
  if (icons.length === 0) return null;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-white">
      {/* Background Vignette utility defined in globals.css for subtle depth */}
      <div className="absolute inset-0 bg-white-vignette opacity-100" />

      {/* Inject pure CSS animation to offload work to the GPU */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes grossFloat {
            0% { 
              transform: translate3d(var(--startX), var(--startY), 0) rotate(var(--rotStart)); 
              opacity: 0; 
            }
            20% { 
              opacity: var(--targetOpacity); 
            }
            80% { 
              opacity: var(--targetOpacity); 
            }
            100% { 
              transform: translate3d(var(--endX), var(--endY), 0) rotate(var(--rotEnd)); 
              opacity: 0; 
            }
          }
          .gross-particle {
            position: absolute;
            will-change: transform, opacity;
            /* Force hardware acceleration to prevent overpainting the foreground */
            -webkit-transform: translateZ(0);
          }
        `
      }} />

      {icons.map((icon) => (
        <img
          key={icon.id}
          src={icon.src}
          alt=""
          aria-hidden="true"
          className="gross-particle"
          style={{
            width: icon.size,
            height: icon.size,
            filter: icon.blur,
            animation: `grossFloat ${icon.duration}s linear ${icon.delay}s infinite`,
            // Pass the random variables directly to CSS
            '--startX': `${icon.x}vw`,
            '--startY': `${icon.y}vh`,
            '--endX': `${icon.x + 15}vw`,
            '--endY': `${icon.y - 30}vh`,
            '--rotStart': `${icon.rotation}deg`,
            '--rotEnd': `${icon.rotation + 180}deg`,
            '--targetOpacity': icon.opacity,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}