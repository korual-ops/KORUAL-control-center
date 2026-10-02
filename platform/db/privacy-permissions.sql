-- Applied 2026-10-02. Public clients use the session-scoped Edge API.
-- Existing server-only RLS policies remain enabled. No customer rows are changed.
revoke all privileges on table
  public.bookings,
  public.provider_quotes,
  public.service_request_events,
  public.service_request_matches
from anon, authenticated;
