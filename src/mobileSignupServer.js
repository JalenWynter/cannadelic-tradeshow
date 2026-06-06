import http from 'node:http';
import os from 'node:os';

export const MOBILE_SIGNUP_PORT = Number(process.env.MOBILE_SIGNUP_PORT) || 3847;

export function getLanHostAddress() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

export function getLanSignupUrl(port = MOBILE_SIGNUP_PORT) {
  return `http://${getLanHostAddress()}:${port}/signup`;
}

export function getLanStaffUrl(port = MOBILE_SIGNUP_PORT) {
  return `http://${getLanHostAddress()}:${port}/staff`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function mobileSignupPageHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>GŪDESSENCE — Quick Sign Up</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; font-family: system-ui, sans-serif; background: linear-gradient(160deg, #0a0a0c, #1a0a2e); color: #fff; padding: 24px 16px 40px; }
    .wrap { max-width: 420px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin: 0 0 6px; color: #ccff00; text-align: center; }
    p.sub { text-align: center; opacity: 0.75; font-size: 0.9rem; margin-bottom: 24px; line-height: 1.5; }
    label { display: block; font-size: 0.75rem; opacity: 0.8; margin-bottom: 6px; }
    input { width: 100%; padding: 14px; margin-bottom: 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: #fff; font-size: 1rem; }
    button { width: 100%; padding: 16px; border: none; border-radius: 12px; background: #ccff00; color: #000; font-weight: bold; font-size: 1.05rem; cursor: pointer; }
    .msg { text-align: center; padding: 14px; border-radius: 10px; margin-bottom: 16px; display: none; }
    .msg.error { display: block; background: rgba(255,0,127,0.15); border: 1px solid #ff007f; }
    .msg.success { display: block; background: rgba(204,255,0,0.12); border: 1px solid #ccff00; color: #ccff00; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .badge { display: inline-block; margin-top: 10px; padding: 6px 12px; border-radius: 999px; background: rgba(255,0,127,0.2); color: #ff007f; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Cannadelic Night Market</h1>
    <p class="sub">Booth Wi‑Fi signup — status stays <strong>Pending</strong> until staff approves.</p>
    <div id="msg" class="msg"></div>
    <form id="form">
      <div class="row">
        <div><label>FIRST NAME *</label><input name="firstName" required /></div>
        <div><label>LAST NAME</label><input name="lastName" /></div>
      </div>
      <label>EMAIL</label><input name="email" type="email" inputmode="email" />
      <label>PHONE</label><input name="phone" type="tel" inputmode="tel" />
      <button type="submit">Submit — Pending Approval</button>
    </form>
  </div>
  <script>
    document.getElementById('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('msg');
      msg.className = 'msg';
      const fd = new FormData(e.target);
      const body = Object.fromEntries(fd.entries());
      if (!body.email && !body.phone) { msg.className = 'msg error'; msg.textContent = 'Enter email or phone.'; return; }
      try {
        const res = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        msg.className = 'msg success';
        msg.innerHTML = 'Submitted!<span class="badge">PENDING</span><br><br>See staff at the booth.';
        e.target.reset();
      } catch (err) { msg.className = 'msg error'; msg.textContent = err.message; }
    });
  </script>
</body>
</html>`;
}

function staffPageHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GŪDESSENCE — Staff QR Approvals</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; background: #0a0a0c; color: #fff; padding: 20px; }
    h1 { color: #ccff00; font-size: 1.4rem; margin: 0 0 4px; }
    .sub { opacity: 0.65; font-size: 0.85rem; margin-bottom: 20px; }
    .staff-row { display: flex; gap: 10px; margin-bottom: 20px; }
    .staff-row input { flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #333; background: #111; color: #fff; }
    .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(204,255,0,0.25); border-radius: 12px; padding: 14px; margin-bottom: 12px; }
    .card h3 { margin: 0 0 8px; color: #fff; font-size: 1rem; }
    .meta { font-size: 0.8rem; opacity: 0.75; line-height: 1.5; }
    .pending { color: #ff007f; font-weight: bold; font-size: 0.75rem; margin-top: 6px; }
    button.approve { background: #ccff00; color: #000; border: none; padding: 10px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 10px; width: 100%; }
    button.decline { background: rgba(255,80,80,0.2); color: #ff8a8a; border: 1px solid rgba(255,80,80,0.45); padding: 10px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 8px; width: 100%; }
    button.approve:disabled, button.decline:disabled { opacity: 0.5; }
    .ref { font-family: ui-monospace, monospace; color: #ccff00; font-size: 0.85rem; margin-bottom: 6px; }
    .empty { text-align: center; opacity: 0.5; padding: 40px 0; }
    .count { float: right; font-size: 0.85rem; opacity: 0.6; }
  </style>
</head>
<body>
  <h1>Staff — QR Signup Queue <span class="count" id="count">0 waiting</span></h1>
  <p class="sub">Verify guest info, then approve or decline. LAN only — booth Wi‑Fi required.</p>
  <div class="staff-row">
    <input id="staffName" placeholder="Your staff name" value="Staff" />
    <button class="approve" style="width:auto;margin:0" onclick="load()">Refresh</button>
  </div>
  <div id="list"></div>
  <script>
    async function load() {
      const res = await fetch('/api/pending');
      const data = await res.json();
      const list = document.getElementById('list');
      const signups = data.signups || [];
      document.getElementById('count').textContent = signups.length + ' waiting';
      if (!signups.length) { list.innerHTML = '<div class="empty">No pending QR signups</div>'; return; }
      list.innerHTML = signups.map(s => \`
        <div class="card" id="card-\${s.contact_id}">
          \${(s.guest_reference || s.display_id) ? '<div class="ref">' + (s.guest_reference || s.display_id) + '</div>' : ''}
          <h3>\${s.name}</h3>
          <div class="meta">
            \${s.email ? '✉ ' + s.email + '<br>' : ''}
            \${s.phone ? '☎ ' + s.phone + '<br>' : ''}
            \${s.is_new ? 'New guest' : 'Returning guest'} · \${new Date(s.signed_up_at).toLocaleTimeString()}
          </div>
          <div class="pending">STATUS: PENDING</div>
          <button class="approve" onclick="approve(\${s.contact_id})">Approve & Save</button>
          <button class="decline" onclick="decline(\${s.contact_id})">Decline</button>
        </div>\`).join('');
    }
    async function approve(contactId) {
      const staffName = document.getElementById('staffName').value.trim() || 'Staff';
      if (!confirm('Approve this signup and save to the event database?')) return;
      const card = document.getElementById('card-' + contactId);
      if (card) card.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      try {
        const res = await fetch('/api/confirm/' + contactId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staffName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        load();
      } catch (e) {
        alert(e.message);
        if (card) card.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      }
    }
    async function decline(contactId) {
      const staffName = document.getElementById('staffName').value.trim() || 'Staff';
      if (!confirm('Decline this signup and remove from queue?')) return;
      const card = document.getElementById('card-' + contactId);
      if (card) card.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      try {
        const res = await fetch('/api/deny/' + contactId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staffName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        load();
      } catch (e) {
        alert(e.message);
        if (card) card.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      }
    }
    load();
    setInterval(load, 4000);
  </script>
</body>
</html>`;
}

export function startMobileSignupServer(handlers, onUpdate) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');

      if (req.method === 'GET' && (url.pathname === '/signup' || url.pathname === '/')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(mobileSignupPageHtml());
        return;
      }

      if (req.method === 'GET' && url.pathname === '/staff') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(staffPageHtml());
        return;
      }

      if (req.method === 'GET' && (url.pathname === '/api/pending' || url.pathname === '/api/recent-signups')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ signups: handlers.getPendingMobileSignups() }));
        return;
      }

      if (req.method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, signup: getLanSignupUrl(MOBILE_SIGNUP_PORT), staff: getLanStaffUrl(MOBILE_SIGNUP_PORT) }));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/signup') {
        const raw = await readBody(req);
        const body = JSON.parse(raw || '{}');
        const result = handlers.registerMobileSignup(body);
        onUpdate?.(result);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, contactId: result.contactId, status: 'pending' }));
        return;
      }

      if (req.method === 'POST' && url.pathname.startsWith('/api/confirm/')) {
        const contactId = Number(url.pathname.split('/').pop());
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        const result = handlers.confirmMobileSignup(contactId, 'LAN Staff Page', body.staffName || 'Staff');
        onUpdate?.(result);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      if (req.method === 'POST' && url.pathname.startsWith('/api/deny/')) {
        const contactId = Number(url.pathname.split('/').pop());
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        const result = handlers.denyMobileSignup(contactId, 'LAN Staff Page', body.staffName || 'Staff');
        onUpdate?.(result);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Request failed' }));
    }
  });

  server.listen(MOBILE_SIGNUP_PORT, '0.0.0.0', () => {
    console.log(`LAN signup:  ${getLanSignupUrl(MOBILE_SIGNUP_PORT)}`);
    console.log(`LAN staff:   ${getLanStaffUrl(MOBILE_SIGNUP_PORT)}`);
  });

  return {
    port: MOBILE_SIGNUP_PORT,
    getSignupUrl: () => getLanSignupUrl(MOBILE_SIGNUP_PORT),
    getStaffUrl: () => getLanStaffUrl(MOBILE_SIGNUP_PORT),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
