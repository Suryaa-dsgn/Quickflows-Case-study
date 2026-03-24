/**
 * POST /api/request-access
 * Sends an access request email to the site owner via Resend.
 *
 * Environment variables required (set in Vercel dashboard):
 *   RESEND_API_KEY  — API key from resend.com (free tier: 100 emails/day)
 *   OWNER_EMAIL     — your email address where requests are delivered
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Parse body (JSON from fetch, or URL-encoded from native form)
  let name = '', email = '', message = '';
  const ct = req.headers['content-type'] ?? '';

  if (ct.includes('application/json')) {
    name    = req.body?.name    ?? '';
    email   = req.body?.email   ?? '';
    message = req.body?.message ?? '';
  } else {
    const raw = await getRawBody(req);
    const p   = new URLSearchParams(raw);
    name    = p.get('name')    ?? '';
    email   = p.get('email')   ?? '';
    message = p.get('message') ?? '';
  }

  // Basic validation
  if (!name.trim() || !email.trim()) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const apiKey     = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.OWNER_EMAIL;

  if (!apiKey || !ownerEmail) {
    console.error('[request-access] Missing RESEND_API_KEY or OWNER_EMAIL env vars.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  // Send email via Resend REST API
  const emailBody = {
    from:     'Case Study Access <onboarding@resend.dev>',
    to:       [ownerEmail],
    reply_to: email,                          // hit Reply → goes straight to requester
    subject:  `Access Request – Quickflows Case Study`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;color:#1A1917">
        <p style="font-size:13px;color:#6A6860;margin-bottom:24px">
          Someone has requested access to your NDA-protected case study.
        </p>

        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #E2DFD6;color:#6A6860;width:90px">Name</td>
            <td style="padding:10px 0;border-bottom:1px solid #E2DFD6;font-weight:500">${escHtml(name)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #E2DFD6;color:#6A6860">Email</td>
            <td style="padding:10px 0;border-bottom:1px solid #E2DFD6">
              <a href="mailto:${escHtml(email)}" style="color:#6D1FC7">${escHtml(email)}</a>
            </td>
          </tr>
          ${message.trim() ? `
          <tr>
            <td style="padding:10px 0;color:#6A6860;vertical-align:top">Message</td>
            <td style="padding:10px 0">${escHtml(message)}</td>
          </tr>` : ''}
        </table>

        <p style="margin-top:28px;font-size:13px;color:#6A6860">
          To grant access, simply <strong>reply to this email</strong> with the password —
          your reply will go directly to ${escHtml(name)}.
        </p>

        <hr style="border:none;border-top:1px solid #E2DFD6;margin:28px 0">
        <p style="font-size:11px;color:#9CA3AF">
          Quickflows.ai · Product Design Case Study · ${new Date().getFullYear()}
        </p>
      </div>
    `,
  };

  const response = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(emailBody),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[request-access] Resend error:', err);
    return res.status(500).json({ error: 'Failed to send email. Please try again.' });
  }

  return res.status(200).json({ ok: true });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
