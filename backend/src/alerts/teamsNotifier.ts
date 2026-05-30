/**
 * Teams Notifier — Direct Incoming Webhook (webhook.office.com)
 *
 * Uses the MessageCard format which is required by Teams Incoming Webhooks.
 * No Power Automate. Posts directly to the Teams channel.
 */

export interface TeamsAlertPayload {
  ruleName:     string;
  alertType:    string;   // 'High Failure' | 'New Error' | 'Regression'
  projectName:  string;
  errorMsg:     string;
  count?:       number;
  errorDetail?: string;
  label?:       string;
}

export async function sendTeamsAlert(p: TeamsAlertPayload): Promise<void> {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL?.trim() ?? '';

  if (!webhookUrl) {
    console.warn('[Teams] TEAMS_WEBHOOK_URL not set in .env — skipping');
    return;
  }

  const icon  = p.alertType === 'High Failure' ? '🔥'
              : p.alertType === 'Regression'   ? '🔄'
              : '🆕';

  const color = p.alertType === 'High Failure' ? 'FF0000'
              : p.alertType === 'Regression'   ? 'FFA500'
              : '0078D4';

  const title = p.label
    ? `🧪 [TEST] ${p.projectName} — ${p.alertType}`
    : `${icon} ${p.alertType} Alert — ${p.projectName}`;

  // Build facts list
  const facts: { name: string; value: string }[] = [
    { name: 'Project',    value: p.projectName },
    { name: 'Alert Type', value: p.alertType },
    { name: 'Rule',       value: p.ruleName },
    { name: 'Error',      value: p.errorMsg },
  ];
  if (p.count !== undefined) {
    facts.push({ name: 'Occurrences', value: `${p.count} in window` });
  }
  facts.push({ name: 'Time', value: new Date().toLocaleString() });

  // MessageCard format — required by webhook.office.com
  const payload: Record<string, unknown> = {
    '@type':    'MessageCard',
    '@context': 'http://schema.org/extensions',
    summary:    title,
    themeColor: color,
    title,
    sections: [
      {
        activityTitle:    `**${p.projectName}**`,
        activitySubtitle: p.alertType,
        facts,
      },
      // Stack trace section (only if detail provided)
      ...(p.errorDetail ? [{
        title: '📄 Stack Trace',
        text:  `<pre>${p.errorDetail.slice(0, 500).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`,
      }] : []),
    ],
  };

  try {
    const res  = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const body = await res.text().catch(() => '');

    if (res.ok || res.status === 202) {
      console.log(`[Teams] ✅ Alert sent → [${p.alertType}] ${p.projectName}: ${p.errorMsg}`);
    } else {
      console.error(`[Teams] ❌ HTTP ${res.status}: ${body}`);
    }
  } catch (err) {
    console.error('[Teams] ❌ Network error:', err);
  }
}

// ─── Diagnostic ───────────────────────────────────────────────────────────────

export async function testTeamsWebhook(): Promise<{
  webhookUrl: string;
  configured: boolean;
  status?:    number;
  ok?:        boolean;
  error?:     string;
  message:    string;
}> {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL?.trim() ?? '';

  if (!webhookUrl) {
    return {
      webhookUrl: '(not set)',
      configured: false,
      message:    'TEAMS_WEBHOOK_URL is not set in .env',
    };
  }

  const payload = {
    '@type':    'MessageCard',
    '@context': 'http://schema.org/extensions',
    summary:    '🔔 Airbrake Portal — Webhook Test',
    themeColor: '0078D4',
    title:      '🔔 Airbrake Portal — Webhook Test',
    sections: [{
      facts: [
        { name: 'Status',  value: '✅ Connection successful' },
        { name: 'Message', value: 'Teams alerts are working correctly' },
        { name: 'Time',    value: new Date().toLocaleString() },
      ],
    }],
  };

  try {
    const res  = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const body = await res.text().catch(() => '');
    const ok   = res.ok || res.status === 202;

    console.log(`[Teams] Diagnostic → HTTP ${res.status} | ok=${ok} | body="${body}"`);

    return {
      webhookUrl:  webhookUrl.slice(0, 60) + '…',
      configured:  true,
      status:      res.status,
      ok,
      message: ok
        ? '✅ Test card sent — check your Teams channel now'
        : `❌ Webhook returned ${res.status}: ${body}`,
    };
  } catch (err: any) {
    return {
      webhookUrl:  webhookUrl.slice(0, 60) + '…',
      configured:  true,
      error:       err.message,
      message:     `❌ Network error: ${err.message}`,
    };
  }
}
