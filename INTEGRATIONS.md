# KORUAL integrations

## Connected foundations

- GitHub: source control and pull-request delivery
- Supabase: Auth, Postgres, RLS, audit logs, integration registry
- Vercel: Express hosting and Git-based deployments
- PostHog: product and login event analytics
- HubSpot: customer contact synchronization

## Required server environment variables

Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` in every Vercel environment. The secret key is server-only and must never use a `NEXT_PUBLIC_` prefix.

Set `POSTHOG_API_KEY` and `POSTHOG_HOST` to enable server-side analytics. Set `HUBSPOT_ACCESS_TOKEN` only after creating a HubSpot private app with the minimum contact scopes.

## Safety boundaries

- Provider secrets are stored only in Vercel encrypted environment variables.
- Supabase stores provider status and non-secret references only.
- Public Supabase tables use RLS; operational tables are not granted to `anon` or `authenticated`.
- HubSpot contact writes happen only through the authenticated `/integrations/hubspot/sync-me` endpoint.

