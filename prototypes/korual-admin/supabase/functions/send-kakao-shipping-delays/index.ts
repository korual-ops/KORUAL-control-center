import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("authorization") ?? "";

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false }
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || authData.user?.app_metadata?.role !== "admin") {
    return reply({ error: "admin_required" }, 403);
  }

  const webhookUrl = Deno.env.get("KAKAO_DELAY_WEBHOOK_URL");
  const bearerToken = Deno.env.get("KAKAO_DELAY_WEBHOOK_TOKEN");
  const templateCode = Deno.env.get("KAKAO_DELAY_TEMPLATE_CODE");
  const senderKey = Deno.env.get("KAKAO_SENDER_KEY");

  if (!webhookUrl || !bearerToken || !templateCode || !senderKey) {
    return reply({
      error: "webhook_not_configured",
      requiredSecrets: [
        "KAKAO_DELAY_WEBHOOK_URL",
        "KAKAO_DELAY_WEBHOOK_TOKEN",
        "KAKAO_DELAY_TEMPLATE_CODE",
        "KAKAO_SENDER_KEY"
      ]
    }, 503);
  }

  let limit = 20;
  try {
    const body = await req.json();
    if (Number.isFinite(body?.limit)) limit = Math.min(50, Math.max(1, Number(body.limit)));
  } catch { /* empty body is valid */ }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: delayedOrders, error: delayedError } = await admin
    .from("orders")
    .select("id")
    .lt("shipping_due_at", new Date().toISOString())
    .is("shipped_at", null)
    .not("customer_phone", "is", null)
    .not("status", "in", '("배송 완료","배송완료","취소","주문 취소")');

  if (delayedError) return reply({ error: "delay_scan_failed" }, 500);

  if (delayedOrders?.length) {
    await admin.from("notification_jobs").upsert(
      delayedOrders.map((order) => ({ order_id: order.id })),
      { onConflict: "order_id,event_type", ignoreDuplicates: true }
    );
  }

  const now = new Date().toISOString();
  const { data: jobs, error: jobsError } = await admin
    .from("notification_jobs")
    .select("id,order_id,status,attempts,max_attempts,orders!inner(order_no,customer_name,customer_phone,shipping_due_at)")
    .in("status", ["queued", "failed"])
    .lte("next_attempt_at", now)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (jobsError) return reply({ error: "queue_read_failed" }, 500);

  let sent = 0;
  let failed = 0;

  for (const job of jobs ?? []) {
    const claimed = await admin.from("notification_jobs")
      .update({ status: "sending", attempts: job.attempts + 1, updated_at: now })
      .eq("id", job.id)
      .in("status", ["queued", "failed"])
      .select("id")
      .maybeSingle();

    if (!claimed.data) continue;

    const order = Array.isArray(job.orders) ? job.orders[0] : job.orders;
    const payload = {
      event: "shipping_delay",
      eventVersion: 1,
      referenceId: job.id,
      senderKey,
      templateCode,
      recipient: String(order.customer_phone).replace(/[^0-9]/g, ""),
      variables: {
        customerName: order.customer_name ?? "고객",
        orderNumber: order.order_no,
        shippingDueAt: order.shipping_due_at
      }
    };

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          ...jsonHeaders,
          authorization: `Bearer ${bearerToken}`,
          "idempotency-key": job.id
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });

      const responseText = (await response.text()).slice(0, 1000);
      if (!response.ok) throw new Error(`webhook_http_${response.status}: ${responseText}`);

      let providerMessageId: string | null = null;
      try {
        const parsed = JSON.parse(responseText);
        providerMessageId = parsed.messageId ?? parsed.id ?? null;
      } catch { /* provider response may be empty */ }

      await admin.from("notification_jobs").update({
        status: "sent",
        provider_message_id: providerMessageId,
        last_error: null,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", job.id);
      await admin.from("orders").update({
        delay_notified_at: new Date().toISOString()
      }).eq("id", job.order_id);
      sent++;
    } catch (error) {
      const attempts = job.attempts + 1;
      const terminal = attempts >= job.max_attempts;
      const retryAt = new Date(Date.now() + Math.min(3600, 60 * 2 ** attempts) * 1000).toISOString();
      await admin.from("notification_jobs").update({
        status: terminal ? "cancelled" : "failed",
        last_error: String(error).slice(0, 1000),
        next_attempt_at: retryAt,
        updated_at: new Date().toISOString()
      }).eq("id", job.id);
      failed++;
    }
  }

  return reply({ scanned: delayedOrders?.length ?? 0, queued: jobs?.length ?? 0, sent, failed });
});
