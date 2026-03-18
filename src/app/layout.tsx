import type { Metadata, Viewport } from "next";
import { Bangers, Inter } from "next/font/google";
import "./globals.css";
import { GlobalAudio } from "@/src/components/GlobalAudio";

// Load the chunky primary font
const bangers = Bangers({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bangers",
});

// Load the readable secondary font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// PWA and SEO Metadata
export const metadata: Metadata = {
  title: "Senseless | Make sense of the nonsense",
  description: "A darkly comedic, absurd, and highly social mobile party game.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Senseless",
  },
};

// Strict viewport controls to prevent zooming, which ruins PWA game UI
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FFFFFF", // Updated to match the new white theme
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bangers.variable} ${inter.variable} font-sans bg-white text-bruise-purple antialiased min-h-screen flex justify-center`}
      >
        {/* The Mobile Sandbox: Forces all content into a phone-sized column */}
        <main className="w-full max-w-[430px] min-h-[100dvh] bg-white relative overflow-hidden shadow-2xl flex flex-col">
          <GlobalAudio />
          {children}
        </main>
      </body>
    </html>
  );
}