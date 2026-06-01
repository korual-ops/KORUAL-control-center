# Architecture

## Application Shape

KORUAL Control Center is a Next.js App Router application.

- `app/` contains route-level pages.
- `components/` contains reusable UI and workflow components.
- `lib/mock-data.ts` provides seeded commerce data for the MVP.
- `lib/margin.ts` owns pricing and profit math.
- `lib/ai.ts` owns GPT-ready prompt templates.
- `supabase/schema.sql` is the database contract for the next integration phase.

## Data Flow

1. Product intake captures supplier URL, source platform, memo, product cost, and shipping cost.
2. Margin calculator models landed cost, fee load, target margin, recommended price, and expected net profit.
3. AI listing templates transform product facts into marketplace-ready prompts.
4. AI customer support templates standardize replies while preserving KORUAL tone.
5. Reports aggregate revenue, profit, ad spend, bestseller, low-margin, and restock signals.

## Supabase Readiness

The schema supports:

- `products`
- `margin_scenarios`
- `orders`
- `ai_templates`

The MVP uses mock data so the UI remains usable before authentication, row-level security, and API keys are connected.

## AI Readiness

Prompt templates are stored as static TypeScript data for the MVP. A future API route can pass the selected template and product context to OpenAI, then persist outputs to Supabase.
