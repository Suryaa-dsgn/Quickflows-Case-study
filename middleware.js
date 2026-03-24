// No framework imports — pure Web Standard APIs (works on Vercel Edge for static sites)

// Pages that are always accessible (no auth required)
const PUBLIC_PATHS = ['/password.html', '/api/auth'];

export default async function middleware(request) {
  const { pathname } = new URL(request.url);

  // Allow public paths through (returning undefined = pass-through)
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return;
  }

  // Read the auth_token cookie from the request headers
  const cookieHeader = request.headers.get('cookie') ?? '';
  const token = getCookieValue(cookieHeader, 'auth_token');

  if (token && await isValidToken(token, process.env.COOKIE_SECRET)) {
    return; // authenticated — pass-through, serve the static file
  }

  // Not authenticated — redirect to password gate
  return Response.redirect(new URL('/password.html', request.url), 302);
}

/**
 * Verifies HMAC-SHA256 signature of the auth token.
 * Token format:  base64(timestamp) . base64(signature)
 */
async function isValidToken(token, secret) {
  try {
    const [payloadB64, sigB64] = token.split('.');
    if (!payloadB64 || !sigB64) return false;

    const keyData = new TextEncoder().encode(secret || 'fallback-secret');
    const key = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );

    const sigBytes = base64ToBytes(sigB64);
    const payloadBytes = new TextEncoder().encode(payloadB64);

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, payloadBytes);
    if (!valid) return false;

    // Optionally check expiry (24 hours)
    const payload = JSON.parse(atob(payloadB64));
    const elapsed = Date.now() - payload.ts;
    return elapsed < 24 * 60 * 60 * 1000; // 24 h
  } catch {
    return false;
  }
}

function getCookieValue(cookieHeader, name) {
  const match = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith(name + '='));
  return match ? match.slice(name.length + 1) : null;
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}


export const config = {
  // Run on every path except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
