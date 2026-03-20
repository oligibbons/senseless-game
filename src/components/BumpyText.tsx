// src/components/BumpyText.tsx
import React from 'react';

export function BumpyText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`inline-flex flex-wrap justify-center ${className}`}>
      {text.split("").map((char, i) => {
        // Preserve spaces between words
        if (char === " ") {
          return <span key={i} className="whitespace-pre"> </span>;
        }
        
        // Alternating pattern: Evens tilt right and go up slightly, odds tilt left and go down.
        // Using Tailwind's rotate-2 (2 degrees) and translate-y-0.5 (2px) for a subtle cartoon effect.
        const transformClass = i % 2 === 0 
          ? "rotate-2 -translate-y-0.5" 
          : "-rotate-2 translate-y-0.5";

        return (
          <span key={i} className={`inline-block ${transformClass}`}>
            {char}
          </span>
        );
      })}
    </span>
  );
}