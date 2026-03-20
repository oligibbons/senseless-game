import type { Metadata, Viewport } from "next";
import { Creepster, Irish_Grover } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "@/src/components/AudioProvider";
import GrossBackground from "@/src/components/GrossBackground";
import { ConnectionToast } from "@/src/components/ConnectionToast";
import { WakeLock } from "@/src/components/WakeLock";

// The drippy, gross-out primary font
const displayFont = Creepster({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// The bouncy, comic-book secondary font
const irishGrover = Irish_Grover({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-irish",
  display: "swap",
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

// Strict viewport controls to prevent zooming
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#12001A", // Matches the dark desktop background
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${irishGrover.variable}`}>
      {/* BODY: Acts as the "Tabletop". 
        It flex-centers the virtual phone in the dead middle of the screen.
      */}
      <body className="font-sans bg-bruise-purple text-bruise-purple antialiased min-h-[100dvh] flex flex-col items-center justify-center overflow-x-hidden">
        
        {/* MAIN: The "Virtual Phone Screen".
          - Mobile (default): w-full, 100vh, no borders. Acts like a normal app.
          - Tablet/Desktop (sm): Max width 430px, 90vh tall, rounded corners, thick border.
        */}
        <main className="w-full sm:max-w-[430px] min-h-[100dvh] sm:min-h-0 sm:h-[90dvh] sm:max-h-[950px] sm:rounded-[2.5rem] sm:border-[12px] sm:border-dark-void bg-white relative overflow-x-hidden overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.4)] flex flex-col mx-auto">
          
          <WakeLock />
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