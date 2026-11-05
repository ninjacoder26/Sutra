# Sutra Studio (Next.js 15, App Router, TypeScript)
npm install && cp .env.example .env.local && npm run dev
- Edit contact, bank and prices in lib/config.ts; all copy (EN/NE) in lib/i18n.tsx.
- Khalti: set KHALTI_SECRET_KEY (sandbox/live). Verify endpoints against Khalti's current docs before going live.
- Orders are only logged (app/api/order/route.ts). Add DB/email there before launch.
