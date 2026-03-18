import Image from "next/image";
import { ReactNode } from "react";

type SlimeColor = "blue" | "orange" | "pink" | "purple" | "yellow";

interface SlimeBoxProps {
  color: SlimeColor;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

const colorMap: Record<SlimeColor, string> = {
  blue: "/senseless_box_blue.png",
  orange: "/senseless_box_orange.jpg",
  pink: "/senseless_box_pink.png",
  purple: "/senseless_box_purple.png",
  yellow: "/senseless_box_yellow.png",
};

export function SlimeBox({ color, children, className = "", onClick, disabled = false }: SlimeBoxProps) {
  const isInteractive = !!onClick && !disabled;
  const Component = onClick ? "button" : "div";
  
  // JPEGs don't have transparency. We use mix-blend-multiply as a hack to drop white backgrounds.
  const isJpeg = color === "orange"; 

  return (
    <Component
      onClick={onClick}
      disabled={disabled}
      className={`relative flex items-center justify-center min-h-[140px] w-full p-6 transition-transform ${
        isInteractive ? "active:scale-95 cursor-pointer" : ""
      } ${disabled ? "opacity-50 cursor-not-allowed grayscale" : ""} ${className}`}
    >
      {/* Slime Background */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
        <Image
          src={colorMap[color]}
          alt={`${color} slime box`}
          fill
          sizes="(max-width: 430px) 100vw, 430px"
          className={`object-contain ${isJpeg ? "mix-blend-multiply" : "drop-shadow-chunky"}`}
          priority
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full text-center">
        {children}
      </div>
    </Component>
  );
}