export default function handler(_, res) {
  const configured = Boolean(process.env.KORUAL_GAS_URL && process.env.KORUAL_GAS_SECRET);
  const spreadsheetId = process.env.KORUAL_SPREADSHEET_ID || '1-XYUbU6Os5q7P_9qFnTFmkva3o0KhrgPHd-AyA6-bts';
  res.status(configured ? 200 : 503).json({ ok: configured, service: 'korual-platform', spreadsheetId, upstream: configured ? 'configured' : 'missing' });
}
