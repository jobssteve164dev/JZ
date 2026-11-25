import './style.css';

const form = document.querySelector('form');
const status = document.querySelector('#status');
const options = document.querySelector('#options');
const submit = document.querySelector('#submit');
const titles = {
  login:'登录', register:'注册账号', 'forgot-password':'找回密码', 'reset-password':'设置新密码',
  'verify-email':'验证邮箱', 'resend-verification':'重发验证邮件', logout:'我的账号',
};
const notices = {
  register:'请前往邮箱，打开验证邮件完成注册。',
  'forgot-password':'如果该邮箱已注册，你将收到重设密码的邮件。',
  'resend-verification':'请查看邮箱中的验证邮件。', 'reset-password':'密码已更新，可以登录了。',
};
let mode;
let token = new URLSearchParams(location.search).get('token');
if (token) history.replaceState(null, '', location.pathname);

async function api(action, data) {
  const response = await fetch('/api/auth/' + action, data ? {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data), cache:'no-store',
  } : {cache:'no-store'});
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !Object.keys(body).length && action !== 'logout') throw new Error(body.error || '账号服务暂时不可用，请稍后再试。');
  return body;
}

function show(next, message = '') {
  mode = next;
  const email = ['login','register','forgot-password','resend-verification'].includes(mode);
  const password = ['login','register','reset-password'].includes(mode);
  document.querySelector('#title').textContent = titles[mode];
  for (const [name, enabled] of [['email', email], ['password', password]]) {
    form.elements[name].disabled = !enabled;
    document.querySelector('#' + name + '-field').hidden = !enabled;
  }
  form.elements.password.value = '';
  form.elements.password.minLength = mode === 'login' ? 1 : 8;
  form.elements.password.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  form.hidden = false;
  const needsToken = mode === 'verify-email' || mode === 'reset-password';
  submit.disabled = needsToken && !token;
  submit.textContent = mode === 'logout' ? '退出登录' : titles[mode];
  status.textContent = submit.disabled ? '邮件链接不完整，请重新打开最新的邮件。' : message;
  options.replaceChildren();
  const links = mode === 'login' ? ['register','forgot-password','resend-verification'] : mode === 'logout' ? [] : ['login'];
  for (const dest of links) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = titles[dest];
    button.onclick = () => show(dest);
    options.append(button);
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled) return;
  submit.disabled = true;
  options.inert = true;
  const data = Object.fromEntries(new FormData(form));
  if (mode === 'verify-email' || mode === 'reset-password') data.token = token;
  try {
    const result = await api(mode, data);
    if (result.user) {
      token = null;
      show('logout', '已登录 · ' + result.user.email);
    } else {
      const message = notices[mode] || '已退出登录。';
      if (mode === 'reset-password') token = null;
      show('login', message);
    }
  } catch (error) {
    status.textContent = error instanceof TypeError ? '连接失败，请检查网络后重试。' : error.message;
    submit.disabled = false;
  } finally {
    options.inert = false;
  }
});

async function open() {
  const action = location.pathname.split('/')[1];
  if (action === 'verify-email' || action === 'reset-password') return show(action);
  try {
    const {user} = await api('session');
    show(user ? 'logout' : 'login', user ? '已登录 · ' + user.email : '');
  } catch {
    show('login', '暂时无法连接账号服务，你仍可返回练习。');
  }
}
open();
