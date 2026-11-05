"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { tr, Lang } from "@/lib/i18n";
import { sb, supabaseConfigured } from "@/lib/supabase";
import { toast, rateLimitCheck, rateLimitConsume, formatNPR, dateShort } from "@/lib/ui";
import { APP } from "@/lib/config";

const npr = (n: number) => `रु. ${(Number(n) || 0).toLocaleString("en-IN")}`;

const STATUS_STEPS: any[] = [
  { key: "received", labelKey: "dashboard.stepReceived", status: "Pending" },
  { key: "confirmed", labelKey: "dashboard.stepConfirmed", status: "Confirmed" },
  { key: "progress", labelKey: "dashboard.stepInProgress", status: "In Progress" },
  { key: "completed", labelKey: "dashboard.stepCompleted", status: "Completed" },
];

export default function Dashboard() {
  const L = (typeof localStorage !== "undefined" ? localStorage.getItem("sutra-lang") || "en" : "en") as Lang;
  const [email, setEmail] = useState("");
  const [ref, setRef] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const statusOrder: Record<string, number> = { Pending: 0, Confirmed: 1, "In Progress": 2, Completed: 3 };

  const trackOrder = useCallback(async () => {
    if (!email || !ref) { setErr(tr("dashboard.notFound", L)); return; }
    const rl = rateLimitCheck("dashboardTrack", (m: string) => toast(m, "no"));
    if (!rl.allowed) return;
    setLoading(true);
    setErr("");
    try {
      if (sb && supabaseConfigured) {
        const { data, error } = await sb.from("orders").select("*").eq("customer_email", email).eq("order_number", ref).single();
        if (error || !data) { setErr(tr("dashboard.notFound", L)); setOrder(null); }
        else { setOrder(data); rateLimitConsume("dashboardTrack"); }
      } else {
        // offline fallback: check local pending orders
        try {
          const pending = JSON.parse(localStorage.getItem("sutra-pending-orders") || "[]");
          const found = pending.find((o: any) => o.customer_email === email && o.order_number === ref);
          if (found) setOrder(found);
          else setErr(tr("dashboard.notFound", L));
        } catch { setErr(tr("dashboard.notFound", L)); }
      }
    } catch { setErr(tr("dashboard.notFound", L)); }
    setLoading(false);
  }, [email, ref, L]);

  const handleUpload = async () => {
    if (!order?.order_number || !file) return;
    const rl = rateLimitCheck("dashboardUpload", (m: string) => toast(m, "no"));
    if (!rl.allowed) return;
    setUploading(true);
    try {
      if (sb && supabaseConfigured) {
        const fileName = `payment-proofs/${order.order_number}-${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
        const { error } = await sb.storage.from("payment-proofs").upload(fileName, file);
        if (error) throw error;
        // record payment
        await sb.from("payments").insert({
          order_id: order.id || order.order_number,
          order_number: order.order_number,
          customer_email: order.customer_email,
          amount: order.total,
          method: "manual",
          receipt_path: fileName,
          status: "pending",
        });
        rateLimitConsume("dashboardUpload");
        toast(tr("dashboard.success", L), "ok");
        setFile(null);
      } else {
        toast(tr("dashboard.success", L), "ok");
        setFile(null);
      }
    } catch (e) {
      console.error(e);
      toast(tr("dashboard.err", L), "no");
    }
    setUploading(false);
  };

  const statusIndex = (s: string) => statusOrder[s] ?? 0;

  return (
    <div className="app-shell">
      <header id="hd" className="app-header">
        <div className="w app-nav">
          <Link href="/" className="logo app-brand" passHref>
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <rect width="34" height="34" rx="10" fill="#f0b429" />
              <path d="M23 10c-2-2-9-2-9 2.5 0 5 11 2.5 11 8 0 4.5-8 4.5-12 1.5" stroke="#0e2624" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            </svg>
            Sutra <span style={{ fontWeight: 400, opacity: 0.7 }}>Studio</span>
          </Link>
          <nav className="nl app-menu" id="nl" aria-label="Main">
            <a href="/">Home</a>
            <a href="/checkout">Order a Website</a>
            <a href="/dashboard" className="active">Track Order</a>
            <a href="/admin">Admin</a>
          </nav>
          <div className="app-actions">
            <div className="lang" role="group" aria-label="Language">
              <button data-l="en" aria-pressed={L === "en"} onClick={() => { localStorage.setItem("sutra-lang", "en"); window.location.reload(); }}>EN</button>
              <button data-l="ne" aria-pressed={L === "ne"} lang="ne" onClick={() => { localStorage.setItem("sutra-lang", "ne"); window.location.reload(); }}>नेपाली</button>
            </div>
            <a href="/checkout" className="btn p" style={{ padding: ".55rem 1.1rem", fontSize: ".92rem" }}>{tr("header.checkout", L)}</a>
            <button className="app-menu-toggle" id="bg" aria-expanded="false" aria-label="Menu"><span></span><span></span></button>
          </div>
        </div>
      </header>
      <main>
        <div className="w">
          <section aria-label="Order tracking">
            <h1>{tr("dashboard.title", L)}</h1>
            <p className="sub">{tr("dashboard.subtitle", L)}</p>

            {!order ? (
              <form id="track-form" noValidate onSubmit={(e) => { e.preventDefault(); trackOrder(); }} className="co" style={{ marginTop: "2rem", maxWidth: "560px" }}>
                <div className="fd"><label><span>{tr("dashboard.emailLabel", L)}</span><span style={{ color: "var(--rho)" }}>*</span></label><input id="c-email" name="email" type="email" defaultValue={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div className="fd"><label><span>{tr("dashboard.refLabel", L)}</span><span style={{ color: "var(--rho)" }}>*</span></label><input id="c-ref" name="ref" defaultValue={ref} onChange={(e) => setRef(e.target.value)} required /></div>
                {err && <div className="er" style={{ marginTop: ".5rem" }}>{err}</div>}
                <div className="step-actions" style={{ marginTop: "1rem" }}>
                  <button className="btn p" disabled={loading}>{loading ? tr("ui.next", L) + "…" : tr("dashboard.btn", L)}</button>
                </div>
              </form>
            ) : (
              <>
                <div className="sm" style={{ marginTop: "1.5rem", padding: "1.5rem" }}>
                  <div className="sum-row"><span>{tr("dashboard.orderNumber", L)}</span><span className="mono" style={{ float: "right" }}>{order.order_number}</span></div>
                  <div className="sum-row"><span>{tr("dashboard.customer", L)}</span><span style={{ float: "right" }}>{order.customer_name}</span></div>
                  <div className="sum-row"><span>{tr("dashboard.package", L)}</span><span style={{ float: "right" }}>{order.package_name}</span></div>
                  <div className="sum-row"><span>{tr("dashboard.total", L)}</span><span className="mono" style={{ float: "right" }}>{npr(order.total)}</span></div>
                  <div className="sum-row"><span>{tr("dashboard.orderStatus", L)}</span><span className="mono" style={{ float: "right", textTransform: "uppercase" }}>{order.order_status}</span></div>
                  <div className="sum-row"><span>{tr("dashboard.paymentStatus", L)}</span><span className="mono" style={{ float: "right", textTransform: "uppercase" }}>{order.payment_status}</span></div>
                </div>

                <h2 style={{ margin: "2.5rem 0 1rem" }}>{tr("dashboard.progress", L)}</h2>
                <ol className="progress" style={{ marginTop: "0" }}>
                  {STATUS_STEPS.map((step, i) => {
                    const reached = statusIndex(order.order_status) >= i;
                    const current = statusIndex(order.order_status) === i;
                    return (
                      <li key={step.key} className={`p-step${reached ? " done" : ""}${current ? " current" : ""}`} data-step={String(i + 1)}>
                        <span className="p-num">{i + 1}</span>
                        <span className="p-label">{tr(step.labelKey, L)}</span>
                      </li>
                    );
                  })}
                </ol>

                <div style={{ marginTop: "2.5rem" }}>
                  <h2>{tr("dashboard.uploadTitle", L)}</h2>
                  <p className="sub">{tr("dashboard.uploadDesc", L)}</p>
                  <div className="fd" style={{ marginTop: "1rem", maxWidth: "400px" }}>
                    <label>{tr("dashboard.fileLabel", L)}</label>
                    <input id="c-receipt" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
                  </div>
                  {file && <p className="note" style={{ marginTop: ".5rem" }}>{file.name} ({Math.round(file.size / 1024)} KB)</p>}
                  <div className="step-actions" style={{ marginTop: "1rem" }}>
                    <button className="btn p" disabled={uploading || !file} onClick={handleUpload}>
                      {uploading ? tr("dashboard.uploading", L) : tr("dashboard.btnUpload", L)}
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: "1rem" }}><Link href="/">← {tr("ui.previous", L)}</Link></div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
