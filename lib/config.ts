// CENTRAL CONFIG: edit contact, bank and package details here.
export const CONFIG = {
  whatsapp: "9779800000000", // placeholder, digits only
  email: "hello@example.com", // placeholder
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  bank: "Bank name · Account name · Account number (fill in)",
};
// Prices live here and are re-read on the server: the client never sets the amount.
export const PACKAGES = [
  { id: "standard", price: 2499, days: [7, 10] },
  { id: "professional", price: 4999, days: [10, 14], recommended: true },
  { id: "premium", price: 8499, days: [14, 18] },
] as const;
export type PkgId = (typeof PACKAGES)[number]["id"];
export const npr = (n: number) => `रु. ${n.toLocaleString("en-US")}`;
