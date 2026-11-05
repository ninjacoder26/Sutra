
export const CONFIG = {
  whatsapp: "9779800000000",
  email: "hello@example.com",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  bank: "Bank name · Account name · Account number (fill in)",
};

export const PACKAGES: any[] = [
  { id: "standard", name: "Standard", price: 2499, pageLimit: 3, days: "7–10", featured: false, features: ["Up to 3 pages", "Modern responsive design", "Contact information and business details", "Basic SEO setup", "WhatsApp contact integration", "Mobile and desktop optimisation"] },
  { id: "professional", name: "Professional", price: 4999, pageLimit: 6, days: "10–14", featured: true, features: ["Up to 6 pages", "Custom-designed website", "Everything in Standard", "Gallery or portfolio section", "Contact form", "Advanced visual customisation", "SEO optimisation"] },
  { id: "premium", name: "Premium", price: 8499, pageLimit: 10, days: "14–18", featured: false, features: ["Up to 10 pages", "Premium custom design", "Everything in Professional", "Advanced interactions and animations", "Additional customisation", "Enhanced SEO setup", "Priority development"] },
];

export type PkgId = (typeof PACKAGES)[number]["id"];
export const npr = (n: number) => `रु. ${(Number(n) || 0).toLocaleString("en-IN")}`;

export const APP = {
  ...CONFIG,
  defaultDomainPrice: 1599,
  defaultVercelPrice: 0,
  orderPrefix: "SUTRA",
};

const HOSTING_OPTIONS = [
  { key: "vercel", label: "Vercel Hosting (free)", price: 0 },
  { key: "existing", label: "Existing hosting provider", price: 0 },
];

const DOMAIN_OPTIONS: any[] = [
  { key: "custom", label: "Custom domain (NPR 1,599)", priceKey: "domainPrice" },
  { key: "existing", label: "Connect existing domain (free)", price: 0 },
  { key: "none", label: "No domain / Vercel subdomain (free)", price: 0 },
];

const CATEGORIES: any[] = ["Restaurant", "Hotel", "E-commerce", "Retail shop", "Consultancy", "Portfolio", "Education", "Corporate", "Personal brand", "Other"];

const PURPOSES: any[] = ["Online presence / brochure", "Sell products", "Take bookings / reservations", "Showcase portfolio", "Generate leads", "Other"];

const DESIGN_STYLES: any[] = ["Clean & minimal", "Bold & colorful", "Elegant / premium", "Traditional Nepali", "Modern tech", "No preference"];

const FUNCTIONALITY: any[] = ["WhatsApp integration", "Contact forms", "Image galleries", "Product catalogues", "Booking systems", "Blogs", "Google Maps", "Social media integration", "Other custom features"];

const COMM_CHANNELS: any[] = ["WhatsApp", "Phone", "Email"];

const PROVIDERS: any[] = ["WorldLink", "Classic Tech", "Vianet", "Subisu", "Other"];

export { HOSTING_OPTIONS, DOMAIN_OPTIONS, CATEGORIES, PURPOSES, DESIGN_STYLES, FUNCTIONALITY, COMM_CHANNELS, PROVIDERS };
