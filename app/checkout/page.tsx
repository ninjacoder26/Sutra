"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { CONFIG, PACKAGES, npr } from "@/lib/config";
function Checkout() {
  const { t } = useT(), c = t.co, q = useSearchParams();
  const [pkg, setPkg] = useState<(typeof PACKAGES)[number]["id"]>(PACKAGES.find((p) => p.id === q.get("pkg"))?.id ?? "professional");
  const [method, setMethod] = useState<"khalti" | "manual">("khalti");
  const [f, setF] = useState({ name: "", business: "", phone: "", email: "", notes: "" });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [done, setDone] = useState<string | null>(null);
  const p = PACKAGES.find((x) => x.id === pkg)!;
  const wa = (id: string) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent([`Sutra Studio order ${id}`, `${t.pk[pkg][0]} (${npr(p.price)})`, f.name, f.business, f.phone, f.notes].filter(Boolean).join("\n"))}`;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    const er: Record<string, string> = {};
    if (!f.name.trim()) er.name = c.req;
    if (f.phone.replace(/\D/g, "").length < 7) er.phone = c.bad;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) er.email = c.bad;
    setErr(er); if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const r = await fetch("/api/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, pkg, method }) });
      const d = await r.json();
      if (r.status === 503) { setMsg(c.off); return; }
      if (!r.ok) throw 0;
      if (d.paymentUrl) { window.location.href = d.paymentUrl; return; }
      setDone(d.orderId);
    } catch { setMsg(c.fail); } finally { setBusy(false); }
  }
  const fld = (k: keyof typeof f, label: string, type = "text") => (
    <div className="fd"><label htmlFor={k}>{label}</label>
      <input id={k} type={type} value={f[k]} aria-invalid={!!err[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      {err[k] && <span className="er" role="alert">{err[k]}</span>}</div>);
  if (done) return (<div className="w" style={{ padding: "4rem 0", maxWidth: 640 }}><div className="msg ok"><h2>{c.done}</h2>
    <p>{c.id}: <b>{done}</b></p>{method === "manual" && <p>{CONFIG.bank}</p>}<p>{c.terms}</p>
    <a className="btn p" target="_blank" rel="noopener" href={wa(done)}>{c.wa}</a></div></div>);
  return (<div className="w co"><form onSubmit={submit} noValidate><h1 style={{ fontSize: "2.2rem" }}>{c.title}</h1>
    {fld("name", c.name)}{fld("business", c.biz)}{fld("phone", c.phone, "tel")}{fld("email", c.email, "email")}
    <div className="fd"><label htmlFor="notes">{c.notes}</label><textarea id="notes" rows={4} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
    <fieldset style={{ border: 0, padding: 0, display: "grid", gap: ".6rem" }}><legend style={{ fontWeight: 600, marginBottom: ".5rem" }}>{c.method}</legend>
      {(["khalti", "manual"] as const).map((m) => <label key={m} className="opt"><input type="radio" name="m" checked={method === m} onChange={() => setMethod(m)} />{c[m]}</label>)}</fieldset>
    {msg && <div className="msg" role="alert">{msg}</div>}
    <button className="btn p" disabled={busy}>{c.pay} · {npr(p.price)}</button></form>
    <aside className="sm"><h3>{c.sum}</h3>
      <div role="radiogroup" style={{ display: "grid", gap: ".5rem", margin: "1rem 0" }}>{PACKAGES.map((x) => (
        <label key={x.id} className="opt"><input type="radio" name="pk" checked={pkg === x.id} onChange={() => setPkg(x.id)} />{t.pk[x.id][0]} · {npr(x.price)}</label>))}</div>
      <p>{c.delivery}: {p.days[0]}–{p.days[1]} {t.days}</p><p style={{ fontSize: "1.5rem", fontWeight: 800 }}>{c.total}: {npr(p.price)}</p>
      <p className="note">{c.terms}</p><Link href="/">← {t.back}</Link></aside></div>);
}
export default function Page() { return <Suspense><Checkout /></Suspense>; }
