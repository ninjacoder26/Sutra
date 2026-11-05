"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useT, Lang } from "@/lib/i18n";
import { tr } from "@/lib/i18n";
import { sb, supabaseConfigured } from "@/lib/supabase";
import { toast, rateLimitCheck, rateLimitConsume } from "@/lib/ui";
import { APP, HOSTING_OPTIONS, DOMAIN_OPTIONS, CATEGORIES, PURPOSES, DESIGN_STYLES, FUNCTIONALITY, COMM_CHANNELS } from "@/lib/config";

const npr = (n: number) => `रु. ${(Number(n) || 0).toLocaleString("en-IN")}`;

const FALLBACK_PACKAGES: any[] = [
  { id: "standard", name: "Standard", name_ne: "स्टान्डर्ड", price: 2499, days: "7–10", featured: false, desc: "For individuals, small shops and first websites.", desc_ne: "व्यक्ति, साना पसल र पहिलो पटक वेबसाइट बनाउनेका लागि।", features: ["Up to 3 pages", "Modern responsive design", "Contact info and business details", "Basic SEO setup", "WhatsApp contact integration", "Mobile and desktop optimisation"] },
  { id: "professional", name: "Professional", name_ne: "प्रोफेसनल", price: 4999, days: "10–14", featured: true, desc: "For growing businesses that need a stronger presence.", desc_ne: "अनलाइन उपस्थिति बलियो बनाउन चाहने बढ्दो व्यवसायका लागि।", features: ["Up to 6 pages", "Custom-designed website", "Everything in Standard", "Gallery or portfolio section", "Contact form", "Advanced visual customisation", "SEO optimisation"] },
  { id: "premium", name: "Premium", name_ne: "प्रिमियम", price: 8499, days: "14–18", featured: false, desc: "For a more complete website experience.", desc_ne: "अझ पूर्ण वेबसाइट अनुभव चाहनेका लागि।", features: ["Up to 10 pages", "Premium custom design", "Everything in Professional", "Advanced interactions and animations", "Additional customisation", "Enhanced SEO setup", "Priority development"] },
];

const STEP_LABELS: any = {
  en: ["Package", "Configuration", "Hosting & Domain", "Customer Details", "Summary", "Submit"],
  ne: ["प्याकेज", "कन्फिगरेशन", "होस्टिङ र डोमेन", "ग्राहक विवरण", "सारांश", "बुझाउनुहोस्"],
};

export default function Checkout() {
  const { t, l: contextLang, set: setContextLang } = useT();
  const [L, setL] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("sutra-lang");
      return (s === "en" || s === "ne" ? s : "en") as Lang;
    }
    return "en";
  });
  useEffect(() => {
    if (contextLang !== L) setL(contextLang);
  }, [contextLang, L]);

  const [step, setStep] = useState(1);

  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  const [step2, setStep2] = useState({
    businessName: "", category: "", websiteType: "", description: "", purpose: "",
    designStyle: "", preferredColors: "", pages: 1, functionality: [] as string[], otherFeature: "", instructions: "",
  });

  const [step3, setStep3] = useState({
    hosting: "vercel", domain: "none", hostProvider: "", hostProviderOther: "",
    domainName: "", domainRegistrar: "", domainDns: "no",
    exDomainName: "", exDomainRegistrar: "", exDomainDns: "no",
  });

  const [step4, setStep4] = useState({
    fullName: "", email: "", phone: "", whatsapp: "", businessName: "", location: "", channel: "",
  });

  const [domainPrice, setDomainPrice] = useState(APP.defaultDomainPrice);
  const [orderDraft, setOrderDraft] = useState<any>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      let rows: any[] = [];
      if (sb) {
        try {
          const { data, error } = await sb.from("packages").select("*").eq("active", true).order("sort_order", { ascending: true });
          if (!error && data) rows = data;
        } catch { /* ignore */ }
      }
      if (!rows.length) rows = FALLBACK_PACKAGES.map((p, i) => ({ ...p, sort_order: i, active: true }));
      if (!rows.some((r) => r.featured) && rows.length >= 2) rows[1].featured = true;
      if (mounted) setPackages(rows);
    })();
    if (sb && mounted) {
      sb.from("site_settings").select("setting_value").eq("setting_key", "domain_price").single().then(({ data, error }: any) => {
        if (mounted && !error && data) {
          const v = Number((data as any).setting_value);
          if (!Number.isNaN(v)) setDomainPrice(v);
        }
      });
    }
    return () => { mounted = false; };
  }, [sb]);

  useEffect(() => {
    const pkg = selectedPackage;
    const pkgPrice = pkg ? Number(pkg.price) : 0;
    const hostPrice = step3.hosting === "vercel" ? APP.defaultVercelPrice : 0;
    let domPrice = 0;
    if (step3.domain === "custom") domPrice = Number(domainPrice);
    const total = pkgPrice + hostPrice + domPrice;
    const pkgName = pkg ? (L === "ne" && pkg.name_ne ? pkg.name_ne : pkg.name) : "\u2014";
    setOrderDraft({ packageId: pkg ? pkg.id : null, packageName: pkgName, packagePrice: pkgPrice, hosting: step3.hosting, hostingPrice: hostPrice, domain: step3.domain, domainPrice: domPrice, total });
  }, [selectedPackage, step3, domainPrice, L]);

  const validate = useCallback((n: number): boolean => {
    setErrors({});
    if (n === 1) {
      if (!selectedPackage) { setErrors({ 1: tr("validation.selectPackage", L) }); return false; }
      return true;
    }
    if (n === 2) {
      if (!step2.businessName.trim()) { setErrors({ 2: tr("validation.required", L) }); return false; }
      if (!step2.category) { setErrors({ 2: tr("validation.required", L) }); return false; }
      if (!step2.websiteType) { setErrors({ 2: tr("validation.required", L) }); return false; }
      if (!step2.purpose) { setErrors({ 2: tr("validation.required", L) }); return false; }
      if (!step2.designStyle) { setErrors({ 2: tr("validation.required", L) }); return false; }
      if (!step2.pages) { setErrors({ 2: tr("validation.required", L) }); return false; }
      if (!step2.functionality || step2.functionality.length === 0) { setErrors({ 2: tr("validation.selectFunctionality", L) }); return false; }
      if (step2.functionality.includes("Other custom features") && !step2.otherFeature.trim()) { setErrors({ 2: tr("validation.required", L) }); return false; }
      return true;
    }
    if (n === 3) {
      if (!step3.hosting) { setErrors({ 3: tr("validation.required", L) }); return false; }
      if (!step3.domain) { setErrors({ 3: tr("validation.required", L) }); return false; }
      if (step3.hosting === "existing") {
        const prov = step3.hostProvider || step3.hostProviderOther || "";
        if (!prov.trim()) { setErrors({ 3: tr("validation.providerRequired", L) }); return false; }
      }
      if (step3.domain === "custom") {
        if (!step3.domainName.trim()) { setErrors({ 3: tr("validation.domainRequired", L) }); return false; }
        if (!step3.domainRegistrar.trim()) { setErrors({ 3: tr("validation.registrarRequired", L) }); return false; }
      }
      if (step3.domain === "existing") {
        if (!step3.exDomainName.trim()) { setErrors({ 3: tr("validation.domainRequired", L) }); return false; }
        if (!step3.exDomainRegistrar.trim()) { setErrors({ 3: tr("validation.registrarRequired", L) }); return false; }
      }
      return true;
    }
    if (n === 4) {
      if (!step4.fullName.trim()) { setErrors({ 4: tr("validation.required", L) }); return false; }
      if (!step4.email.trim()) { setErrors({ 4: tr("validation.required", L) }); return false; }
      if (!step4.phone.trim()) { setErrors({ 4: tr("validation.required", L) }); return false; }
      if (!step4.channel) { setErrors({ 4: tr("validation.required", L) }); return false; }
      return true;
    }
    if (n === 5) {
      if (!selectedPackage) { setErrors({ 5: tr("validation.selectPackage", L) }); return false; }
      return true;
    }
    return true;
  }, [L, selectedPackage, step2, step3, step4]);

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(5)) return;

    const rl = rateLimitCheck("checkoutSubmit", (msg: string) => toast(msg, "no"));
    if (!rl.allowed) return;

    const orderNumber = APP.orderPrefix + "-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const order: any = {
      order_number: orderNumber,
      customer_name: step4.fullName,
      customer_email: step4.email,
      customer_phone: step4.phone,
      business_name: step4.businessName,
      package_id: selectedPackage?.id || null,
      package_name: orderDraft.packageName,
      package_price: orderDraft.packagePrice,
      website_type: step2.websiteType,
      website_description: step2.description,
      website_requirements: {
        category: step2.category, purpose: step2.purpose, designStyle: step2.designStyle,
        preferredColors: step2.preferredColors, pages: step2.pages,
        functionality: step2.functionality, otherFeature: step2.otherFeature, instructions: step2.instructions,
      },
      hosting_option: step3.hosting,
      hosting_provider: step3.hostProvider || step3.hostProviderOther || "",
      hosting_price: orderDraft.hostingPrice,
      domain_option: step3.domain,
      domain_name: step3.domainName || step3.exDomainName || "",
      domain_registrar: step3.domainRegistrar || step3.exDomainRegistrar || "",
      domain_dns: step3.domainDns || step3.exDomainDns || "no",
      domain_price: orderDraft.domainPrice,
      add_ons: step2.functionality,
      subtotal: orderDraft.packagePrice,
      total: orderDraft.total,
      language: L,
      payment_status: "pending",
      order_status: "Pending",
    };

    setSubmitting(true);
    let result: any = null;
    if (sb && supabaseConfigured) {
      try {
        const { data, error } = await (sb.from("orders").insert(order as any) as any).select().single();
        if (error) throw error;
        result = data;
        rateLimitConsume("checkoutSubmit");
      } catch (e) {
        console.warn("Order insert failed:", e);
        result = null;
      }
    }
    setSubmitting(false);

    if (result?.order_number) {
      setConfirmed(result);
      setStep(6);
    } else {
      try {
        const pending = JSON.parse(localStorage.getItem("sutra-pending-orders") || "[]");
        pending.push({ ...order, ref: orderNumber, localOnly: true, createdAt: new Date().toISOString() });
        localStorage.setItem("sutra-pending-orders", JSON.stringify(pending));
      } catch { /* ignore */ }
      setConfirmed({ order_number: orderNumber, total: orderDraft.total, localOnly: true });
      setStep(6);
    }
  };

  const pkgLabel = (p: any) => (L === "ne" ? (p.name_ne || p.name) : p.name);
  const pkgDesc = (p: any) => (L === "ne" ? (p.desc_ne || p.desc) : p.desc);

  const trLabel = (label: string) => {
    const map: Record<string, Record<string, string>> = {
      "Vercel Hosting (free)": { en: "Vercel Hosting (free)", ne: "Vercel होस्टिङ (निःशुल्क)" },
      "Custom domain (NPR 1,599)": { en: "Custom domain (NPR 1,599)", ne: "कस्टम डोमेन (रु. 1,599)" },
      "Connect existing domain (free)": { en: "Connect existing domain (free)", ne: "पहिलेदेखि रहेको डोमेन कनेक्ट गर्नुहोस् (निःशुल्क)" },
      "No domain / Vercel subdomain (free)": { en: "No domain / Vercel subdomain (free)", ne: "डोमेन नभएको / Vercel उपडोमेन (निःशुल्क)" },
      "Existing hosting provider": { en: "Existing hosting provider", ne: "पहिलेदेखि रहेको होस्टिङ प्रदायक" },
    };
    return map[label]?.[L] || label;
  };

  const stepLabels = STEP_LABELS[L as keyof typeof STEP_LABELS] || STEP_LABELS.en;
  const pct = ((step - 1) / 5) * 100;

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
            <a href="/checkout" className="active">Order a Website</a>
            <a href="/dashboard">Track Order</a>
            <a href="/admin">Admin</a>
          </nav>
          <div className="app-actions">
            <div className="lang" role="group" aria-label="Language">
              <button data-l="en" aria-pressed={L === "en"} onClick={() => { setL("en"); setContextLang("en"); try { localStorage.setItem("sutra-lang", "en"); } catch {} }}>EN</button>
              <button data-l="ne" aria-pressed={L === "ne"} lang="ne" onClick={() => { setL("ne"); setContextLang("ne"); try { localStorage.setItem("sutra-lang", "ne"); } catch {} }}>नेपाली</button>
            </div>
            <a href="/checkout" className="btn p" style={{ padding: ".55rem 1.1rem", fontSize: ".92rem" }}>{tr("header.checkout", L)}</a>
            <button className="app-menu-toggle" id="bg" aria-expanded="false" aria-label="Menu"><span></span><span></span></button>
          </div>
        </div>
      </header>
      <main>
        <div className="w coh">
          <h1>{tr("checkout.title", L)}</h1>
          <p>{tr("checkout.subtitle", L)}</p>
        </div>

        <div className="cprog">
          <div className="cprog-line"><div className="cprog-fill" style={{ width: `${pct}%` }} /></div>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className={`cprog-dot${step >= n ? " done" : ""}${step === n ? " current" : ""}`}>{n}</div>
          ))}
        </div>
        <div className="cprog" style={{ marginTop: "-2rem", marginBottom: 0 }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className={`cprog-label${step >= n ? " done" : ""}`}>{stepLabels[n - 1]}</div>
          ))}
        </div>

        <div className="csteps">
          {/* Step 1: Package */}
          <div className={`cstep${step === 1 ? " active" : ""}`}>
            <h2 style={{ marginBottom: ".4rem" }}>{tr("checkout.step1.title", L)}</h2>
            <p className="sub" style={{ marginBottom: "1.5rem", color: "var(--mut)" }}>{tr("checkout.step1.desc", L)}</p>
            <div className="cpkg" id="pkg-grid">
              {packages.map((p: any, i: number) => {
                const featured = p.featured === true;
                const isSelected = selectedPackage === p;
                return (
                  <article key={i} className={`pkg${featured ? " featured" : ""}${isSelected ? " selected" : ""}`} onClick={() => { setSelectedPackage(p); setErrors((e) => ({ ...e, 1: "" })); }}>
                    {featured ? <span className="tag">{tr("checkout.step1.recommended", L)}</span> : null}
                    <h3 style={{ marginTop: 0 }}>{pkgLabel(p)}</h3>
                    <p>{pkgDesc(p)}</p>
                    <div className="pc">रु. {p.price}</div>
                    <span className="dl">{p.days}</span>
                    <ul>{(p.features || []).map((f: string) => <li key={f}>{f}</li>)}</ul>
                    <button className={`btn ${featured ? "p" : ""}`} style={{ width: "100%", marginTop: "auto" }} onClick={() => { setSelectedPackage(p); setErrors((e) => ({ ...e, 1: "" })); }}>{tr("checkout.step1.choose", L)}</button>
                  </article>
                );
              })}
            </div>
            {errors[1] && <div className="cerr">{errors[1]}</div>}
            <div className="cact" style={{ marginTop: "1.5rem", border: "none", paddingTop: 0, justifyContent: "flex-end" }}>
              <button className="btn p" id="next-1" onClick={() => { if (validate(1)) setStep(2); }}>{tr("ui.next", L)}</button>
            </div>
          </div>

          {/* Step 2: Configuration */}
          <div className={`cstep${step === 2 ? " active" : ""}`}>
            <h2 style={{ marginBottom: ".4rem" }}>{tr("checkout.step2.title", L)}</h2>
            <p className="sub" style={{ marginBottom: "1.5rem", color: "var(--mut)" }}>{tr("checkout.step2.desc", L)}</p>
            <form id="form-2" noValidate className="cform">
              <div className="cfd"><label><span>{tr("checkout.step2.businessName", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><input id="c-bizname" defaultValue={step2.businessName} onChange={(e) => setStep2((s) => ({ ...s, businessName: e.target.value }))} /></div>
              {errors[2] && <div className="cerr">{errors[2]}</div>}
              <div className="cfd"><label><span>{tr("checkout.step2.category", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><select id="c-category" defaultValue={step2.category} onChange={(e) => setStep2((s) => ({ ...s, category: e.target.value }))}><option value=""></option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div className="cfd"><label><span>{tr("checkout.step2.websiteType", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><select id="c-webtype" defaultValue={step2.websiteType} onChange={(e) => setStep2((s) => ({ ...s, websiteType: e.target.value }))}><option value=""></option>{PURPOSES.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div className="cfd fu"><label>{tr("checkout.step2.description", L)}</label><textarea id="c-desc" defaultValue={step2.description} onChange={(e) => setStep2((s) => ({ ...s, description: e.target.value }))} rows={4} /></div>
              <div className="cfd"><label><span>{tr("checkout.step2.purpose", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><select id="c-purpose" defaultValue={step2.purpose} onChange={(e) => setStep2((s) => ({ ...s, purpose: e.target.value }))}><option value=""></option>{PURPOSES.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div className="cfd"><label><span>{tr("checkout.step2.designStyle", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><select id="c-style" defaultValue={step2.designStyle} onChange={(e) => setStep2((s) => ({ ...s, designStyle: e.target.value }))}><option value=""></option>{DESIGN_STYLES.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div className="cfd"><label>{tr("checkout.step2.preferredColors", L)}</label><input id="c-colors" defaultValue={step2.preferredColors} onChange={(e) => setStep2((s) => ({ ...s, preferredColors: e.target.value }))} /></div>
              <div className="cfd"><label><span>{tr("checkout.step2.pages", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><select id="c-pages" defaultValue={String(step2.pages)} onChange={(e) => setStep2((s) => ({ ...s, pages: Number(e.target.value) }))}><option value=""></option>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => <option key={n}>{n}</option>)}</select></div>
              <div className="cfd"><label><span>{tr("checkout.step2.functionality", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><div className="cck" id="c-func-checks">
                {FUNCTIONALITY.map((f) => (
                  <label key={f} className={step2.functionality.includes(f) ? "active" : ""} onClick={(e) => {
                    e.preventDefault();
                    if (step2.functionality.includes(f)) setStep2((s) => ({ ...s, functionality: s.functionality.filter((x) => x !== f) }));
                    else setStep2((s) => ({ ...s, functionality: [...s.functionality, f] }));
                  }}>
                    <input type="checkbox" name="functionality" value={f} defaultChecked={step2.functionality.includes(f)} readOnly onChange={() => {}} />
                    {f}
                  </label>
                ))}
              </div><p className="em" id="c-func-note" style={{ fontSize: ".85rem", color: "var(--mut)" }}>{tr("checkout.step2.functionalityNote", L)}</p></div>
              <div className="cfd fu" id="c-other-func-wrap" hidden={!step2.functionality.includes("Other custom features")}>
                <label>{tr("checkout.step2.otherFeature", L)}</label><input id="c-other-func" defaultValue={step2.otherFeature} onChange={(e) => setStep2((s) => ({ ...s, otherFeature: e.target.value }))} />
              </div>
              <div className="cfd fu"><label>{tr("checkout.step2.instructions", L)}</label><textarea id="c-instr" defaultValue={step2.instructions} onChange={(e) => setStep2((s) => ({ ...s, instructions: e.target.value }))} rows={3} /></div>
            </form>
            <div className="cact" style={{ marginTop: "1rem", border: "none", paddingTop: 0, justifyContent: "space-between" }}>
              <button className="btn" id="prev-2" onClick={() => setStep(1)}>{tr("ui.previous", L)}</button>
              <button className="btn p" id="next-2" onClick={() => { if (validate(2)) setStep(3); }}>{tr("ui.next", L)}</button>
            </div>
          </div>

          {/* Step 3: Hosting & Domain */}
          <div className={`cstep${step === 3 ? " active" : ""}`}>
            <h2 style={{ marginBottom: ".4rem" }}>{tr("checkout.step3.title", L)}</h2>
            <p className="sub" style={{ marginBottom: "1.5rem", color: "var(--mut)" }}>{tr("checkout.step3.desc", L)}</p>
            <form id="form-3" noValidate className="cform">
              <div className="cfd"><label><span>{tr("checkout.step3.hosting", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label>
                <div style={{ display: "flex", gap: ".8rem", flexWrap: "wrap", marginTop: ".5rem" }}>
                  {HOSTING_OPTIONS.map((opt) => {
                    const selected = step3.hosting === opt.key;
                    const price = opt.priceKey ? domainPrice : (opt.price ?? 0);
                    return (
                      <label key={opt.key} className={`copt${selected ? " checked" : ""}`} onClick={() => { setStep3((s) => ({ ...s, hosting: opt.key })); }}>
                        <input type="radio" name="hosting" value={opt.key} defaultChecked={selected} style={{ display: "none" }} />
                        <div className="ot">{trLabel(opt.label)}</div>
                        <div className="op">{price === 0 ? tr("ui.free", L) : npr(price)}</div>
                      </label>
                    );
                  })}
                </div>
              </div>
              {errors[3] && <div className="cerr">{errors[3]}</div>}
              <div className="cfd fu" id="existing-hosting-wrap" hidden={step3.hosting !== "existing"}>
                <label><span>{tr("checkout.step3.existingHosting.provider", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label>
                <div className="cpp" id="provider-pills">
                  {["WorldLink", "Classic Tech", "Vianet", "Subisu", "Other"].map((p) => {
                    const isOther = p === "Other";
                    const active = step3.hostProvider === p || (isOther && !!step3.hostProviderOther);
                    return (
                      <label key={p} className={active ? "active" : ""} onClick={() => {
                        setStep3((s) => ({ ...s, hostProvider: isOther ? (step3.hostProviderOther || p) : p }));
                      }}>
                        <input type="radio" name="host-provider" value={p} defaultChecked={active} style={{ display: "none" }} />
                        {p}
                      </label>
                    );
                  })}
                </div>
                {step3.hostProvider === "Other" && (
                  <input id="c-host-provider-other" className="input" defaultValue={step3.hostProviderOther} onChange={(e) => setStep3((s) => ({ ...s, hostProviderOther: e.target.value, hostProvider: e.target.value || step3.hostProvider }))} placeholder="Enter provider name" style={{ marginTop: ".6rem", width: "100%" }} />
                )}
              </div>
              <div className="cfd"><label><span>{tr("checkout.step3.domain", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label>
                <div style={{ display: "flex", gap: ".8rem", flexWrap: "wrap", marginTop: ".5rem" }}>
                  {DOMAIN_OPTIONS.map((opt) => {
                    const selected = step3.domain === opt.key;
                    const price = opt.priceKey ? domainPrice : (opt.price ?? 0);
                    return (
                      <label key={opt.key} className={`copt${selected ? " checked" : ""}`} onClick={() => { setStep3((s) => ({ ...s, domain: opt.key })); }}>
                        <input type="radio" name="domain" value={opt.key} defaultChecked={selected} style={{ display: "none" }} />
                        <div className="ot">{trLabel(opt.label)}</div>
                        <div className="op">{price === 0 ? tr("ui.free", L) : npr(price)}</div>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="cfd fu" id="custom-domain-wrap" hidden={step3.domain !== "custom"}>
                <label>{tr("checkout.step3.existingDomain.domainName", L)}</label><input id="c-domain-name" defaultValue={step3.domainName} onChange={(e) => setStep3((s) => ({ ...s, domainName: e.target.value }))} />
                <label>{tr("checkout.step3.existingDomain.registrar", L)}</label><input id="c-domain-reg" defaultValue={step3.domainRegistrar} onChange={(e) => setStep3((s) => ({ ...s, domainRegistrar: e.target.value }))} />
                <label style={{ display: "flex", alignItems: "center", gap: ".4rem", marginTop: ".6rem" }}>{tr("checkout.step3.existingDomain.dns", L)}
                  <input type="checkbox" name="domainDns" value="yes" defaultChecked={step3.domainDns === "yes"} onChange={(e) => setStep3((s) => ({ ...s, domainDns: e.target.checked ? "yes" : "no" }))} style={{ width: "auto" }} /> <span>{tr("checkout.step3.existingDomain.dnsYes", L)}</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: ".4rem", marginTop: ".3rem" }}><input type="checkbox" name="domainDns" value="no" defaultChecked={step3.domainDns === "no"} onChange={(e) => setStep3((s) => ({ ...s, domainDns: e.target.checked ? "yes" : "no" }))} style={{ width: "auto" }} /> <span>{tr("checkout.step3.existingDomain.dnsNo", L)}</span></label>
              </div>
              <div className="cfd fu" id="existing-domain-wrap" hidden={step3.domain !== "existing"}>
                <label><span>{tr("checkout.step3.existingDomain.domainName", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><input id="c-ex-domain-name" defaultValue={step3.exDomainName} onChange={(e) => setStep3((s) => ({ ...s, exDomainName: e.target.value }))} />
                <label><span>{tr("checkout.step3.existingDomain.registrar", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><input id="c-ex-domain-reg" defaultValue={step3.exDomainRegistrar} onChange={(e) => setStep3((s) => ({ ...s, exDomainRegistrar: e.target.value }))} />
                <label style={{ display: "flex", alignItems: "center", gap: ".4rem", marginTop: ".6rem" }}><input type="checkbox" name="exDomainDns" value="yes" defaultChecked={step3.exDomainDns === "yes"} onChange={(e) => setStep3((s) => ({ ...s, exDomainDns: e.target.checked ? "yes" : "no" }))} style={{ width: "auto" }} /> <span>{tr("checkout.step3.existingDomain.dnsYes", L)}</span></label>
                <label style={{ display: "flex", alignItems: "center", gap: ".4rem", marginTop: ".3rem" }}><input type="checkbox" name="exDomainDns" value="no" defaultChecked={step3.exDomainDns === "no"} onChange={(e) => setStep3((s) => ({ ...s, exDomainDns: e.target.checked ? "yes" : "no" }))} style={{ width: "auto" }} /> <span>{tr("checkout.step3.existingDomain.dnsNo", L)}</span></label>
              </div>
              <div id="domain-info" className="cq" style={{ marginTop: "1rem", borderStyle: "dashed", padding: "1rem", borderRadius: 12, borderColor: "var(--line)" }}>
                {step3.domain === "custom" ? <p style={{ margin: 0, fontSize: ".9rem", color: "var(--mut)" }}>{tr("checkout.step3.customDomain.desc", L)}</p> : step3.domain === "existing" ? <p style={{ margin: 0, fontSize: ".9rem", color: "var(--mut)" }}>Basic connection is free, subject to compatibility. Availability must be confirmed before registration.</p> : <p style={{ margin: 0, fontSize: ".9rem", color: "var(--mut)" }}>Free Vercel subdomain: yourbusiness.vercel.app</p>}
              </div>
            </form>
            <div className="cact" style={{ marginTop: "1rem", border: "none", paddingTop: 0, justifyContent: "space-between" }}>
              <button className="btn" id="prev-3" onClick={() => setStep(2)}>{tr("ui.previous", L)}</button>
              <button className="btn p" id="next-3" onClick={() => { if (validate(3)) setStep(4); }}>{tr("ui.next", L)}</button>
            </div>
          </div>

          {/* Step 4: Customer Details */}
          <div className={`cstep${step === 4 ? " active" : ""}`}>
            <h2 style={{ marginBottom: ".4rem" }}>{tr("checkout.step4.title", L)}</h2>
            <p className="sub" style={{ marginBottom: "1.5rem", color: "var(--mut)" }}>{tr("checkout.step4.desc", L)}</p>
            <form id="form-4" noValidate className="cform">
              <div className="cfd"><label><span>{tr("checkout.step4.fullName", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><input id="c-name" defaultValue={step4.fullName} onChange={(e) => setStep4((s) => ({ ...s, fullName: e.target.value }))} /></div>
              {errors[4] && <div className="cerr">{errors[4]}</div>}
              <div className="cfd"><label><span>{tr("checkout.step4.email", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><input type="email" id="c-email" defaultValue={step4.email} onChange={(e) => setStep4((s) => ({ ...s, email: e.target.value }))} /></div>
              <div className="cfd"><label><span>{tr("checkout.step4.phone", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><input type="tel" id="c-phone" defaultValue={step4.phone} onChange={(e) => setStep4((s) => ({ ...s, phone: e.target.value }))} /></div>
              <div className="cfd"><label>{tr("checkout.step4.whatsapp", L)}</label><input type="tel" id="c-whatsapp" defaultValue={step4.whatsapp} onChange={(e) => setStep4((s) => ({ ...s, whatsapp: e.target.value }))} /></div>
              <div className="cfd"><label>{tr("checkout.step4.businessName", L)}</label><input id="c-biz" defaultValue={step4.businessName} onChange={(e) => setStep4((s) => ({ ...s, businessName: e.target.value }))} /></div>
              <div className="cfd"><label>{tr("checkout.step4.location", L)}</label><input id="c-loc" defaultValue={step4.location} onChange={(e) => setStep4((s) => ({ ...s, location: e.target.value }))} /></div>
              <div className="cfd"><label><span>{tr("checkout.step4.channel", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><select id="c-channel" defaultValue={step4.channel} onChange={(e) => setStep4((s) => ({ ...s, channel: e.target.value }))}><option value=""></option>{COMM_CHANNELS.map((c) => <option key={c}>{c}</option>)}</select></div>
            </form>
            <div className="cact" style={{ marginTop: "1rem", border: "none", paddingTop: 0, justifyContent: "space-between" }}>
              <button className="btn" id="prev-4" onClick={() => setStep(3)}>{tr("ui.previous", L)}</button>
              <button className="btn p" id="next-4" onClick={() => { if (validate(4)) setStep(5); }}>{tr("ui.next", L)}</button>
            </div>
          </div>

          {/* Step 5: Summary */}
          <div className={`cstep${step === 5 ? " active" : ""}`}>
            <h2 style={{ marginBottom: ".4rem" }}>{tr("checkout.step5.title", L)}</h2>
            <p className="sub" style={{ marginBottom: "1.5rem", color: "var(--mut)" }}>{tr("checkout.step5.desc", L)}</p>
            <div className="csum">
              <div className="csrow"><span>{tr("checkout.step5.package", L)}</span><span className="mono">{orderDraft.packageName}</span></div>
              <div className="csrow"><span className="mono">{orderDraft.packagePrice ? `${tr("ui.npr", L)} ${orderDraft.packagePrice.toLocaleString("en-IN")}` : ""}</span></div>
              <div className="csrow"><span>{tr("checkout.step5.hostingLabel", L)}</span><span className="mono">{step3.hosting === "vercel" ? tr("checkout.step3.vercel.title", L) : "Existing hosting"}</span></div>
              <div className="csrow"><span className="mono">{orderDraft.hostingPrice === 0 ? tr("ui.free", L) : npr(orderDraft.hostingPrice)}</span></div>
              <div className="csrow"><span>{tr("checkout.step5.domainLabel", L)}</span><span className="mono">{orderDraft.domain === "custom" ? `Custom domain ${npr(orderDraft.domainPrice)}` : orderDraft.domain === "existing" ? tr("checkout.step3.existingDomain.title", L) : tr("ui.free", L)}</span></div>
              <div className="csrow"><span className="mono">{orderDraft.domainPrice === 0 ? tr("ui.free", L) : npr(orderDraft.domainPrice)}</span></div>
              <div className="csrow addons"><span>{tr("checkout.step5.addOns", L)}</span><span className="mono">{tr("ui.included", L)}</span></div>
              <div className="sum-divider"></div>
              <div className="csrow total"><span>{tr("checkout.step5.total", L)}</span><span className="mono">{npr(orderDraft.total)}</span></div>
              <p className="sum-note" style={{ marginTop: "1rem", fontSize: ".85rem", color: "var(--mut)" }}>{tr("checkout.step5.note", L)}</p>
            </div>
            <div className="rs ok" id="sum-pay-note" style={{ marginTop: "1rem", padding: "1rem", borderRadius: 12, border: "1px solid var(--line)" }}><strong>{tr("checkout.step5.payLater", L)}</strong><br /><span style={{ fontSize: ".9rem" }}>{tr("checkout.step5.payLaterDesc", L)}</span></div>
            <p className="note sum-note2" style={{ marginTop: ".75rem", fontSize: ".85rem", color: "var(--mut)" }}>{tr("checkout.step5.pcn", L)}</p>
            {errors[5] && <div className="cerr">{errors[5]}</div>}
            <div className="cact" style={{ marginTop: "1.5rem", border: "none", paddingTop: 0, justifyContent: "space-between" }}>
              <button className="btn" id="prev-5" onClick={() => setStep(4)}>{tr("ui.previous", L)}</button>
              <button className="btn p" id="next-5" onClick={() => { if (validate(5)) setStep(6); }}>{tr("ui.next", L)}</button>
            </div>
          </div>

          {/* Step 6: Submit / Confirm */}
          <div className={`cstep${step === 6 ? " active" : ""}`}>
            {confirmed ? (
              <div className="ccard">
                <div className="ccon">✓</div>
                <h2 style={{ marginBottom: ".5rem" }}>{tr("checkout.step6.successTitle", L)}</h2>
                <p style={{ color: "var(--mut)", marginBottom: "1.5rem" }}>{tr("checkout.step6.successDesc", L)}</p>
                <div className="ckeys">
                  <div>{tr("checkout.step6.orderNumber", L)}</div>
                  <div style={{ fontFamily: "mono", fontWeight: 800, fontSize: "1.1rem" }}>#{confirmed.order_number}</div>
                </div>
                <h3 style={{ margin: "1.5rem 0 .75rem", color: "var(--fg)" }}>{tr("checkout.step6.nextSteps", L)}</h3>
                <ol>
                  <li>{tr("checkout.step6.next1", L)}</li>
                  <li>{tr("checkout.step6.next2", L)}</li>
                  <li>{tr("checkout.step6.next3", L)}</li>
                  <li>{tr("checkout.step6.next4", L)}</li>
                </ol>
                <div className="cact" style={{ marginTop: "1.5rem", border: "none", paddingTop: 0, justifyContent: "center" }}>
                  <button className="btn p" id="btn-dashboard" onClick={() => window.location.href = "/dashboard"}>{tr("checkout.step6.viewDashboard", L)}</button>{" "}
                  <button className="btn" id="btn-close6" onClick={() => { setConfirmed(null); setStep(1); }}>{tr("ui.close", L)}</button>
                </div>
              </div>
            ) : (
              <form id="form-6" noValidate onSubmit={submitOrder} className="cform" style={{ maxWidth: "420px", margin: "0 auto" }}>
                <div className="cfd"><label className="agree-label" style={{ display: "flex", alignItems: "center", gap: ".6rem", fontSize: ".95rem" }}><input type="checkbox" id="c-agree" name="agree" required /> <span>{tr("checkout.step6.agree", L)}</span></label></div>
                {errors[6] && <div className="cerr">{errors[6]}</div>}
                <div className="cact" style={{ marginTop: "1.5rem", border: "none", paddingTop: 0, justifyContent: "center" }}>
                  <button className="btn p" id="btn-submit" disabled={submitting} type="submit" style={{ width: "100%" }}>{submitting ? tr("checkout.step6.submitting", L) : tr("checkout.step6.submit", L)}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
