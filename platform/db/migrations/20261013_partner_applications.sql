-- KORUAL Partner lead intake v1 — review on STAGING before release.
-- Applications are inquiries only. They never create merchant accounts,
-- mark providers verified or grant memberships.
CREATE TABLE IF NOT EXISTS public.partner_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_name text NOT NULL CHECK (length(company_name) BETWEEN 2 AND 80),
 contact_email text NOT NULL CHECK (length(contact_email) BETWEEN 3 AND 180),
 region text NOT NULL CHECK (length(region) BETWEEN 2 AND 80),
 service_category text NOT NULL CHECK (length(service_category) BETWEEN 2 AND 40),
 status text NOT NULL DEFAULT 'received' CHECK(status IN ('received','reviewing','needs_documents','rejected')),
 privacy_consent_at timestamptz NOT NULL,
 consent_version text NOT NULL,
 reviewer_id uuid REFERENCES public.profiles(id),
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 purge_after timestamptz NOT NULL DEFAULT (now() + interval '90 days')
);
CREATE INDEX IF NOT EXISTS idx_partner_applications_status_created
 ON public.partner_applications(status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_applications_purge
 ON public.partner_applications(purge_after);
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_applications FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.partner_applications TO service_role;
COMMENT ON TABLE public.partner_applications IS
 'Server-side KYB intake only. No automatic verification or merchant access. Operational 90-day deletion job is a deployment prerequisite.';
