import crypto from 'node:crypto';

function verifySignature(rawBody, signature, secret) {
  if (!secret) return true;
  if (!signature) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export default function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'method_not_allowed' });
  }

  const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body || {});
  const signature = request.headers['x-hub-signature-256'];
  if (!verifySignature(rawBody, signature, process.env.GITHUB_WEBHOOK_SECRET)) {
    return response.status(401).json({ error: 'invalid_signature' });
  }

  return response.status(202).json({
    accepted: true,
    event: request.headers['x-github-event'] || 'unknown',
    delivery: request.headers['x-github-delivery'] || null,
    receivedAt: new Date().toISOString()
  });
}
