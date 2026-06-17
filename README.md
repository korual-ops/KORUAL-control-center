# KORUAL Control Center

KORUAL Control Center is the first MVP of a Quiet Luxury AI Commerce Operating System. It gives operators one refined surface for product intake, margin discipline, AI listing generation, customer support templates, and commerce reporting.

## MVP Scope

- Next.js App Router with TypeScript
- Tailwind CSS dark premium KORUAL UI
- Dashboard with revenue, profit, order, pipeline, and AI automation status
- Product intake workflow for 1688, Temu, CJdropshipping, and Manual sourcing
- Margin calculator with recommended selling price and expected net profit
- AI listing prompt generator for SmartStore, Cafe24, Coupang, KORUAL tone copy, and SEO keywords
- AI customer support templates for delivery, exchange/refund, product inquiry, and complaints
- Reports page with mock revenue, profit, ad spend, best seller, low-margin, and restock data
- Supabase-ready SQL schema

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
```

## Architecture

The MVP is intentionally mock-data first. AI modules expose prompt templates before API keys are connected, and `supabase/schema.sql` defines the persistence model for product intake, margin scenarios, orders, and AI templates.

See:

- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `supabase/schema.sql`
