export default function handler(request, response) {
  response.status(200).json({
    platform: 'KORUAL',
    status: 'ok',
    integrations: {
      github: Boolean(process.env.GITHUB_WEBHOOK_SECRET),
      vercel: Boolean(process.env.VERCEL_PROJECT_ID || process.env.VERCEL_URL),
      googleScript: Boolean(process.env.GOOGLE_SCRIPT_SHARED_SECRET)
    },
    checkedAt: new Date().toISOString()
  });
}
