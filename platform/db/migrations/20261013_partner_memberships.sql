-- KORUAL Partner access bootstrap (reviewed feature branch only; not applied to live DB).
-- The root API uses a server-held service role with an authenticated, verified
-- session and checks a fresh membership on every request.
-- Never add broad authenticated access to provider/quote/booking tables.

CREATE TABLE IF NOT EXISTS public.partner_memberships (
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('OWNER', 'OPERATOR', 'VIEWER')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_memberships_user_active
  ON public.partner_memberships (user_id, active);

ALTER TABLE public.partner_memberships ENABLE ROW LEVEL SECURITY;
-- Deliberately NO client SELECT/INSERT/UPDATE/DELETE policies.
-- By default ordinary authenticated clients cannot access this table.
REVOKE ALL ON TABLE public.partner_memberships FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.partner_memberships IS
  'Private mapping between authenticated users and verified merchant tenants. Assign via trusted backoffice only.';
