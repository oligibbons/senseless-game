import type { Metadata, Viewport } from "next";
import { Creepster, Inter } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "@/src/components/AudioProvider";
// FIX: Changed from named import { GrossBackground } to default import
import GrossBackground from "@/src/components/GrossBackground";

// The new drippy, gross-out font
const displayFont = Creepster({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
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
  themeColor: "#FFFFFF", 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${displayFont.variable} ${inter.variable} font-sans bg-white text-bruise-purple antialiased min-h-screen flex justify-center`}
      >
        <main className="w-full max-w-[430px] min-h-[100dvh] bg-white relative overflow-hidden shadow-2xl flex flex-col">
          <GrossBackground />
          <AudioProvider>
            {children}
          </AudioProvider>
        </main>
      </body>
    </html>
  );
}