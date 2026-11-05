import Link from "next/link";
import { PACKAGES } from "@/lib/config";
// Server-side verification: never trust the redirect query alone.
export default async function Success({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const q = await searchParams, key = process.env.KHALTI_SECRET_KEY;
  let ok = false;
  if (key && q.pidx) {
    const r = await fetch(`${process.env.KHALTI_BASE || "https://dev.khalti.com/api/v2"}/epayment/lookup/`, { method: "POST", cache: "no-store", headers: { Authorization: `key ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ pidx: q.pidx }) });
    const d = await r.json().catch(() => null);
    ok = d?.status === "Completed" && PACKAGES.some((p) => p.price * 100 === d.total_amount);
  }
  return (<div className="w" style={{ padding: "4rem 0", maxWidth: 640 }}><div className={`msg${ok ? " ok" : ""}`}>
    <h2>{ok ? "Payment confirmed / भुक्तानी पुष्टि भयो" : "Payment not confirmed / भुक्तानी पुष्टि भएन"}</h2>
    <p>Order: {q.purchase_order_id ?? "-"}</p><Link className="btn p" href="/">Home</Link></div></div>);
}
