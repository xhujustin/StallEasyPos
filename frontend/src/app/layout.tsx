import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Use Inter via Google Fonts as per Design System
import "./globals.css";
import Providers from "./providers"; // Import the client provider
import SyncInitializer from "@/components/sync-initializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StallEasy POS",
  description: "Minimalist Zen POS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body
        className={`${inter.className} antialiased bg-slate-50 text-slate-900`}
      >
        <Providers>
          <SyncInitializer />
          {children}
        </Providers>
      </body>
    </html>
  );
}
