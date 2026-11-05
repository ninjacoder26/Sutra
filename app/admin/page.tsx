"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { tr, Lang } from "@/lib/i18n";
import { sb, supabaseConfigured } from "@/lib/supabase";
import { toast, rateLimitCheck, rateLimitConsume, formatNPR, dateShort, escapeHtml } from "@/lib/ui";
import { APP, PACKAGES } from "@/lib/config";

const npr = (n: number) => `रु. ${(Number(n) || 0).toLocaleString("en-IN")}`;

const TABS: any[] = [
  { key: "overview", labelKey: "admin.overview" },
  { key: "orders", labelKey: "admin.orders" },
  { key: "payments", labelKey: "admin.payments" },
  { key: "customers", labelKey: "admin.customers" },
  { key: "packages", labelKey: "admin.packages" },
  { key: "settings", labelKey: "admin.settings" },
];

export default function Admin() {
  const [L, setL] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("sutra-lang");
      return (s === "en" || s === "ne" ? s : "en") as Lang;
    }
    return "en";
  });
  const [unlocked, setUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [tab, setTab] = useState("overview");

  // Data
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [packagesList, setPackagesList] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Modals
  const [openModal, setOpenModal] = useState<null | "order" | "payment" | "package">(null);
  const [modalItem, setModalItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try { if (localStorage.getItem("sutra-admin-unlocked") === "1") setUnlocked(true); } catch {}
    }
  }, []);

  const checkAccess = useCallback(() => {
    if (accessCode === APP.adminCode) {
      setUnlocked(true);
      try { localStorage.setItem("sutra-admin-unlocked", "1"); } catch {}
      setErr("");
    } else {
      setErr(tr("admin.invalidCode", L));
    }
  }, [accessCode, L]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (sb && supabaseConfigured) {
        const [oRes, pRes, cRes, pkRes, sRes] = await Promise.all([
          sb.from("orders").select("*").order("created_at", { ascending: false }),
          sb.from("payments").select("*").order("created_at", { ascending: false }),
          sb.from("profiles").select("*").order("created_at", { ascending: false }),
          sb.from("packages").select("*").order("sort_order", { ascending: true }),
          sb.from("site_settings").select("*"),
        ]);
        if (!oRes.error) setOrders(oRes.data || []);
        if (!pRes.error) setPayments(pRes.data || []);
        if (!cRes.error) setCustomers(cRes.data || []);
        if (!pkRes.error) setPackagesList(pkRes.data || PACKAGES);
        if (!sRes.error) {
          const map: any = {};
          (sRes.data || []).forEach((row: any) => { map[row.setting_key] = row.setting_value; });
          setSettings(map);
        }
      } else {
        setOrders([]);
        setPackagesList(PACKAGES);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { if (unlocked) loadData(); }, [unlocked]);

  // Computed stats
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const pendingOrders = orders.filter((o) => o.order_status === "Pending").length;
  const verifiedPayments = payments.filter((p) => p.status === "verified").length;

  const customerOrders = (email: string) => orders.filter((o) => o.customer_email === email).length;

  const statusColor = (s: string) => {
    switch (s) {
      case "Completed": return "#1a7e47";
      case "In Progress": return "#d97706";
      case "Confirmed": return "#2563eb";
      default: return "#6b7280";
    }
  };

  const openOrder = (o: any) => { setModalItem(o); setOpenModal("order"); };
  const openPayment = (p: any) => { setModalItem(p); setOpenModal("payment"); };
  const openPackage = (p: any) => { setModalItem(p); setOpenModal("package"); };

  const updateOrderStatus = async (id: string, status: string) => {
    setSaving(true);
    try {
      if (sb && supabaseConfigured) {
        const { error } = await sb.from("orders").update({ order_status: status }).eq("id", id);
        if (error) throw error;
        setOrders(orders.map((o) => o.id === id ? { ...o, order_status: status } : o));
        toast("Status updated", "ok");
      }
      setOpenModal(null);
    } catch (e) { toast("Failed to update status", "no"); }
    setSaving(false);
  };

  const verifyPayment = async (id: string, verify: boolean) => {
    setSaving(true);
    try {
      if (sb && supabaseConfigured) {
        const { error } = await sb.from("payments").update({ status: verify ? "verified" : "rejected", verified_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
        setPayments(payments.map((p) => p.id === id ? { ...p, status: verify ? "verified" : "rejected" } : p));
        toast(verify ? "Payment verified" : "Payment rejected", "ok");
      }
      setOpenModal(null);
    } catch (e) { toast("Failed to update payment", "no"); }
    setSaving(false);
  };

  const savePackage = async (pkg: any) => {
    setSaving(true);
    try {
      if (sb && supabaseConfigured) {
        const { error } = await sb.from("packages").upsert({ ...pkg, active: true }).select().single();
        if (error) throw error;
        await loadData();
        toast("Package saved", "ok");
      }
      setOpenModal(null);
    } catch (e) { toast("Failed to save package", "no"); }
    setSaving(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      if (sb && supabaseConfigured) {
        const keys: any = {};
        Object.entries(settings).forEach(([k, v]) => { if (v !== undefined && v !== null) keys[k] = v; });
        await Promise.all(Object.entries(keys).map(([k, v]) =>
          sb.from("site_settings").upsert({ setting_key: k, setting_value: String(v) })
        ));
        toast("Settings saved", "ok");
      }
      setSaving(false);
    } catch (e) { toast("Failed to save settings", "no"); }
  };

  if (!unlocked) {
    return (
      <div className="app-shell">
        <header id="hd" className="app-header">
          <div className="w app-nav">
            <Link href="/" className="logo app-brand" passHref>Sutra Studio</Link>
            <a href="/" className="btn">{tr("ui.previous", L)}</a>
          </div>
        </header>
        <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 64px)" }}>
          <div className="sm" style={{ maxWidth: "400px", width: "90%", textAlign: "center" }}>
            <h1 style={{ marginBottom: ".5rem" }}>{tr("admin.accessTitle", L)}</h1>
            <p className="sub">{tr("admin.accessDesc", L)}</p>
            <div className="fd" style={{ marginTop: "1.5rem" }}>
              <label>{tr("admin.codeLabel", L)}</label>
              <input id="c-admin-code" type="text" defaultValue={accessCode} onChange={(e) => setAccessCode(e.target.value)} />
            </div>
            {err && <div className="er" style={{ marginTop: ".75rem" }}>{err}</div>}
            <div className="step-actions" style={{ marginTop: "1.5rem", justifyContent: "center" }}>
              <button className="btn p" onClick={checkAccess}>{tr("admin.btnEnter", L)}</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header id="hd" className="app-header">
        <div className="w app-nav">
          <Link href="/" className="logo app-brand" passHref>Sutra Studio</Link>
          <nav className="nl app-menu" id="nl" aria-label="Admin">
            {TABS.map((t) => (
              <a key={t.key} href="#" className={tab === t.key ? "active" : ""} onClick={(e) => { e.preventDefault(); setTab(t.key); }}>{tr(t.labelKey, L)}</a>
            ))}
            <a href="/dashboard" style={{ marginLeft: "1rem" }}>{tr("dashboard.title", L)}</a>
          </nav>
          <div className="app-actions">
            <div className="lang" role="group" aria-label="Language">
              <button data-l="en" aria-pressed={L === "en"} onClick={() => { localStorage.setItem("sutra-lang", "en"); window.location.reload(); }}>EN</button>
              <button data-l="ne" aria-pressed={L === "ne"} lang="ne" onClick={() => { localStorage.setItem("sutra-lang", "ne"); window.location.reload(); }}>नेपाली</button>
            </div>
            <button className="btn" onClick={() => { setUnlocked(false); localStorage.removeItem("sutra-admin-unlocked"); }}>{tr("admin.logout", L)}</button>
          </div>
        </div>
      </header>
      <main style={{ paddingTop: "1rem" }}>
        <div className="w">
          <h1>{tr("admin.title", L)}</h1>
          <p className="sub">{tr("admin.subtitle", L)}</p>

          {/* Overview */}
          {tab === "overview" && (
            <section style={{ marginTop: "2rem" }}>
              <div className="pg" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
                <div className="pk" style={{ padding: "1.2rem" }}>
                  <div style={{ fontSize: ".85rem", color: "var(--mut)" }}>{tr("admin.totalOrders", L)}</div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{totalOrders}</div>
                </div>
                <div className="pk" style={{ padding: "1.2rem" }}>
                  <div style={{ fontSize: ".85rem", color: "var(--mut)" }}>{tr("admin.totalRevenue", L)}</div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{npr(totalRevenue)}</div>
                </div>
                <div className="pk" style={{ padding: "1.2rem" }}>
                  <div style={{ fontSize: ".85rem", color: "var(--mut)" }}>{tr("admin.pendingOrders", L)}</div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{pendingOrders}</div>
                </div>
                <div className="pk" style={{ padding: "1.2rem" }}>
                  <div style={{ fontSize: ".85rem", color: "var(--mut)" }}>{tr("admin.verifiedPayments", L)}</div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{verifiedPayments}</div>
                </div>
              </div>

              <div style={{ marginTop: "2rem", maxWidth: "700px" }}>
                <h2 style={{ marginBottom: "1rem" }}>{tr("admin.orders", L)}</h2>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                      <th style={{ padding: ".75rem", fontSize: ".9rem", color: "var(--mut)" }}>{tr("admin.orderNumber", L)}</th>
                      <th style={{ padding: ".75rem", fontSize: ".9rem", color: "var(--mut)" }}>{tr("admin.customer", L)}</th>
                      <th style={{ padding: ".75rem", fontSize: ".9rem", color: "var(--mut)" }}>{tr("admin.amount", L)}</th>
                      <th style={{ padding: ".75rem", fontSize: ".9rem", color: "var(--mut)" }}>{tr("admin.status", L)}</th>
                      <th style={{ padding: ".75rem", fontSize: ".9rem", color: "var(--mut)" }}>{tr("admin.payment", L)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 10).map((o) => (
                      <tr key={o.id || o.order_number} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: ".75rem", fontFamily: "mono" }}>{o.order_number}</td>
                        <td style={{ padding: ".75rem" }}>{o.customer_name}</td>
                        <td style={{ padding: ".75rem", fontFamily: "mono" }}>{npr(o.total)}</td>
                        <td style={{ padding: ".75rem" }}><span style={{ color: statusColor(o.order_status), fontWeight: 600, textTransform: "uppercase" }}>{o.order_status}</span></td>
                        <td style={{ padding: ".75rem" }}>{o.payment_status}</td>
                        <td style={{ padding: ".75rem" }}><button className="btn" style={{ padding: ".4rem .8rem", fontSize: ".85rem" }} onClick={() => openOrder(o)}>View</button></td>
                      </tr>
                    ))}
                    {orders.length === 0 && <tr><td colSpan={6} style={{ padding: "1.5rem", color: "var(--mut)", textAlign: "center" }}>{tr("admin.noOrders", L)}</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Orders */}
          {tab === "orders" && (
            <section style={{ marginTop: "2rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "2px solid var(--ink)" }}>
                    <th style={{ padding: ".75rem" }}>{tr("admin.orderNumber", L)}</th>
                    <th style={{ padding: ".75rem" }}>{tr("admin.customer", L)}</th>
                    <th style={{ padding: ".75rem" }}>{tr("admin.package", L)}</th>
                    <th style={{ padding: ".75rem" }}>{tr("admin.amount", L)}</th>
                    <th style={{ padding: ".75rem" }}>{tr("admin.status", L)}</th>
                    <th style={{ padding: ".75rem" }}>{tr("admin.payment", L)}</th>
                    <th style={{ padding: ".75rem" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id || o.order_number} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: ".75rem", fontFamily: "mono" }}>{o.order_number}</td>
                      <td style={{ padding: ".75rem" }}>{o.customer_name}</td>
                      <td style={{ padding: ".75rem" }}>{o.package_name}</td>
                      <td style={{ padding: ".75rem", fontFamily: "mono" }}>{npr(o.total)}</td>
                      <td style={{ padding: ".75rem" }}><span style={{ color: statusColor(o.order_status), fontWeight: 600 }}>{o.order_status}</span></td>
                      <td style={{ padding: ".75rem" }}>{o.payment_status}</td>
                      <td style={{ padding: ".75rem" }}><button className="btn" style={{ padding: ".4rem .8rem", fontSize: ".85rem" }} onClick={() => openOrder(o)}>View</button></td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan={7} style={{ padding: "1.5rem", color: "var(--mut)", textAlign: "center" }}>{tr("admin.noOrders", L)}</td></tr>}
                </tbody>
              </table>
            </section>
          )}

          {/* Payments */}
          {tab === "payments" && (
            <section style={{ marginTop: "2rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "2px solid var(--ink)" }}>
                    <th style={{ padding: ".75rem" }}>{tr("admin.orderNumber", L)}</th>
                    <th style={{ padding: ".75rem" }}>{tr("admin.customer", L)}</th>
                    <th style={{ padding: ".75rem" }}>{tr("admin.amount", L)}</th>
                    <th style={{ padding: ".75rem" }}>{tr("admin.status", L)}</th>
                    <th style={{ padding: ".75rem" }}>{tr("admin.receipt", L)}</th>
                    <th style={{ padding: ".75rem" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: ".75rem", fontFamily: "mono" }}>{p.order_number}</td>
                      <td style={{ padding: ".75rem" }}>{p.customer_email}</td>
                      <td style={{ padding: ".75rem", fontFamily: "mono" }}>{npr(p.amount)}</td>
                      <td style={{ padding: ".75rem" }}><span style={{ color: p.status === "verified" ? "#1a7e47" : p.status === "rejected" ? "#dc2626" : "#d97706", fontWeight: 600 }}>{p.status}</span></td>
                      <td style={{ padding: ".75rem" }}>{p.receipt_path ? <a href="#" style={{ color: "#2563eb" }} onClick={(e) => { e.preventDefault(); openPayment(p); }}>View</a> : "—"}</td>
                      <td style={{ padding: ".75rem" }}>
                        {p.status !== "verified" && <button className="btn p" style={{ padding: ".35rem .7rem", fontSize: ".8rem", marginRight: ".3rem" }} onClick={() => verifyPayment(p.id, true)}>{tr("admin.verify", L)}</button>}
                        {p.status !== "rejected" && <button className="btn" style={{ padding: ".35rem .7rem", fontSize: ".8rem" }} onClick={() => verifyPayment(p.id, false)}>{tr("admin.reject", L)}</button>}
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && <tr><td colSpan={6} style={{ padding: "1.5rem", color: "var(--mut)", textAlign: "center" }}>{tr("admin.noOrders", L)}</td></tr>}
                </tbody>
              </table>
            </section>
          )}

          {/* Customers */}
          {tab === "customers" && (
            <section style={{ marginTop: "2rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "2px solid var(--ink)" }}>
                    <th style={{ padding: ".75rem" }}>{tr("admin.customer", L)}</th>
                    <th style={{ padding: ".75rem" }}>{tr("admin.email", L)}</th>
                    <th style={{ padding: ".75rem" }}>{tr("admin.orders", L)}</th>
                    <th style={{ padding: ".75rem" }}>{tr("admin.amount", L)}</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: ".75rem" }}>{c.full_name || c.business_name || c.email}</td>
                      <td style={{ padding: ".75rem", fontFamily: "mono" }}>{c.email}</td>
                      <td style={{ padding: ".75rem" }}>{customerOrders(c.email)}</td>
                      <td style={{ padding: ".75rem", fontFamily: "mono" }}>{npr(orders.filter((o) => o.customer_email === c.email).reduce((s, o) => s + Number(o.total || 0), 0))}</td>
                    </tr>
                  ))}
                  {customers.length === 0 && <tr><td colSpan={4} style={{ padding: "1.5rem", color: "var(--mut)", textAlign: "center" }}>{tr("admin.noOrders", L)}</td></tr>}
                </tbody>
              </table>
            </section>
          )}

          {/* Packages */}
          {tab === "packages" && (
            <section style={{ marginTop: "2rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "2px solid var(--ink)" }}>
                    <th style={{ padding: ".75rem" }}>{tr("admin.package", L)}</th>
                    <th style={{ padding: ".75rem" }}>{tr("admin.amount", L)}</th>
                    <th style={{ padding: ".75rem" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {packagesList.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: ".75rem" }}>{p.name}</td>
                      <td style={{ padding: ".75rem", fontFamily: "mono" }}>{npr(p.price)}</td>
                      <td style={{ padding: ".75rem" }}><button className="btn" style={{ padding: ".4rem .8rem", fontSize: ".85rem" }} onClick={() => openPackage(p)}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Settings */}
          {tab === "settings" && (
            <section style={{ marginTop: "2rem", maxWidth: "560px" }}>
              <h2 style={{ marginBottom: "1rem" }}>{tr("admin.settingsTitle", L)}</h2>
              <form id="settings-form" noValidate onSubmit={(e) => { e.preventDefault(); saveSettings(); }} className="co" style={{ marginTop: "1rem" }}>
                <div className="fd"><label>{tr("admin.siteName", L)}</label><input id="c-site-name" name="site_name" defaultValue={settings.site_name || "Sutra Studio"} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })} /></div>
                <div className="fd"><label>{tr("admin.whatsapp", L)}</label><input id="c-whatsapp" name="whatsapp" defaultValue={settings.whatsapp || APP.whatsapp} onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })} /></div>
                <div className="fd"><label>{tr("admin.emailAdmin", L)}</label><input id="c-email" name="email" type="email" defaultValue={settings.email || APP.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} /></div>
                <div className="fd"><label>{tr("admin.bankDetails", L)}</label><textarea id="c-bank" name="bank" defaultValue={settings.bank || APP.bank} onChange={(e) => setSettings({ ...settings, bank: e.target.value })} rows={3} /></div>
                <div className="fd"><label>{tr("admin.domainPrice", L)}</label><input id="c-domain-price" name="domain_price" type="number" defaultValue={settings.domain_price || APP.defaultDomainPrice} onChange={(e) => setSettings({ ...settings, domain_price: e.target.value })} /></div>
                <div className="step-actions" style={{ marginTop: "1.5rem" }}>
                  <button className="btn p" disabled={saving}>{saving ? tr("ui.next", L) + "…" : tr("admin.save", L)}</button>
                </div>
              </form>
            </section>
          )}
        </div>

        {/* Modals */}
        {openModal === "order" && modalItem && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="pk" style={{ maxWidth: "560px", width: "90%", position: "relative" }}>
              <button onClick={() => setOpenModal(null)} style={{ position: "absolute", top: ".5rem", right: ".8rem", background: "none", border: 0, fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
              <h2>{modalItem.order_number}</h2>
              <p>{modalItem.customer_name} — {modalItem.customer_email}</p>
              <div className="sum-row"><span>Package</span><span>{modalItem.package_name}</span></div>
              <div className="sum-row"><span>Total</span><span>{npr(modalItem.total)}</span></div>
              <div className="sum-row"><span>Status</span><span style={{ color: statusColor(modalItem.order_status), fontWeight: 600 }}>{modalItem.order_status}</span></div>
              <div className="sum-row"><span>Payment</span><span>{modalItem.payment_status}</span></div>
              <div style={{ marginTop: "1.5rem", display: "flex", gap: ".5rem" }}>
                <button className="btn p" disabled={saving} onClick={() => updateOrderStatus(modalItem.id, "Confirmed")}>Confirm</button>
                <button className="btn" disabled={saving} onClick={() => updateOrderStatus(modalItem.id, "In Progress")}>In Progress</button>
                <button className="btn" disabled={saving} onClick={() => updateOrderStatus(modalItem.id, "Completed")}>Complete</button>
              </div>
            </div>
          </div>
        )}

        {openModal === "payment" && modalItem && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="pk" style={{ maxWidth: "560px", width: "90%", position: "relative" }}>
              <button onClick={() => setOpenModal(null)} style={{ position: "absolute", top: ".5rem", right: ".8rem", background: "none", border: 0, fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
              <h2>{tr("admin.receipt", L)}</h2>
              <p>{modalItem.order_number}</p>
              <div className="sum-row"><span>{tr("admin.customer", L)}</span><span>{modalItem.customer_email}</span></div>
              <div className="sum-row"><span>{tr("admin.amount", L)}</span><span>{npr(modalItem.amount)}</span></div>
              <div className="sum-row"><span>{tr("admin.status", L)}</span><span style={{ fontWeight: 600 }}>{modalItem.status}</span></div>
              {modalItem.receipt_path && <p className="note">{escapeHtml(modalItem.receipt_path)}</p>}
              <div style={{ marginTop: "1.5rem", display: "flex", gap: ".5rem" }}>
                <button className="btn p" disabled={saving} onClick={() => verifyPayment(modalItem.id, true)}>{tr("admin.verify", L)}</button>
                <button className="btn" disabled={saving} onClick={() => verifyPayment(modalItem.id, false)}>{tr("admin.reject", L)}</button>
              </div>
            </div>
          </div>
        )}

        {openModal === "package" && modalItem && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="pk" style={{ maxWidth: "560px", width: "90%", position: "relative" }}>
              <button onClick={() => setOpenModal(null)} style={{ position: "absolute", top: ".5rem", right: ".8rem", background: "none", border: 0, fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
              <h2>{tr("admin.package", L)}</h2>
              <form noValidate onSubmit={(e) => { e.preventDefault(); savePackage({ ...modalItem, name: (document.getElementById("c-pkg-name") as HTMLInputElement).value, price: Number((document.getElementById("c-pkg-price") as HTMLInputElement).value) }); }}>
                <div className="fd"><label>Name</label><input id="c-pkg-name" name="name" defaultValue={modalItem.name} /></div>
                <div className="fd"><label>Price (NPR)</label><input id="c-pkg-price" name="price" type="number" defaultValue={modalItem.price} /></div>
                <div className="step-actions" style={{ marginTop: "1.5rem" }}>
                  <button className="btn p" disabled={saving}>{tr("admin.save", L)}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
