export default function handler(_, res) {
  const configured = Boolean(process.env.KORUAL_GAS_URL && process.env.KORUAL_GAS_SECRET);
  res.status(configured ? 200 : 503).json({ ok: configured, service: 'korual-platform', spreadsheetId: process.env.KORUAL_SPREADSHEET_ID || null, upstream: configured ? 'configured' : 'missing' });
}
