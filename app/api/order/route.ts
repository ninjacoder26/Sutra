import { NextResponse } from "next/server";
import { CONFIG, PACKAGES } from "@/lib/config";
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s });
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const pkg = PACKAGES.find((p) => p.id === b?.pkg); // price always comes from the server table
  const name = String(b?.name ?? "").trim(), email = String(b?.email ?? "").trim(), phone = String(b?.phone ?? "");
  if (!pkg || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.replace(/\D/g, "").length < 7) return bad("invalid");
  const orderId = "SUT-" + Date.now().toString(36).toUpperCase();
  const order = { orderId, pkg: pkg.id, amount: pkg.price, name, email, phone, business: String(b.business ?? ""), notes: String(b.notes ?? "").slice(0, 2000), method: b.method, at: new Date().toISOString() };
  console.log("NEW ORDER", order); // INTEGRATION POINT: save to your DB / send an email here. Nothing is persisted by default.
  if (b.method !== "khalti") return NextResponse.json({ orderId });
  const key = process.env.KHALTI_SECRET_KEY;
  if (!key) return bad("khalti_not_configured", 503);
  const base = process.env.KHALTI_BASE || "https://dev.khalti.com/api/v2";
  const r = await fetch(`${base}/epayment/initiate/`, { method: "POST", headers: { Authorization: `key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ return_url: `${CONFIG.siteUrl}/checkout/success`, website_url: CONFIG.siteUrl, amount: pkg.price * 100, purchase_order_id: orderId, purchase_order_name: `Sutra ${pkg.id}`, customer_info: { name, email } }) });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d?.payment_url) return bad("khalti_failed", 502);
  return NextResponse.json({ orderId, paymentUrl: d.payment_url });
}
