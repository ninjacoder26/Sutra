"use client";

export const toast = (msg: string, type: "ok" | "no" = "ok") => console.log(type, msg);
export const rateLimitCheck = (action: string, onLimited?: (msg: string) => void) => ({ allowed: true });
export const rateLimitConsume = (action: string) => ({ allowed: true });
export const formatNPR = (n: number) => `रु. ${(Number(n) || 0).toLocaleString("en-IN")}`;
export const statusBadge = (status: string) => `status`;
export const paymentBadge = (p: string) => `status`;
export const escapeHtml = (s: string) => {
  const esc: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(s || "").replace(/[&<>"']/g, (c) => esc[c] ?? c);
};
export const dateShort = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleDateString() : "\u2014";
