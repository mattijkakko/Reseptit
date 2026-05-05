const _AUTH_PW_KEY  = 'reseptikirja_pw';
const _AUTH_URL_KEY = 'reseptikirja_worker';

function getWorkerUrl() { return (localStorage.getItem(_AUTH_URL_KEY) || '').replace(/\/$/, ''); }
function getPassword()  { return localStorage.getItem(_AUTH_PW_KEY) || ''; }

function _saveAuth(url, pw) {
  localStorage.setItem(_AUTH_URL_KEY, url.replace(/\/$/, ''));
  localStorage.setItem(_AUTH_PW_KEY, pw);
}

function clearAuth() {
  localStorage.removeItem(_AUTH_PW_KEY);
  localStorage.removeItem(_AUTH_URL_KEY);
}

async function _checkAuth(url, pw) {
  const r = await fetch(`${url}/verify`, {
    method: 'POST',
    headers: { 'X-Auth-Password': pw },
  });
  return r.ok;
}

async function requireAuth() {
  const url = getWorkerUrl();
  const pw  = getPassword();
  if (url && pw) {
    try {
      if (await _checkAuth(url, pw)) return;
    } catch {}
  }
  await new Promise(resolve => _showLogin(resolve));
}

function _showLogin(onSuccess) {
  const overlay = document.createElement('div');
  overlay.className = 'login-overlay';
  overlay.innerHTML = `
    <div class="login-card">
      <div class="login-logo">Reseptikirja</div>
      <p class="login-sub">Kirjaudu sisään jatkaaksesi</p>
      <div class="field">
        <label for="l-url">Worker-osoite</label>
        <input id="l-url" type="url" placeholder="https://resepti-proxy.käyttäjä.workers.dev" autocomplete="url">
      </div>
      <div class="field">
        <label for="l-pw">Salasana</label>
        <input id="l-pw" type="password" placeholder="••••••••" autocomplete="current-password">
      </div>
      <p id="l-err" class="login-err" hidden></p>
      <button id="l-btn" class="btn btn-primary" style="width:100%;margin-top:4px">Kirjaudu</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const urlEl = overlay.querySelector('#l-url');
  const pwEl  = overlay.querySelector('#l-pw');
  const btn   = overlay.querySelector('#l-btn');
  const errEl = overlay.querySelector('#l-err');

  urlEl.value = getWorkerUrl();

  async function tryLogin() {
    const url = urlEl.value.trim().replace(/\/$/, '');
    const pw  = pwEl.value;
    if (!url || !pw) { _showErr('Täytä molemmat kentät.'); return; }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    errEl.hidden = true;

    try {
      if (await _checkAuth(url, pw)) {
        _saveAuth(url, pw);
        overlay.remove();
        onSuccess();
      } else {
        _showErr('Väärä salasana tai Worker-osoite.');
      }
    } catch {
      _showErr('Yhteys epäonnistui. Tarkista Worker-osoite.');
    }

    btn.disabled = false;
    btn.textContent = 'Kirjaudu';
  }

  function _showErr(msg) { errEl.textContent = msg; errEl.hidden = false; }

  btn.addEventListener('click', tryLogin);
  pwEl.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
  setTimeout(() => (urlEl.value ? pwEl : urlEl).focus(), 50);
}

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => { clearAuth(); location.reload(); });
  }
});
