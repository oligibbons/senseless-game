import type { Metadata, Viewport } from "next";
import { Creepster, Irish_Grover } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "@/src/components/AudioProvider";
import GrossBackground from "@/src/components/GrossBackground";
import { ConnectionToast } from "@/src/components/ConnectionToast";

// The drippy, gross-out primary font
const displayFont = Creepster({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

// The bouncy, comic-book secondary font
const irishGrover = Irish_Grover({
  weight: "400",
  subsets: ["latin"],
  // FIX: Explicitly changed the variable name so Next.js doesn't cache the old one
  variable: "--font-irish", 
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
        className={`${displayFont.variable} ${irishGrover.variable} font-sans bg-white text-bruise-purple antialiased min-h-screen flex justify-center`}
      >
        <main className="w-full max-w-[430px] min-h-[100dvh] bg-white relative overflow-x-hidden shadow-2xl flex flex-col">
          <ConnectionToast />
          <GrossBackground />
          <AudioProvider>
            {children}
          </AudioProvider>
        </main>
      </body>
    </html>
  );
}