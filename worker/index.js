import { createPassportClient } from '@szlk/passport-client';
import { questions } from '../src/lights.js';
import { cookie, current, issue } from './session.js';

function json(data, status = 200, sessionCookie) {
  const headers = {'Cache-Control':'no-store'};
  if (sessionCookie) headers['Set-Cookie'] = sessionCookie;
  return Response.json(data, {status, headers});
}

const messages = {
  auth_invalid_credentials:'邮箱或密码不正确。',
  auth_email_exists:'这个邮箱已注册，可以直接登录。',
  auth_password_too_short:'密码至少需要 8 个字符。',
  auth_rate_limited:'尝试次数过多，请稍后再试。',
  auth_email_not_verified:'请先验证邮箱，再登录。',
};
const actions = new Set(['login','register','verify-email','resend-verification','forgot-password','reset-password']);

export async function handle(request, env, fetchImpl = fetch) {
  const {origin, pathname} = new URL(request.url);
  if (pathname === '/verify-email' || pathname === '/reset-password') {
    const page = await env.ASSETS.fetch(new Request(origin + '/account/', {method:'GET'}));
    const result = new Response(page.body, page);
    result.headers.set('Referrer-Policy','no-referrer');
    result.headers.set('Cache-Control','no-store');
    return result;
  }
  if (pathname === '/api/practice/start') {
    if (request.method !== 'POST' || request.headers.get('Origin') !== origin) return json({}, 403);
    if (!await current(request, env.SESSION_SECRET)) return json({}, 401);
    return json({questions});
  }
  if (!pathname.startsWith('/api/auth/')) return env.ASSETS.fetch(request);
  const action = pathname.slice('/api/auth/'.length);
  if (action === 'session' && request.method === 'GET') return json({user:await current(request, env.SESSION_SECRET)});
  if (request.method !== 'POST' || request.headers.get('Origin') !== origin) return json({error:'请从当前页面重试。'}, 403);
  if (action === 'logout') return json({}, 200, cookie(request));
  if (!actions.has(action)) return json({}, 404);
  if (!env.PASSPORT_PRODUCT || !env.SZLK_PASSPORT_SECRET || !(env.SESSION_SECRET?.length >= 32)) return json({error:'账号服务暂时不可用，请稍后再试。'}, 503);
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return json({}, 415);
  const address = request.headers.get('CF-Connecting-IP') || 'local';
  if (!(await env.AUTH_LIMIT.limit({key:address})).success) return json({error:messages.auth_rate_limited}, 429);
  const reader = request.body?.getReader();
  if (!reader) return json({}, 400);
  const chunks = [];
  let size = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) {
      await reader.cancel();
      return json({}, 413);
    }
    chunks.push(value);
  }
  const body = await new Response(new Blob(chunks)).json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body?.password;
  const token = body?.token;
  if ((['login','register','resend-verification','forgot-password'].includes(action) && (!email || email.length > 254)) ||
      (['login','register','reset-password'].includes(action) && (typeof password !== 'string' || !password || password.length > 1024)) ||
      (['verify-email','reset-password'].includes(action) && (typeof token !== 'string' || !token || token.length > 4096))) return json({error:'请检查填写的信息或重新打开邮件链接。'}, 400);
  const client = createPassportClient({product:env.PASSPORT_PRODUCT, secret:env.SZLK_PASSPORT_SECRET, baseUrl:'https://passport.szlk.ai', fetchImpl});
  try {
    if (action === 'register') await client.registerWithPassword({email,password,appBaseUrl:origin});
    else if (action === 'forgot-password') await client.forgotPassword({email,appBaseUrl:origin});
    else if (action === 'reset-password') await client.resetPassword({token,password});
    else if (action === 'resend-verification') await client.resendVerification({email,appBaseUrl:origin});
    else {
      const result = action === 'login' ? await client.loginWithPassword({email,password}) : await client.verifyEmailToken({token});
      const user = result.user;
      if (!user?.id || !user.email || user.emailVerified !== true || result.needsEmailVerification) return json({error:'请先验证邮箱，再登录。'}, 403);
      const link = await client.linkIdentity({email:user.email, productUid:user.id});
      if ((link.userId ?? link.user_id) !== user.id || (link.productUid ?? link.product_uid) !== user.id) return json({error:'登录未完成，请重试。'}, 409);
      return json({user:{id:user.id,email:user.email}}, 200, await issue(request, env.SESSION_SECRET, user));
    }
    return json({ok:true});
  } catch (error) {
    return json({error:messages[error.code] || (['verify-email','reset-password'].includes(action) && error.status === 400 ? '邮件链接无效或已过期。' : '操作未完成，请稍后重试。')}, error.status >= 400 && error.status <= 599 ? error.status : 503);
  }
}

export default {fetch(request, env) { return handle(request, env); }};
