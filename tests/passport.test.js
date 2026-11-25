import test from 'node:test';
import assert from 'node:assert/strict';
import {handle} from '../worker/index.js';

const origin = 'https://km3.example';
const user = {id:'example-id', email:'learner@example.test', emailVerified:true};
const env = {PASSPORT_PRODUCT:'isolated-test', SZLK_PASSPORT_SECRET:'test', SESSION_SECRET:'a'.repeat(40), AUTH_LIMIT:{limit:async () => ({success:true})}};

function post(action, body, overrides = {}) {
  return new Request(origin + '/api/auth/' + action, {method:'POST', headers:{Origin:origin,'Content-Type':'application/json',...overrides}, body:JSON.stringify(body)});
}

test('Passport registration, verified identity, signed session and logout', async () => {
  const calls = [];
  const provider = async (url, init) => {
    const input = JSON.parse(init.body);
    const action = new URL(url).pathname.split('/').pop();
    calls.push(action);
    assert.equal(init.headers['X-SZLK-Product'], env.PASSPORT_PRODUCT);
    if (action === 'register') assert.equal(input.appBaseUrl, origin);
    const data = action === 'link' ? {userId:user.id, productUid:user.id} : {user};
    return Response.json({ok:true,data});
  };
  assert.equal((await handle(post('register', {email:user.email,password:'test-password'}),env,provider)).status,200);
  for (const action of ['verify-email','login']) {
    const res = await handle(post(action,{email:user.email,password:'test-password',token:'test-token'}),env,provider);
    assert.equal(res.status,200);
    const header = res.headers.get('Set-Cookie');
    assert.match(header,/HttpOnly/);
    assert.match(header,/Secure/);
    const session = cookie => handle(new Request(origin+'/api/auth/session',{headers:{Cookie:cookie}}),env).then(r=>r.json());
    const pair = header.split(';')[0];
    assert.equal((await session(pair)).user.id,user.id);
    assert.equal((await session(pair+'bad')).user,null);
  }
  assert.deepEqual(calls,['register','verify-email','link','login','link']);
  assert.match((await handle(post('logout',{}),env)).headers.get('Set-Cookie'),/Max-Age=0/);
});

test('reject invalid inputs and unverified users without issuing a session', async () => {
  const noCall = () => assert.fail('unexpected Passport request');
  const body = {email:user.email,password:'test-password'};
  for (const [req, bindings, status] of [
    [post('login',body,{Origin:'https://other.example'}),env,403],
    [post('login',body),{...env,SESSION_SECRET:''},503],
    [post('login',{}),env,400],
    [post('login',{extra:'x'.repeat(8193)}),env,413],
    [post('login',body),{...env,AUTH_LIMIT:{limit:async()=>({success:false})}},429],
  ]) assert.equal((await handle(req,bindings,noCall)).status,status);
  const res = await handle(post('login',body),env, async () => Response.json({ok:true,data:{user:{...user,emailVerified:false}}}));
  assert.equal(res.status,403);
  assert.equal(res.headers.get('Set-Cookie'),null);
});

test('practice material is issued only to a verified signed-in learner', async () => {
  const start = cookie => new Request(origin+'/api/practice/start',{
    method:'POST',headers:{Origin:origin,Cookie:cookie},
  });
  const provider = async url => Response.json({ok:true,data:url.endsWith('/link') ? {userId:user.id,productUid:user.id} : {user}});
  const verified = await handle(post('verify-email',{token:'fixture'}),env,provider);
  const cookie = verified.headers.get('Set-Cookie').split(';')[0];
  for (const value of ['',cookie+'invalid']) {
    const denied = await handle(start(value),env);
    assert.equal(denied.status,401);
    assert.equal((await denied.json()).questions,undefined);
  }
  const allowed = await handle(start(cookie),env);
  assert.equal(allowed.status,200);
  assert.equal(allowed.headers.get('Cache-Control'),'no-store');
  assert.equal((await allowed.json()).questions.length,19);
});
