"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
const D = {
  en: {
    nav: ["Packages", "FAQ", "Contact"], cta: "Get Your Website", lang: "नेपाली",
    h1: "Your business website, ready in about 2 weeks.",
    sub: "Professional, mobile-friendly websites for Nepali businesses, from रु. 2,499. Clear prices, honest timelines, one person to talk to.",
    pTitle: "Pick a package. Pay securely.", rec: "Recommended", choose: "Choose package", days: "days",
    pk: {
      standard: ["Standard", "For individuals, small shops and first websites.", ["Up to 3 pages", "Modern responsive design", "Contact info and business details", "Basic SEO setup", "WhatsApp contact integration", "Mobile and desktop optimisation"]],
      professional: ["Professional", "For growing businesses that need a stronger presence.", ["Up to 6 pages", "Custom-designed website", "Everything in Standard", "Gallery or portfolio section", "Contact form", "Advanced visual customisation", "SEO optimisation"]],
      premium: ["Premium", "For a more complete website experience.", ["Up to 10 pages", "Premium custom design", "Everything in Professional", "Advanced interactions and animations", "Additional customisation", "Enhanced SEO setup", "Priority development"]],
    },
    note: "Complex functionality, hosting, domain registration and extra requirements may be quoted separately and are always confirmed in writing first.",
    co: { title: "Checkout", sum: "Order summary", name: "Full name", biz: "Business name", phone: "Phone number", email: "Email", notes: "Additional requirements", method: "Payment method", khalti: "Pay online with Khalti", manual: "Bank transfer / pay later via WhatsApp", pay: "Place order", total: "Total", delivery: "Estimated delivery", req: "Required", bad: "Check this field", fail: "Could not place the order. Please try again or use WhatsApp.", off: "Online payment is not configured yet. Choose bank transfer or WhatsApp.", done: "Order received", id: "Order ID", wa: "Confirm on WhatsApp", terms: "Final scope, any hosting/domain costs and timeline are confirmed in writing before work starts." },
    faq: [["How much does a website cost?", "Standard रु. 2,499, Professional रु. 4,999, Premium रु. 8,499. Complex functionality, hosting and domain may be quoted separately."], ["How long does it take?", "About 2 weeks: 7–10, 10–14 or 14–18 days depending on the package and how fast we get your content."], ["Can I request changes?", "Yes, we refine the design until you are happy within the agreed scope."]],
    faqT: "Questions, answered", ft: "Web design studio, Nepal", back: "Back",
  },
  ne: {
    nav: ["प्याकेज", "प्रश्नोत्तर", "सम्पर्क"], cta: "वेबसाइट बनाउनुहोस्", lang: "English",
    h1: "तपाईंको व्यावसायिक वेबसाइट, लगभग २ हप्तामै तयार।",
    sub: "नेपाली व्यवसायका लागि व्यावसायिक र मोबाइल-मैत्री वेबसाइट, रु. 2,499 बाट। स्पष्ट मूल्य, इमानदार समयसीमा, कुरा गर्न एउटै व्यक्ति।",
    pTitle: "प्याकेज छान्नुहोस्। सुरक्षित भुक्तानी गर्नुहोस्।", rec: "सिफारिस गरिएको", choose: "प्याकेज छान्नुहोस्", days: "दिन",
    pk: {
      standard: ["स्टान्डर्ड", "व्यक्ति, साना पसल र पहिलो पटक वेबसाइट बनाउनेका लागि।", ["३ पेजसम्म", "आधुनिक र रेस्पोन्सिभ डिजाइन", "सम्पर्क जानकारी र व्यवसायको विवरण", "आधारभूत SEO सेटअप", "WhatsApp सम्पर्क सुविधा", "मोबाइल र कम्प्युटर दुवैमा राम्रो चल्ने"]],
      professional: ["प्रोफेसनल", "अनलाइन उपस्थिति बलियो बनाउन चाहने बढ्दो व्यवसायका लागि।", ["६ पेजसम्म", "तपाईंको ब्रान्डअनुसार बनाइएको डिजाइन", "स्टान्डर्डका सबै सुविधा", "ग्यालेरी वा पोर्टफोलियो खण्ड", "सम्पर्क फारम", "थप दृश्य अनुकूलन", "SEO अनुकूलन"]],
      premium: ["प्रिमियम", "अझ पूर्ण वेबसाइट अनुभव चाहनेका लागि।", ["१० पेजसम्म", "प्रिमियम कस्टम डिजाइन", "प्रोफेसनलका सबै सुविधा", "उन्नत इन्टरएक्सन र एनिमेसन", "थप अनुकूलन", "अझ बलियो SEO सेटअप", "प्राथमिकतामा निर्माण"]],
    },
    note: "जटिल सुविधा, होस्टिङ, डोमेन दर्ता र थप आवश्यकताको मूल्य छुट्टै हुन सक्छ, र काम सुरु गर्नुअघि सधैं लिखित रूपमा पुष्टि गरिन्छ।",
    co: { title: "चेकआउट", sum: "अर्डरको सारांश", name: "पूरा नाम", biz: "व्यवसायको नाम", phone: "फोन नम्बर", email: "इमेल", notes: "थप आवश्यकता", method: "भुक्तानीको तरिका", khalti: "खल्तीबाट अनलाइन भुक्तानी", manual: "बैंक ट्रान्सफर / WhatsApp मार्फत पछि भुक्तानी", pay: "अर्डर गर्नुहोस्", total: "जम्मा", delivery: "अनुमानित डेलिभरी", req: "अनिवार्य", bad: "यो क्षेत्र जाँच्नुहोस्", fail: "अर्डर गर्न सकिएन। फेरि प्रयास गर्नुहोस् वा WhatsApp प्रयोग गर्नुहोस्।", off: "अनलाइन भुक्तानी अझै सेटअप भएको छैन। बैंक ट्रान्सफर वा WhatsApp छान्नुहोस्।", done: "अर्डर प्राप्त भयो", id: "अर्डर नम्बर", wa: "WhatsApp मा पुष्टि गर्नुहोस्", terms: "अन्तिम कार्यक्षेत्र, होस्टिङ/डोमेन खर्च र समयसीमा काम सुरु गर्नुअघि लिखित रूपमा पुष्टि गरिन्छ।" },
    faq: [["वेबसाइटको लागत कति पर्छ?", "स्टान्डर्ड रु. 2,499, प्रोफेसनल रु. 4,999, प्रिमियम रु. 8,499। जटिल सुविधा, होस्टिङ र डोमेनको मूल्य छुट्टै हुन सक्छ।"], ["कति समय लाग्छ?", "लगभग २ हप्ता: प्याकेज र सामग्री कति छिटो आउँछ भन्नेअनुसार ७–१०, १०–१४ वा १४–१८ दिन।"], ["के म परिवर्तन माग्न सक्छु?", "सक्नुहुन्छ। तय भएको कार्यक्षेत्रभित्र तपाईं सन्तुष्ट नभएसम्म डिजाइन सुधार्छौं।"]],
    faqT: "तपाईंका प्रश्न, हाम्रा जवाफ", ft: "नेपालको वेब डिजाइन स्टुडियो", back: "फर्कनुहोस्",
  },
};
export type Lang = keyof typeof D;
const Ctx = createContext<{ l: Lang; t: (typeof D)["en"]; set: (l: Lang) => void }>(null!);
export function LangProvider({ children }: { children: ReactNode }) {
  const [l, setL] = useState<Lang>("en");
  useEffect(() => { try { const s = localStorage.getItem("sutra-lang"); if (s === "en" || s === "ne") setL(s); } catch {} }, []);
  useEffect(() => { document.documentElement.lang = l; }, [l]);
  const set = (x: Lang) => { setL(x); try { localStorage.setItem("sutra-lang", x); } catch {} };
  return <Ctx.Provider value={{ l, t: D[l] as (typeof D)["en"], set }}>{children}</Ctx.Provider>;
}
export const useT = () => useContext(Ctx);
