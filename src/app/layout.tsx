import type { Metadata, Viewport } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { APP_TITLE } from "@/domain/constants";
import "./globals.css";

const garamond = EB_Garamond({ subsets: ["latin"], variable: "--font-garamond", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: APP_TITLE,
  description: "Der eigene Weinkeller: erfassen, bewerten, rechtzeitig geniessen.",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: APP_TITLE, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f6f1e7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de-CH" className={`${garamond.variable} ${inter.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
