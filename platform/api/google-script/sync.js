function readJson(request) {
  if (!request.body) return {};
  return typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
}

export default function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'method_not_allowed' });
  }

  const secret = request.headers['x-korual-secret'];
  if (process.env.GOOGLE_SCRIPT_SHARED_SECRET && secret !== process.env.GOOGLE_SCRIPT_SHARED_SECRET) {
    return response.status(401).json({ error: 'invalid_secret' });
  }

  const payload = readJson(request);
  return response.status(202).json({
    accepted: true,
    source: payload.source || 'google-apps-script',
    event: payload.event || 'sync',
    receivedAt: new Date().toISOString()
  });
}
