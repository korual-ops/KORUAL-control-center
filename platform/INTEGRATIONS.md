# KORUAL Integrations

## GitHub

Webhook endpoint:

```text
https://<your-vercel-domain>/api/github/webhook
```

Recommended webhook events: `push`, `pull_request`, `workflow_run`, `deployment_status`.

Set `GITHUB_WEBHOOK_SECRET` in Vercel and use the same value as the GitHub webhook secret.

## Vercel

This project includes `vercel.json` and a production GitHub Actions workflow.

Required GitHub repository secrets:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

Required Vercel environment variables:

```text
GITHUB_WEBHOOK_SECRET
GOOGLE_SCRIPT_SHARED_SECRET
```

Health endpoint:

```text
/api/integrations/health
```

## Google Apps Script

Deploy `apps-script/Code.gs` and `apps-script/appsscript.json` as an Apps Script project.

Script properties:

```text
KORUAL_ENDPOINT=https://<your-vercel-domain>/api/google-script/sync
KORUAL_SECRET=<same value as GOOGLE_SCRIPT_SHARED_SECRET>
```

Run `syncKorualSignal` from a time-based trigger or spreadsheet event trigger.
