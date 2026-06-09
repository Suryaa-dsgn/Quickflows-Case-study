/**
 * POST /api/auth
 * Serverless function — validates the submitted password against the
 * SITE_PASSWORD environment variable. On success, sets a signed HttpOnly
 * cookie and redirects to the site root. On failure, redirects back
 * to the password page with an error flag.
 *
 * Environment variables required (set in Vercel dashboard):
 *   SITE_PASSWORD  — the plain-text password visitors must enter
 *   COOKIE_SECRET  — a random secret string used to sign the auth cookie
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  // Parse the form body (Vercel serverless functions parse JSON automatically;
  // for form submissions we parse the URL-encoded body manually)
  let submitted = '';
  if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
    const raw = await getRawBody(req);
    const params = new URLSearchParams(raw);
    submitted = params.get('password') ?? '';
  } else {
    // JSON body (future API use)
    submitted = req.body?.password ?? '';
  }

  const correctPassword = process.env.SITE_PASSWORD;
  const cookieSecret   = process.env.COOKIE_SECRET;

  if (!correctPassword || !cookieSecret) {
    console.error('[auth] SITE_PASSWORD or COOKIE_SECRET environment variable is not set.');
    return res.redirect(302, '/password.html?error=config');
  }

  // Constant-time comparison to prevent timing attacks
  if (!safeEqual(submitted, correctPassword)) {
    return res.redirect(302, '/password.html?error=1');
  }

  // Build a signed auth token: base64(payload) + "." + base64(hmac)
  const token = await buildToken(cookieSecret);

  // Set an HttpOnly cookie — JavaScript on the page can NEVER read this
  res.setHeader('Set-Cookie', [
    `auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`,
  ]);

  // Redirect to the protected site
  return res.redirect(302, '/');
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Reads raw request body as a string */
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/**
 * Constant-time string comparison — prevents timing oracle attacks.
 * Returns true only if both strings are byte-for-byte identical.
 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) {
    // Still iterate to avoid length-based timing leak
    let diff = 0;
    for (let i = 0; i < b.length; i++) diff |= (a.charCodeAt(0) ^ b.charCodeAt(i));
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Creates HMAC-SHA256 signed token.
 * payload = base64(JSON({ ts: Date.now() }))
 * token   = payload + "." + base64(hmac(payload, secret))
 */
async function buildToken(secret) {
  const payload = btoa(JSON.stringify({ ts: Date.now() }));
  const keyData = new TextEncoder().encode(secret);

  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );

  const sigBuffer = await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(payload)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));
  return `${payload}.${sigB64}`;
}
