import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Mukta } from "next/font/google";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";
const f = Bricolage_Grotesque({ subsets: ["latin"], variable: "--f", display: "swap" });
const m = Mukta({ subsets: ["devanagari", "latin"], weight: ["400", "600", "800"], display: "swap" });
export const metadata: Metadata = {
  title: "Sutra Studio — Websites for Nepali Businesses",
  description: "Professional, mobile-friendly websites for businesses in Nepal, from रु. 2,499. Ready in about 2 weeks.",
};
export const viewport: Viewport = { themeColor: "#0e2624", width: "device-width", initialScale: 1 };
export default function Root({ children }: { children: React.ReactNode }) {
  return (<html lang="en" className={`${f.variable} ${m.className}`}><body><LangProvider>{children}</LangProvider></body></html>);
}
