export default function handler(_, res) {
  const configured = Boolean(process.env.KORUAL_GAS_URL && process.env.KORUAL_GAS_SECRET &&
    process.env.KORUAL_INTERNAL_API_TOKEN &&
    Buffer.byteLength(process.env.KORUAL_INTERNAL_API_TOKEN, 'utf8') >= 32);
  res.setHeader?.('Cache-Control', 'no-store');
  return res.status(configured ? 200 : 503).json({ ok: configured, service: 'korual-platform', upstream: configured ? 'ready' : 'not-configured' });
}
