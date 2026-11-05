"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { tr, Lang } from "@/lib/i18n";
import { sb, supabaseConfigured } from "@/lib/supabase";
import { toast, rateLimitCheck, rateLimitConsume, formatNPR } from "@/lib/ui";
import { APP, HOSTING_OPTIONS, DOMAIN_OPTIONS, CATEGORIES, PURPOSES, DESIGN_STYLES, FUNCTIONALITY, COMM_CHANNELS } from "@/lib/config";

const FALLBACK_PACKAGES: any[] = [
  { id: "standard", name: "Standard", price: 2499, pageLimit: 3, days: "7–10", featured: false, features: ["Up to 3 pages", "Modern responsive design", "Contact information and business details", "Basic SEO setup", "WhatsApp contact integration", "Mobile and desktop optimisation"] },
  { id: "professional", name: "Professional", price: 4999, pageLimit: 6, days: "10–14", featured: true, features: ["Up to 6 pages", "Custom-designed website", "Everything in Standard", "Gallery or portfolio section", "Contact form", "Advanced visual customisation", "SEO optimisation"] },
  { id: "premium", name: "Premium", price: 8499, pageLimit: 10, days: "14–18", featured: false, features: ["Up to 10 pages", "Premium custom design", "Everything in Professional", "Advanced interactions and animations", "Additional customisation", "Enhanced SEO setup", "Priority development"] },
];

const PROVIDERS = ["WorldLink", "Classic Tech", "Vianet", "Subisu", "Other"];

const npr = (n: number) => `रु. ${(Number(n) || 0).toLocaleString("en-IN")}`;

export default function Checkout() {
  const [currentStep, setCurrentStep] = useState(1);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [domainPrice, setDomainPrice] = useState(APP.defaultDomainPrice);
  const [step2, setStep2] = useState<any>({});
  const [step3, setStep3] = useState<any>({ hosting: "vercel", domain: "none", hostProvider: "", hostProviderOther: "", domainName: "", domainRegistrar: "", domainDns: "no", exDomainName: "", exDomainRegistrar: "", exDomainDns: "no" });
  const [step4, setStep4] = useState<any>({});
  const [orderDraft, setOrderDraft] = useState<any>({});
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<any>(null);
  const L = (typeof localStorage !== "undefined" ? localStorage.getItem("sutra-lang") || "en" : "en") as Lang;

  useEffect(() => {
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
      setPackages(rows);
    })();
    if (sb) {
      sb.from("site_settings").select("setting_value").eq("setting_key", "domain_price").single().then(({ data, error }: any) => {
        if (!error && data) {
          const v = Number((data as any).setting_value);
          if (!Number.isNaN(v)) setDomainPrice(v);
        }
      });
    }
  }, [sb]);

  const updateSummary = useCallback(() => {
    const pkg = selectedPackage;
    const pkgPrice = pkg ? Number(pkg.price) : 0;
    const hostPrice = step3.hosting === "vercel" ? APP.defaultVercelPrice : 0;
    let domPrice = 0;
    if (step3.domain === "custom") domPrice = Number(domainPrice);
    const total = pkgPrice + hostPrice + domPrice;
    const pkgName = pkg ? (L === "ne" && pkg.name_ne ? pkg.name_ne : pkg.name) : "\u2014";
    let domLabel = tr("ui.none", L);
    if (step3.domain === "custom") domLabel = `Custom domain ${npr(domainPrice)}`;
    else if (step3.domain === "existing") domLabel = tr("checkout.step3.existingDomain.title", L);
    else domLabel = tr("ui.free", L);
    setOrderDraft({ packageId: pkg ? pkg.id : null, packageName: pkgName, packagePrice: pkgPrice, hosting: step3.hosting, hostingPrice: hostPrice, domain: step3.domain, domainPrice: domPrice, domainName: step3.domainName || "", total });
  }, [selectedPackage, step3, domainPrice, L]);

  useEffect(() => { updateSummary(); }, [updateSummary]);

  const selectPackage = (i: number) => {
    const p = packages[i];
    setSelectedPackage(p);
    setStepErrors((prev: any) => ({ ...prev, [1]: "" }));
  };

  const validateStep = (n: number): boolean => {
    if (n === 1) {
      if (!selectedPackage) { setStepErrors((p: any) => ({ ...p, [1]: tr("validation.selectPackage", L) })); return false; }
      return true;
    }
    if (n === 2) {
      const f = document.getElementById("form-2") as HTMLFormElement | null;
      if (!f?.checkValidity()) { f?.reportValidity(); setStepErrors((p: any) => ({ ...p, [2]: tr("validation.fix", L) })); return false; }
      const funcs = Array.from(document.querySelectorAll('input[name="functionality"]:checked')) as HTMLInputElement[];
      if (funcs.length === 0) { setStepErrors((p: any) => ({ ...p, [2]: tr("validation.selectFunctionality", L) })); return false; }
      const otherWrap = document.getElementById("c-other-func-wrap") as HTMLElement | null;
      const of = document.getElementById("c-other-func") as HTMLInputElement | null;
      if (otherWrap && !otherWrap.hidden && !of?.value.trim()) { setStepErrors((p: any) => ({ ...p, [2]: tr("validation.required", L) })); return false; }
      setStep2((prev: any) => ({
        ...prev,
        businessName: (document.getElementById("c-bizname") as HTMLInputElement).value.trim(),
        category: (document.getElementById("c-category") as HTMLSelectElement).value,
        websiteType: (document.getElementById("c-webtype") as HTMLSelectElement).value,
        description: (document.getElementById("c-desc") as HTMLTextAreaElement).value.trim(),
        purpose: (document.getElementById("c-purpose") as HTMLSelectElement).value,
        designStyle: (document.getElementById("c-style") as HTMLSelectElement).value,
        preferredColors: (document.getElementById("c-colors") as HTMLInputElement).value.trim(),
        pages: Number((document.getElementById("c-pages") as HTMLSelectElement).value),
        functionality: funcs.map((i: HTMLInputElement) => i.value),
        otherFeature: (of ? of.value.trim() : ""),
        instructions: (document.getElementById("c-instr") as HTMLTextAreaElement).value.trim(),
      }));
      if (!step2.businessName) { setStepErrors((p: any) => ({ ...p, [2]: tr("validation.required", L) })); return false; }
      return true;
    }
    if (n === 3) {
      if (!step3.hosting) { setStepErrors((p: any) => ({ ...p, [3]: tr("validation.required", L) })); return false; }
      if (!step3.domain) { setStepErrors((p: any) => ({ ...p, [3]: tr("validation.required", L) })); return false; }
      if (step3.hosting === "existing") {
        const prov = (document.querySelector("#provider-pills .pill.active") as HTMLElement)?.textContent || (document.getElementById("c-host-provider-other") as HTMLInputElement).value.trim();
        if (!prov) { setStepErrors((p: any) => ({ ...p, [3]: tr("validation.providerRequired", L) })); return false; }
      }
      if (step3.domain === "custom") {
        if (!(document.getElementById("c-domain-name") as HTMLInputElement)?.value.trim()) { setStepErrors((p: any) => ({ ...p, [3]: tr("validation.domainRequired", L) })); return false; }
        if (!(document.getElementById("c-domain-reg") as HTMLInputElement)?.value.trim()) { setStepErrors((p: any) => ({ ...p, [3]: tr("validation.registrarRequired", L) })); return false; }
      }
      if (step3.domain === "existing") {
        if (!(document.getElementById("c-ex-domain-name") as HTMLInputElement)?.value.trim()) { setStepErrors((p: any) => ({ ...p, [3]: tr("validation.domainRequired", L) })); return false; }
        if (!(document.getElementById("c-ex-domain-reg") as HTMLInputElement)?.value.trim()) { setStepErrors((p: any) => ({ ...p, [3]: tr("validation.registrarRequired", L) })); return false; }
      }
      return true;
    }
    if (n === 4) {
      const f = document.getElementById("form-4") as HTMLFormElement | null;
      if (!f?.checkValidity()) { f?.reportValidity(); setStepErrors((p: any) => ({ ...p, [4]: tr("validation.fix", L) })); return false; }
      setStep4((prev: any) => ({
        ...prev,
        fullName: (document.getElementById("c-name") as HTMLInputElement).value.trim(),
        email: (document.getElementById("c-email") as HTMLInputElement).value.trim(),
        phone: (document.getElementById("c-phone") as HTMLInputElement).value.trim(),
        whatsapp: (document.getElementById("c-whatsapp") as HTMLInputElement).value.trim(),
        businessName: (document.getElementById("c-biz") as HTMLInputElement).value.trim(),
        location: (document.getElementById("c-loc") as HTMLInputElement).value.trim(),
        channel: (document.getElementById("c-channel") as HTMLSelectElement).value,
      }));
      return true;
    }
    if (n === 5) {
      if (!selectedPackage) { setStepErrors((p: any) => ({ ...p, [5]: tr("validation.selectPackage", L) })); return false; }
      return true;
    }
    return true;
  };

  const submitOrder = async () => {
    const rl = rateLimitCheck("checkoutSubmit", (msg: string) => toast(msg, "no"));
    if (!rl.allowed) return;
    if (!(document.getElementById("c-agree") as HTMLInputElement)?.checked) { setStepErrors((p: any) => ({ ...p, [6]: tr("validation.terms", L) })); return; }
    if (!selectedPackage) { setStepErrors((p: any) => ({ ...p, [6]: tr("validation.selectPackage", L) })); return; }

    const orderNumber = APP.orderPrefix + "-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const order: any = {
      order_number: orderNumber,
      customer_name: step4.fullName || "",
      customer_email: step4.email || "",
      customer_phone: step4.phone || "",
      business_name: step4.businessName || "",
      package_id: selectedPackage.id || null,
      package_name: orderDraft.packageName,
      package_price: orderDraft.packagePrice,
      website_type: step2.websiteType || "",
      website_description: step2.description || "",
      website_requirements: {
        category: step2.category, purpose: step2.purpose, designStyle: step2.designStyle,
        preferredColors: step2.preferredColors, pages: step2.pages, functionality: step2.functionality,
        otherFeature: step2.otherFeature, instructions: step2.instructions,
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
      } catch (e) { console.warn("Order insert failed:", e); result = null; }
    }
    setSubmitting(false);

    if (result?.order_number) {
      setConfirmed(result);
      setCurrentStep(6);
    } else {
      const ref = orderNumber;
      try {
        const pending = JSON.parse(localStorage.getItem("sutra-pending-orders") || "[]");
        pending.push({ ...order, ref, localOnly: true, createdAt: new Date().toISOString() });
        localStorage.setItem("sutra-pending-orders", JSON.stringify(pending));
      } catch { /* ignore */ }
      setConfirmed({ order_number: ref, total: orderDraft.total, localOnly: true });
      setCurrentStep(6);
    }
  };

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
          <section id="checkout" aria-label="Website order checkout">
            <div className="checkout-header">
              <h1>{tr("checkout.title", L)}</h1>
              <p className="sub">{tr("checkout.subtitle", L)}</p>
              <div id="setup-notice"></div>
            </div>
            <ol className="progress" id="progress" aria-label="Checkout progress">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <li key={n} className={`p-step${currentStep >= n ? " done" : ""}${currentStep === n ? " current" : ""}`} data-step={String(n)}>
                  <span className="p-num">{n}</span>
                  <span className="p-label">{tr(`checkout.steps.${n}`, L)}</span>
                </li>
              ))}
            </ol>
            <div className="steps" id="steps">
              <div className={`step-panel rv${currentStep !== 1 ? " hidden" : ""}`} data-step="1">
                <h2>{tr("checkout.step1.title", L)}</h2>
                <p className="sub">{tr("checkout.step1.desc", L)}</p>
                <div className="pkg-grid" id="pkg-grid">
                  {packages.map((p: any, i: number) => {
                    const featured = p.featured === true;
                    const name = L === "ne" ? (p.name_ne || p.name) : p.name;
                    const price = p.price ?? 0;
                    const days = L === "ne" ? (p.days_ne || p.days || "\u0916\u093e\u092a\u0930\u094d\u092f\u0942\u0917") : (p.days || "\u2013 days");
                    return (
                      <article key={i} className={`card pkg${featured ? " featured" : ""}${selectedPackage === p ? " selected" : ""}`} data-pkg={String(i)} onClick={() => selectPackage(i)}>
                        {featured ? <span className="tag soft">{tr("checkout.step1.recommended", L)}</span> : null}
                        <h3 style={{ marginTop: 0 }}>{name}</h3>
                        <p>{L === "ne" ? (p.desc_ne || p.description || "") : (p.description || "")}</p>
                        <div className="pc">रु. {price}</div>
                        <span className="dl">{days}</span>
                        <ul>{(p.features || []).map((f: string) => <li key={f}>{f}</li>)}</ul>
                        <button className={`btn ${featured ? "p" : ""}`} style={{ width: "100%", marginTop: "auto" }}>{tr("checkout.step1.choose", L)}</button>
                      </article>
                    );
                  })}
                </div>
                {stepErrors[1] && <div className="rs no">{stepErrors[1]}</div>}
                <div className="step-actions"><button className="btn p" id="next-1" onClick={() => { if (validateStep(1)) setCurrentStep(2); }}>{tr("ui.next", L)}</button></div>
              </div>
              <div className={`step-panel rv hidden${currentStep === 2 ? "" : " hidden"}`} data-step="2">
                <h2>{tr("checkout.step2.title", L)}</h2>
                <p className="sub">{tr("checkout.step2.desc", L)}</p>
                <form id="form-2" noValidate>
                  <div className="fd"><label><span>{tr("checkout.step2.businessName", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><input id="c-bizname" name="businessName" defaultValue={step2.businessName || ""} onChange={(e) => setStep2((s: any) => ({ ...s, businessName: e.target.value }))} required /></div>
                  <div className="fd"><label><span>{tr("checkout.step2.category", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><select id="c-category" name="category" defaultValue={step2.category || ""} onChange={(e) => setStep2((s: any) => ({ ...s, category: e.target.value }))} required><option value=""></option>{CATEGORIES.map((c: any) => <option key={c}>{c}</option>)}</select></div>
                  <div className="fd"><label><span>{tr("checkout.step2.websiteType", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><select id="c-webtype" name="websiteType" defaultValue={step2.websiteType || ""} onChange={(e) => setStep2((s: any) => ({ ...s, websiteType: e.target.value }))} required><option value=""></option>{PURPOSES.map((c: any) => <option key={c}>{c}</option>)}</select></div>
                  <div className="fd fu"><label>{tr("checkout.step2.description", L)}</label><textarea id="c-desc" name="description" defaultValue={step2.description || ""} onChange={(e) => setStep2((s: any) => ({ ...s, description: e.target.value }))} rows={4} /></div>
                  <div className="fd"><label><span>{tr("checkout.step2.purpose", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><select id="c-purpose" name="purpose" defaultValue={step2.purpose || ""} onChange={(e) => setStep2((s: any) => ({ ...s, purpose: e.target.value }))} required><option value=""></option>{PURPOSES.map((c: any) => <option key={c}>{c}</option>)}</select></div>
                  <div className="fd"><label><span>{tr("checkout.step2.designStyle", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><select id="c-style" name="designStyle" defaultValue={step2.designStyle || ""} onChange={(e) => setStep2((s: any) => ({ ...s, designStyle: e.target.value }))} required><option value=""></option>{DESIGN_STYLES.map((c: any) => <option key={c}>{c}</option>)}</select></div>
                  <div className="fd"><label>{tr("checkout.step2.preferredColors", L)}</label><input id="c-colors" name="preferredColors" defaultValue={step2.preferredColors || ""} onChange={(e) => setStep2((s: any) => ({ ...s, preferredColors: e.target.value }))} /></div>
                  <div className="fd"><label><span>{tr("checkout.step2.pages", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><select id="c-pages" name="pages" defaultValue={step2.pages || ""} onChange={(e) => setStep2((s: any) => ({ ...s, pages: Number(e.target.value) }))} required><option value=""></option>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n: any) => <option key={n}>{n}</option>)}</select></div>
                  <div className="fd fu"><label><span>{tr("checkout.step2.functionality", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><div className="checks" id="c-func-checks">
                    {FUNCTIONALITY.map((f: any) => (
                      <label key={f} style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", margin: ".25rem .5rem .25rem 0" }}>
                        <input type="checkbox" name="functionality" value={f} defaultChecked={(step2.functionality || []).includes(f)} onChange={(e) => {
                          const cur = step2.functionality || [];
                          if (e.target.checked) setStep2((s: any) => ({ ...s, functionality: [...cur, f] }));
                          else setStep2((s: any) => ({ ...s, functionality: cur.filter((x: string) => x !== f) }));
                        }} />
                        {f}
                      </label>
                    ))}
                  </div><p className="em" id="c-func-note">{tr("checkout.step2.functionalityNote", L)}</p></div>
                  <div className="fd fu" id="c-other-func-wrap" hidden={!(step2.functionality || []).includes("Other custom features")}>
                    <label>{tr("checkout.step2.otherFeature", L)}</label><input id="c-other-func" name="otherFeature" defaultValue={step2.otherFeature || ""} onChange={(e) => setStep2((s: any) => ({ ...s, otherFeature: e.target.value }))} />
                  </div>
                  <div className="fd fu"><label>{tr("checkout.step2.instructions", L)}</label><textarea id="c-instr" name="instructions" defaultValue={step2.instructions || ""} onChange={(e) => setStep2((s: any) => ({ ...s, instructions: e.target.value }))} rows={3} /></div>
                </form>
                {stepErrors[2] && <div className="rs no">{stepErrors[2]}</div>}
                <div className="step-actions"><button className="btn" id="prev-2" onClick={() => setCurrentStep(1)}>{tr("ui.previous", L)}</button><button className="btn p" id="next-2" onClick={() => { if (validateStep(2)) setCurrentStep(3); }}>{tr("ui.next", L)}</button></div>
              </div>
              <div className={`step-panel rv hidden${currentStep === 3 ? "" : " hidden"}`} data-step="3">
                <h2>{tr("checkout.step3.title", L)}</h2>
                <p className="sub">{tr("checkout.step3.desc", L)}</p>
                <form id="form-3" noValidate>
                  <div className="fd"><label><span>{tr("checkout.step3.hosting", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label>
                    <div className="option-grid" id="hosting-grid">
                      {HOSTING_OPTIONS.map((opt: any) => {
                        const selected = step3.hosting === opt.key;
                        const price = opt.priceKey ? domainPrice : (opt.price ?? 0);
                        return (
                          <label key={opt.key} className={`option-card${selected ? " selected" : ""}`} onClick={() => { setStep3((s: any) => ({ ...s, hosting: opt.key })); updateSummary(); }}>
                            <input type="radio" name="hosting" value={opt.key} defaultChecked={selected} style={{ display: "none" }} />
                            <div className="opt-title">{trLabel(opt.label, L)}</div>
                            <div className="opt-price">{price === 0 ? tr("ui.free", L) : npr(price)}</div>
                            <div className="opt-desc">{opt.desc || ""}</div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="fd fu" id="existing-hosting-wrap" hidden={step3.hosting !== "existing"}>
                    <label><span>{tr("checkout.step3.existingHosting.provider", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label>
                    <div className="provider-pills" id="provider-pills">
                      {PROVIDERS.map((p) => {
                        const active = step3.hostProvider === p || (p === "Other" && step3.hostProviderOther);
                        return (
                          <label key={p} className={`pill${active ? " active" : ""}`} data-prov={p} onClick={() => { setStep3((s: any) => ({ ...s, hostProvider: p === "Other" ? (step3.hostProviderOther || p) : p })); updateSummary(); }}>
                            <input type="radio" name="host-provider" value={p} defaultChecked={active} style={{ display: "none" }} />
                            {p}
                          </label>
                        );
                      })}
                    </div>
                    {step3.hostProvider === "Other" && <input id="c-host-provider-other" name="hostProviderOther" defaultValue={step3.hostProviderOther || ""} onChange={(e) => { setStep3((s: any) => ({ ...s, hostProviderOther: e.target.value, hostProvider: e.target.value || step3.hostProvider })); updateSummary(); }} placeholder="Enter provider name" />}
                  </div>
                  <div className="fd"><label><span>{tr("checkout.step3.domain", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label>
                    <div className="option-grid" id="domain-grid">
                      {DOMAIN_OPTIONS.map((opt: any) => {
                        const selected = step3.domain === opt.key;
                        const price = opt.priceKey ? domainPrice : (opt.price ?? 0);
                        return (
                          <label key={opt.key} className={`option-card${selected ? " selected" : ""}`} onClick={() => { setStep3((s: any) => ({ ...s, domain: opt.key })); updateSummary(); }}>
                            <input type="radio" name="domain" value={opt.key} defaultChecked={selected} style={{ display: "none" }} />
                            <div className="opt-title">{trLabel(opt.label, L)}</div>
                            <div className="opt-price">{price === 0 ? tr("ui.free", L) : npr(price)}</div>
                            <div className="opt-desc">{opt.desc || ""}</div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="fd fu" id="custom-domain-wrap" hidden={step3.domain !== "custom"}>
                    <label>{tr("checkout.step3.existingDomain.domainName", L)}</label><input id="c-domain-name" name="domainName" defaultValue={step3.domainName || ""} onChange={(e) => setStep3((s: any) => ({ ...s, domainName: e.target.value }))} />
                    <label>{tr("checkout.step3.existingDomain.registrar", L)}</label><input id="c-domain-reg" name="domainRegistrar" defaultValue={step3.domainRegistrar || ""} onChange={(e) => setStep3((s: any) => ({ ...s, domainRegistrar: e.target.value }))} />
                    <label>{tr("checkout.step3.existingDomain.dns", L)}</label>
                    <div className="checks" id="domain-dns-checks">
                      <label style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", fontWeight: 600 }}><input type="checkbox" name="domainDns" value="yes" defaultChecked={step3.domainDns === "yes"} onChange={(e) => setStep3((s: any) => ({ ...s, domainDns: e.target.value ? "yes" : "no" }))} /> <span>{tr("checkout.step3.existingDomain.dnsYes", L)}</span></label>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", fontWeight: 600, marginLeft: ".75rem" }}><input type="checkbox" name="domainDns" value="no" defaultChecked={step3.domainDns === "no"} onChange={(e) => setStep3((s: any) => ({ ...s, domainDns: e.target.value ? "yes" : "no" }))} /> <span>{tr("checkout.step3.existingDomain.dnsNo", L)}</span></label>
                    </div>
                  </div>
                  <div className="fd fu" id="existing-domain-wrap" hidden={step3.domain !== "existing"}>
                    <label><span>{tr("checkout.step3.existingDomain.domainName", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><input id="c-ex-domain-name" name="exDomainName" defaultValue={step3.exDomainName || ""} onChange={(e) => setStep3((s: any) => ({ ...s, exDomainName: e.target.value }))} />
                    <label><span>{tr("checkout.step3.existingDomain.registrar", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><input id="c-ex-domain-reg" name="exDomainRegistrar" defaultValue={step3.exDomainRegistrar || ""} onChange={(e) => setStep3((s: any) => ({ ...s, exDomainRegistrar: e.target.value }))} />
                    <label>{tr("checkout.step3.existingDomain.dns", L)}</label>
                    <div className="checks" id="ex-domain-dns-checks">
                      <label style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", fontWeight: 600 }}><input type="checkbox" name="exDomainDns" value="yes" defaultChecked={step3.exDomainDns === "yes"} onChange={(e) => setStep3((s: any) => ({ ...s, exDomainDns: e.target.value ? "yes" : "no" }))} /> <span>{tr("checkout.step3.existingDomain.dnsYes", L)}</span></label>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", fontWeight: 600, marginLeft: ".75rem" }}><input type="checkbox" name="exDomainDns" value="no" defaultChecked={step3.exDomainDns === "no"} onChange={(e) => setStep3((s: any) => ({ ...s, exDomainDns: e.target.value ? "yes" : "no" }))} /> <span>{tr("checkout.step3.existingDomain.dnsNo", L)}</span></label>
                    </div>
                  </div>
                  <div id="domain-info" className="cq" style={{ marginTop: "1rem", borderStyle: "dashed" }}>
                    {step3.domain === "custom" ? <p style={{ margin: 0 }}>{tr("checkout.step3.customDomain.desc", L)}</p> : step3.domain === "existing" ? <p style={{ margin: 0 }}>Basic connection is free, subject to compatibility. Availability must be confirmed before registration.</p> : <p style={{ margin: 0 }}>Free Vercel subdomain: yourbusiness.vercel.app</p>}
                  </div>
                </form>
                {stepErrors[3] && <div className="rs no">{stepErrors[3]}</div>}
                <div className="step-actions"><button className="btn" id="prev-3" onClick={() => setCurrentStep(2)}>{tr("ui.previous", L)}</button><button className="btn p" id="next-3" onClick={() => { if (validateStep(3)) setCurrentStep(4); }}>{tr("ui.next", L)}</button></div>
              </div>
              <div className={`step-panel rv hidden${currentStep === 4 ? "" : " hidden"}`} data-step="4">
                <h2>{tr("checkout.step4.title", L)}</h2>
                <p className="sub">{tr("checkout.step4.desc", L)}</p>
                <form id="form-4" noValidate>
                  <div className="fd"><label><span>{tr("checkout.step4.fullName", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><input id="c-name" name="fullName" defaultValue={step4.fullName || ""} onChange={(e) => setStep4((s: any) => ({ ...s, fullName: e.target.value }))} required /></div>
                  <div className="fd"><label><span>{tr("checkout.step4.email", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><input id="c-email" name="email" type="email" defaultValue={step4.email || ""} onChange={(e) => setStep4((s: any) => ({ ...s, email: e.target.value }))} required /></div>
                  <div className="fd"><label><span>{tr("checkout.step4.phone", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><input id="c-phone" name="phone" type="tel" defaultValue={step4.phone || ""} onChange={(e) => setStep4((s: any) => ({ ...s, phone: e.target.value }))} required /></div>
                  <div className="fd"><label>{tr("checkout.step4.whatsapp", L)}</label><input id="c-whatsapp" name="whatsapp" type="tel" defaultValue={step4.whatsapp || ""} onChange={(e) => setStep4((s: any) => ({ ...s, whatsapp: e.target.value }))} /></div>
                  <div className="fd"><label>{tr("checkout.step4.businessName", L)}</label><input id="c-biz" name="customerBusiness" defaultValue={step4.businessName || ""} onChange={(e) => setStep4((s: any) => ({ ...s, businessName: e.target.value }))} /></div>
                  <div className="fd"><label>{tr("checkout.step4.location", L)}</label><input id="c-loc" name="location" defaultValue={step4.location || ""} onChange={(e) => setStep4((s: any) => ({ ...s, location: e.target.value }))} /></div>
                  <div className="fd"><label><span>{tr("checkout.step4.channel", L)}</span><span className="req" style={{ color: "var(--rho)" }}>*</span></label><select id="c-channel" name="channel" defaultValue={step4.channel || ""} onChange={(e) => setStep4((s: any) => ({ ...s, channel: e.target.value }))} required><option value=""></option>{COMM_CHANNELS.map((c: any) => <option key={c}>{c}</option>)}</select></div>
                </form>
                {stepErrors[4] && <div className="rs no">{stepErrors[4]}</div>}
                <div className="step-actions"><button className="btn" id="prev-4" onClick={() => setCurrentStep(3)}>{tr("ui.previous", L)}</button><button className="btn p" id="next-4" onClick={() => { if (validateStep(4)) setCurrentStep(5); }}>{tr("ui.next", L)}</button></div>
              </div>
              <div className={`step-panel rv hidden${currentStep === 5 ? "" : " hidden"}`} data-step="5">
                <h2>{tr("checkout.step5.title", L)}</h2>
                <p className="sub">{tr("checkout.step5.desc", L)}</p>
                <div className="summary-card" id="summary-card">
                  <div className="sum-row"><span>{tr("checkout.step5.package", L)}</span><span className="mono" id="sum-pkg">{orderDraft.packageName}</span></div>
                  <div className="sum-row"><span className="mono" id="sum-pkg-price">{orderDraft.packagePrice ? `${tr("ui.npr", L)} ${orderDraft.packagePrice.toLocaleString("en-IN")}` : ""}</span></div>
                  <div className="sum-row"><span>{tr("checkout.step5.hostingLabel", L)}</span><span className="mono" id="sum-host">{step3.hosting === "vercel" ? tr("checkout.step3.vercel.title", L) : "Existing hosting"}</span></div>
                  <div className="sum-row"><span className="mono" id="sum-host-price">{orderDraft.hostingPrice === 0 ? tr("ui.free", L) : npr(orderDraft.hostingPrice)}</span></div>
                  <div className="sum-row"><span>{tr("checkout.step5.domainLabel", L)}</span><span className="mono" id="sum-dom">{orderDraft.domain === "custom" ? `Custom domain ${npr(orderDraft.domainPrice)}` : orderDraft.domain === "existing" ? tr("checkout.step3.existingDomain.title", L) : tr("ui.free", L)}</span></div>
                  <div className="sum-row"><span className="mono" id="sum-dom-price">{orderDraft.domainPrice === 0 ? tr("ui.free", L) : npr(orderDraft.domainPrice)}</span></div>
                  <div className="sum-row addons"><span>{tr("checkout.step5.addOns", L)}</span><span className="mono" id="sum-addons">{tr("ui.included", L)}</span></div>
                  <div className="sum-divider"></div>
                  <div className="sum-row total"><span>{tr("checkout.step5.total", L)}</span><span className="mono" id="sum-total">{npr(orderDraft.total)}</span></div>
                  <p className="sum-note" id="sum-note">{tr("checkout.step5.note", L)}</p>
                </div>
                <div className="rs ok" id="sum-pay-note" style={{ marginTop: "1rem" }}><strong>{tr("checkout.step5.payLater", L)}</strong><br /><span>{tr("checkout.step5.payLaterDesc", L)}</span></div>
                <p className="note sum-note2" id="sum-note2">{tr("checkout.step5.pcn", L)}</p>
                {stepErrors[5] && <div className="rs no">{stepErrors[5]}</div>}
                <div className="step-actions" style={{ marginTop: "1.5rem" }}><button className="btn" id="prev-5" onClick={() => setCurrentStep(4)}>{tr("ui.previous", L)}</button><button className="btn p" id="next-5" onClick={() => { if (validateStep(5)) setCurrentStep(6); }}>{tr("ui.next", L)}</button></div>
              </div>
              <div className={`step-panel rv hidden${currentStep === 6 ? "" : " hidden"}`} data-step="6">
                {confirmed ? (
                  <div className="confirm-card">
                    <div className="confirm-icon">✓</div>
                    <h2>{tr("checkout.step6.successTitle", L)}</h2>
                    <p>{tr("checkout.step6.successDesc", L)}</p>
                    <div className="confirm-meta">
                      <div><span className="sum-label">{tr("checkout.step6.orderNumber", L)}</span><div className="mono order-no" id="s6-order-no">#{confirmed.order_number}</div></div>
                      <div><span className="sum-label">{tr("checkout.step6.orderReference", L)}</span><div className="mono" id="s6-order-ref">#{confirmed.order_number}</div></div>
                    </div>
                    <h3 style={{ margin: "1.6rem 0 .5rem" }}>{tr("checkout.step6.nextSteps", L)}</h3>
                    <ol className="next-steps" style={{ color: "var(--mut)", lineHeight: "1.8" }}>
                      <li>{tr("checkout.step6.next1", L)}</li>
                      <li>{tr("checkout.step6.next2", L)}</li>
                      <li>{tr("checkout.step6.next3", L)}</li>
                      <li>{tr("checkout.step6.next4", L)}</li>
                    </ol>
                    <div className="step-actions" style={{ marginTop: "1.5rem", justifyContent: "center" }}>
                      <button className="btn p" id="btn-dashboard" onClick={() => window.location.href = "/dashboard"}>{tr("checkout.step6.viewDashboard", L)}</button>{" "}
                      <button className="btn" id="btn-close6" onClick={() => { setConfirmed(null); setCurrentStep(1); }}>{tr("ui.close", L)}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <form id="form-6" noValidate onSubmit={(e) => { e.preventDefault(); submitOrder(); }}>
                      <div className="fd fu"><label className="agree-label"><input type="checkbox" id="c-agree" name="agree" required /> <span>{tr("checkout.step6.agree", L)}</span></label><span id="e-agree" className="em"></span></div>
                    </form>
                    {stepErrors[6] && <div className="rs no">{stepErrors[6]}</div>}
                    <div className="step-actions"><button className="btn p" id="btn-submit" disabled={submitting} onClick={submitOrder}>{submitting ? tr("checkout.step6.submitting", L) : tr("checkout.step6.submit", L)}</button></div>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

const trLabel = (label: string, L: string) => {
  const map: Record<string, Record<string, string>> = {
    "Vercel Hosting (free)": { en: "Vercel Hosting (free)", ne: "Vercel होस्टिङ (निःशुल्क)" },
    "Custom domain (NPR 1,599)": { en: "Custom domain (NPR 1,599)", ne: "कस्टम डोमेन (रु. 1,599)" },
    "Connect existing domain (free)": { en: "Connect existing domain (free)", ne: "पहिलेदेखि रहेको डोमेन कनेक्ट गर्नुहोस् (निःशुल्क)" },
    "No domain / Vercel subdomain (free)": { en: "No domain / Vercel subdomain (free)", ne: "डोमेन नभएको / Vercel उपडोमेन (निःशुल्क)" },
    "Existing hosting provider": { en: "Existing hosting provider", ne: "पहिलेदेखि रहेको होस्टिङ प्रदायक" },
  };
  return map[label]?.[L] || label;
};
