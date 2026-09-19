# KORUAL hosting architecture

Production-capable Vercel-independent path:

- Frontend: GitHub Pages (`platform/dist`)
- API: Supabase Edge Function `korual-marketplace`
- Database: Supabase Postgres
- CI/CD: GitHub Actions on pushes to `main`
- Vercel: optional secondary deployment only

The frontend uses a portable Vite base and calls:
`https://dtmmjkikyfgkeimhevso.supabase.co/functions/v1/korual-marketplace`

Sensitive database writes remain server-side through the Edge Function.
