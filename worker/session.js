const encoder = new TextEncoder();
const lifetime = 12 * 3600;

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function decode(value) {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
}

async function key(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign', 'verify']);
}

function name(request) {
  return new URL(request.url).protocol === 'https:' ? '__Host-jz_session' : 'jz_local_session';
}

export function cookie(request, value = '') {
  const secure = name(request).startsWith('__Host-') ? '; Secure' : '';
  return name(request) + '=' + value + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + (value ? lifetime : 0) + secure;
}

export async function issue(request, secret, user) {
  const data = base64url(encoder.encode(JSON.stringify({id:user.id, email:user.email, exp:Date.now()+lifetime*1000})));
  const signature = await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(data));
  return cookie(request, data + '.' + base64url(new Uint8Array(signature)));
}

export async function current(request, secret) {
  const prefix = name(request) + '=';
  const raw = (request.headers.get('Cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(prefix));
  if (!raw || !secret || raw.length > 4096) return null;
  try {
    const parts = raw.slice(prefix.length).split('.');
    if (parts.length !== 2 || !await crypto.subtle.verify('HMAC', await key(secret), decode(parts[1]), encoder.encode(parts[0]))) return null;
    const {id, email, exp} = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    return exp > Date.now() && id && email ? {id, email} : null;
  } catch {
    return null;
  }
}
