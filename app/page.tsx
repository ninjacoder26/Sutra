"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { PACKAGES, npr } from "@/lib/config";
export default function Home() {
  const { t, l, set } = useT();
  return (<>
    <header><div className="w nv"><b style={{ fontSize: "1.25rem" }}>Sutra Studio</b>
      <nav><a href="#packages">{t.nav[0]}</a><a href="#faq">{t.nav[1]}</a><Link href="/checkout">{t.nav[2]}</Link></nav>
      <button className="btn" onClick={() => set(l === "en" ? "ne" : "en")} style={{ padding: ".4rem 1rem" }}>{t.lang}</button></div></header>
    <main>
      <section className="hero"><div className="w"><h1>{t.h1}</h1><p>{t.sub}</p>
        <p style={{ marginTop: "2rem" }}><a className="btn p" href="#packages">{t.cta}</a></p></div></section>
      <section id="packages"><div className="w"><h2>{t.pTitle}</h2>
        <div className="pg">{PACKAGES.map((p) => { const [n, who, items] = t.pk[p.id as keyof typeof t.pk]; const r = "recommended" in p;
          return (<article key={p.id} className={`pk${r ? " r" : ""}`}>{r && <span className="tag">{t.rec}</span>}
            <h3>{n}</h3><p>{who}</p><div className="pc">{npr(p.price)}</div>
            <p style={{ margin: 0 }}>{p.days[0]}–{p.days[1]} {t.days}</p>
            <ul>{Array.isArray(items) ? items.map((i) => <li key={i}>{i}</li>) : <li>{items}</li>}</ul>
            <Link className={`btn${r ? " p" : ""}`} href={`/checkout?pkg=${p.id}`}>{t.choose}</Link></article>); })}</div>
        <p className="note">{t.note}</p></div></section>
      <section id="faq" style={{ paddingTop: 0 }}><div className="w"><h2>{t.faqT}</h2><div style={{ marginTop: "2rem" }}>
        {t.faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>
    </main>
    <footer><div className="w">© {new Date().getFullYear()} Sutra Studio · {t.ft}</div></footer></>);
}
