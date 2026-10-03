import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ewaste/theme-provider";
import { LanguageProvider } from "@/components/ewaste/language-provider";
import { SessionProvider } from "@/components/ewaste/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CircuitSort — AI-Powered E-Waste Sorting & Recycling",
  description: "Real-time computer vision system that identifies and sorts electronic waste components — capacitors, resistors, PCBs, batteries, and gadgets — with robotic arm routing. A portfolio project.",
  keywords: ["e-waste", "recycling", "computer vision", "AI sorting", "sustainability", "CircuitSort", "portfolio"],
  authors: [{ name: "CircuitSort" }],
  icons: {
    icon: "/circuitsort-logo.svg",
  },
  openGraph: {
    title: "CircuitSort — AI-Powered E-Waste Sorting",
    description: "Real-time AI-powered e-waste component identification and robotic sorting",
    siteName: "CircuitSort",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CircuitSort — AI-Powered E-Waste Sorting",
    description: "Real-time AI-powered e-waste component identification and robotic sorting",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <LanguageProvider>
            <SessionProvider>
              {children}
              <Toaster />
            </SessionProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
