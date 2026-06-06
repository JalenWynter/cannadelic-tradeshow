import { LIMITS, US_PHONE_RE } from './validateSignup.js';

export function guestSignupPageHtml(eventId, eventTitle) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <meta name="theme-color" content="#0a0a0c" />
  <title>GŪDESSENCE Quick Sign Up</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(160deg, #0a0a0c 0%, #1a0a2e 100%);
      color: #fff; padding: 24px 16px 40px;
    }
    .wrap { max-width: 420px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin: 0 0 6px; color: #ccff00; text-align: center; }
    p.sub { text-align: center; opacity: 0.75; font-size: 0.9rem; margin-bottom: 24px; line-height: 1.5; }
    label { display: block; font-size: 0.75rem; opacity: 0.8; margin-bottom: 6px; letter-spacing: 1px; }
    input {
      width: 100%; padding: 14px; margin-bottom: 16px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06);
      color: #fff; font-size: 1rem;
    }
    input:focus { outline: 2px solid #ccff00; border-color: #ccff00; }
    .btn-primary {
      width: 100%; padding: 16px; border: none; border-radius: 12px;
      background: #ccff00; color: #000; font-weight: bold; font-size: 1.05rem;
      cursor: pointer; margin-top: 8px; min-height: 52px;
      -webkit-tap-highlight-color: transparent;
    }
    .btn-primary:disabled { opacity: 0.65; cursor: wait; }
    .btn-secondary {
      width: 100%; padding: 14px; border: 1px solid rgba(255,255,255,0.25); border-radius: 12px;
      background: transparent; color: #fff; font-weight: 600; font-size: 0.95rem;
      cursor: pointer; margin-top: 10px;
    }
    .msg { text-align: center; padding: 14px; border-radius: 10px; margin-bottom: 16px; display: none; }
    .msg.error { display: block; background: rgba(255,0,127,0.15); border: 1px solid #ff007f; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-hidden { display: none !important; }
    .receipt-panel { text-align: center; padding: 8px 0 24px; }
    .receipt-card {
      text-align: left; margin: 16px auto; padding: 20px; border-radius: 16px;
      border: 2px solid rgba(255,0,127,0.45); background: rgba(255,255,255,0.04);
      max-width: 360px;
    }
    .receipt-card.approved {
      border-color: #22c55e;
      background: rgba(34,197,94,0.12);
      animation: approvedGlow 1.2s ease-out;
    }
    .receipt-card.denied {
      border-color: #ef4444;
      background: rgba(239,68,68,0.1);
    }
    .receipt-card.status-notify {
      animation-duration: 1.2s;
      animation-timing-function: ease-out;
      animation-fill-mode: both;
    }
    .receipt-card.approved.status-notify { animation-name: approvedGlow; }
    .receipt-card.denied.status-notify { animation-name: deniedGlow; }
    @keyframes approvedGlow {
      0% { box-shadow: 0 0 0 rgba(34,197,94,0); transform: scale(0.98); }
      50% { box-shadow: 0 0 28px rgba(34,197,94,0.55); transform: scale(1.01); }
      100% { box-shadow: 0 0 12px rgba(34,197,94,0.25); transform: scale(1); }
    }
    @keyframes deniedGlow {
      0% { box-shadow: 0 0 0 rgba(239,68,68,0); transform: scale(0.98); }
      50% { box-shadow: 0 0 28px rgba(239,68,68,0.55); transform: scale(1.01); }
      100% { box-shadow: 0 0 12px rgba(239,68,68,0.25); transform: scale(1); }
    }
    .msg.info { display: block; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.45); color: #ffb4b4; }
    .receipt-card h2 { margin: 0 0 12px; font-size: 1.15rem; color: #fff; text-align: center; }
    .receipt-card.approved h2 { color: #22c55e; }
    .receipt-row { display: flex; justify-content: space-between; gap: 12px; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .receipt-row:last-child { border-bottom: none; }
    .receipt-row span:first-child { opacity: 0.65; }
    .receipt-row span:last-child { font-weight: 600; text-align: right; word-break: break-word; }
    .badge { display: inline-block; padding: 8px 14px; border-radius: 999px; font-size: 0.85rem; font-weight: bold; letter-spacing: 0.5px; }
    .badge.pending { background: rgba(255,0,127,0.15); color: #ff007f; }
    .badge.approved { background: rgba(34,197,94,0.25); color: #22c55e; }
    .badge.denied { background: rgba(239,68,68,0.2); color: #ef4444; }
    .display-id { font-family: ui-monospace, monospace; font-size: 1.1rem; letter-spacing: 1px; color: #ccff00; text-align: center; margin: 8px 0 16px; }
    .receipt-card.approved .display-id { color: #4ade80; }
    .hint { font-size: 0.75rem; opacity: 0.55; text-align: center; margin-top: 12px; line-height: 1.45; }
    .field-hint { font-size: 0.7rem; opacity: 0.5; margin: -10px 0 16px; line-height: 1.4; }
    input.phone-valid { border-color: rgba(34,197,94,0.45); }
    input.phone-invalid { border-color: rgba(255,0,127,0.55); }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${eventTitle}</h1>
    <p class="sub" id="subtitle">Quick sign up for the booth queue.<br/>Status: <strong>Pending</strong> until staff confirms at the booth.</p>
    <div id="msg" class="msg"></div>
    <form id="form">
      <div class="row">
        <div>
          <label for="firstName">FIRST NAME *</label>
          <input id="firstName" name="firstName" required autocomplete="given-name" maxlength="${LIMITS.firstNameMax}" />
        </div>
        <div>
          <label for="lastName">LAST NAME</label>
          <input id="lastName" name="lastName" autocomplete="family-name" maxlength="${LIMITS.lastNameMax}" />
        </div>
      </div>
      <label for="email">EMAIL</label>
      <input id="email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="${LIMITS.emailMax}" />
      <label for="phone">PHONE (US)</label>
      <input id="phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="(555) 555-5555" maxlength="14" aria-describedby="phoneHint" />
      <p class="field-hint" id="phoneHint">10-digit US number only. Format added as you type.</p>
      <button type="submit" class="btn-primary" id="btnSubmit">Sign Up</button>
    </form>
    <div id="receiptPanel" class="receipt-panel form-hidden">
      <div id="receiptCard" class="receipt-card">
        <h2 id="receiptTitle">You are in the queue</h2>
        <div class="display-id" id="displayId">CND-00000</div>
        <p style="text-align:center;margin:0 0 12px"><span id="statusBadge" class="badge pending">PENDING</span></p>
        <div class="receipt-row"><span>Name</span><span id="rName">—</span></div>
        <div class="receipt-row"><span>Submitted</span><span id="rSubmitted">—</span></div>
        <div class="receipt-row" id="rowApproved" style="display:none"><span>Approved</span><span id="rApproved">—</span></div>
        <div class="receipt-row" id="rowDeclined" style="display:none"><span>Declined</span><span id="rDeclined">—</span></div>
      </div>
      <p class="sub" id="receiptMessage">Show staff your name and ID at the booth.</p>
      <button type="button" class="btn-primary" id="btnSave">Save reference image</button>
      <button type="button" class="btn-secondary" id="btnShare">Share / save to photos</button>
      <button type="button" class="btn-secondary form-hidden" id="btnSignUpAgain">Sign up again now</button>
      <p class="hint">Your reference is saved in this browser until you scan the QR again on a new device.</p>
    </div>
  </div>
  <script>
    const EVENT_ID = ${JSON.stringify(eventId)};
    const STORAGE_KEY = 'gudessence-signup-session-' + EVENT_ID;
    const LIMITS = ${JSON.stringify(LIMITS)};
    const US_PHONE_RE = ${US_PHONE_RE.toString()};
    const NAME_RE = /^[\\p{L}\\p{M}' .-]+$/u;
    const form = document.getElementById('form');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnSignUpAgain = document.getElementById('btnSignUpAgain');
    const phoneInput = document.getElementById('phone');
    const msg = document.getElementById('msg');
    const receiptPanel = document.getElementById('receiptPanel');
    const receiptCard = document.getElementById('receiptCard');
    const subtitle = document.getElementById('subtitle');
    let pollTimer = null;
    let deniedReturnTimer = null;
    let sessionData = null;
    let lastPolledStatus = null;
    const DENIED_RETURN_MS = 4500;
    const defaultTitle = document.title;

    function fmtTime(iso) {
      if (!iso) return '—';
      try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
      catch { return iso; }
    }

    function saveSession(data) {
      sessionData = data;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function resetToForm(options) {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      if (deniedReturnTimer) { clearTimeout(deniedReturnTimer); deniedReturnTimer = null; }
      sessionStorage.removeItem(STORAGE_KEY);
      sessionData = null;
      lastPolledStatus = null;
      form.reset();
      form.classList.remove('form-hidden');
      if (subtitle) subtitle.classList.remove('form-hidden');
      receiptPanel.classList.add('form-hidden');
      receiptCard.classList.remove('approved', 'denied', 'status-notify');
      btnSignUpAgain.classList.add('form-hidden');
      document.title = defaultTitle;
      if (options && options.afterDenied) {
        msg.className = 'msg info';
        msg.textContent = 'Your signup was not approved. You can sign up again below.';
      } else {
        msg.className = 'msg';
        msg.textContent = '';
      }
    }

    function flashTitle(label) {
      document.title = label + ' — GŪDESSENCE';
      setTimeout(() => { document.title = defaultTitle; }, 2800);
    }

    function notifyStatusChange(kind, data) {
      const name = ((data.firstName || '') + ' ' + (data.lastName || '')).trim();
      const ref = data.displayId || '';
      if (kind === 'approved') {
        try { navigator.vibrate?.([100, 50, 100, 50, 200]); } catch (_) {}
        flashTitle('Approved');
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('GŪDESSENCE — Approved!', {
            body: (name ? name + ' — ' : '') + (ref ? ref + '. ' : '') + 'Head to the booth.',
            tag: 'gudessence-signup-' + EVENT_ID,
          });
        }
      } else if (kind === 'denied') {
        try { navigator.vibrate?.([280, 120, 280]); } catch (_) {}
        flashTitle('Not approved');
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('GŪDESSENCE — Not approved', {
            body: (name ? name + ' — ' : '') + (ref ? ref + '. ' : '') + 'You can sign up again in a moment.',
            tag: 'gudessence-signup-' + EVENT_ID,
          });
        }
      }
    }

    function renderReceipt(data, options) {
      const approved = data.status === 'confirmed';
      const denied = data.status === 'denied';
      const notify = options && options.notify;
      form.classList.add('form-hidden');
      if (subtitle) subtitle.classList.add('form-hidden');
      receiptPanel.classList.remove('form-hidden');
      receiptCard.classList.toggle('approved', approved);
      receiptCard.classList.toggle('denied', denied);
      receiptCard.classList.remove('status-notify');
      if (notify && (approved || denied)) {
        void receiptCard.offsetWidth;
        receiptCard.classList.add('status-notify');
      }
      document.getElementById('receiptTitle').textContent = approved
        ? ('Approved' + (data.firstName ? ', ' + data.firstName + '!' : '!'))
        : denied ? ('Not approved' + (data.firstName ? ', ' + data.firstName : '')) : 'You are in the queue';
      document.getElementById('displayId').textContent = data.displayId || '—';
      const badge = document.getElementById('statusBadge');
      badge.textContent = approved ? 'APPROVED' : denied ? 'NOT APPROVED' : 'PENDING';
      badge.className = 'badge ' + (approved ? 'approved' : denied ? 'denied' : 'pending');
      document.getElementById('rName').textContent = ((data.firstName || '') + ' ' + (data.lastName || '')).trim() || '—';
      document.getElementById('rSubmitted').textContent = fmtTime(data.createdAt);
      document.getElementById('rowApproved').style.display = approved ? 'flex' : 'none';
      document.getElementById('rApproved').textContent = fmtTime(data.confirmedAt);
      document.getElementById('rowDeclined').style.display = denied ? 'flex' : 'none';
      document.getElementById('rDeclined').textContent = fmtTime(data.deniedAt);
      document.getElementById('receiptMessage').textContent = approved
        ? 'Head to the booth. Save this reference for your records.'
        : denied ? 'Staff declined this signup. Returning you to sign up again…'
        : 'Show staff your name and ID at the booth.';
      document.getElementById('btnSave').classList.toggle('form-hidden', denied);
      document.getElementById('btnShare').classList.toggle('form-hidden', denied);
      btnSignUpAgain.classList.toggle('form-hidden', !denied);
      if (denied && !(options && options.skipReturn)) scheduleDeniedReturn();
    }

    function scheduleDeniedReturn() {
      if (deniedReturnTimer) clearTimeout(deniedReturnTimer);
      deniedReturnTimer = setTimeout(() => {
        deniedReturnTimer = null;
        resetToForm({ afterDenied: true });
      }, DENIED_RETURN_MS);
    }

    function requestNotifyPermission() {
      if (!('Notification' in window) || Notification.permission !== 'default') return;
      Notification.requestPermission().catch(() => {});
    }

    async function fetchStatus(signupId) {
      const res = await fetch('/api/signup/' + encodeURIComponent(signupId) + '/status/public');
      if (!res.ok) return null;
      return res.json();
    }

    async function pollSignupStatus() {
      if (!sessionData?.signupId) return;
      const data = await fetchStatus(sessionData.signupId);
      if (!data) return;
      const prevStatus = lastPolledStatus || sessionData.status || 'pending';
      const merged = { ...sessionData, ...data };
      saveSession(merged);
      lastPolledStatus = data.status;
      const justApproved = prevStatus === 'pending' && data.status === 'confirmed';
      const justDenied = prevStatus === 'pending' && data.status === 'denied';
      if (justApproved) notifyStatusChange('approved', merged);
      if (justDenied) notifyStatusChange('denied', merged);
      renderReceipt(merged, { notify: justApproved || justDenied, skipReturn: false });
      if (data.status === 'confirmed' || data.status === 'denied') {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      }
    }

    function startPolling(initial) {
      saveSession(initial);
      lastPolledStatus = initial.status || 'pending';
      const notify = initial.status === 'confirmed' || initial.status === 'denied';
      renderReceipt(initial, { notify, skipReturn: initial.status !== 'denied' });
      if (initial.status === 'confirmed' || initial.status === 'denied') return;
      if (pollTimer) clearInterval(pollTimer);
      pollSignupStatus();
      pollTimer = setInterval(pollSignupStatus, 2000);
    }

    function drawReceiptCanvas() {
      const d = sessionData;
      if (!d) return null;
      const approved = d.status === 'confirmed';
      const denied = d.status === 'denied';
      const canvas = document.createElement('canvas');
      canvas.width = 600; canvas.height = 760;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0f0f14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = approved ? '#22c55e' : denied ? '#ef4444' : '#ff007f';
      ctx.lineWidth = 6;
      ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
      ctx.fillStyle = approved ? '#22c55e' : denied ? '#ef4444' : '#ff007f';
      ctx.font = 'bold 36px system-ui,sans-serif';
      ctx.fillText(approved ? 'APPROVED' : denied ? 'NOT APPROVED' : 'PENDING', 48, 90);
      ctx.fillStyle = '#ffffff';
      ctx.font = '28px system-ui,sans-serif';
      ctx.fillText('GŪDESSENCE', 48, 140);
      ctx.fillStyle = approved ? '#4ade80' : '#ccff00';
      ctx.font = 'bold 40px ui-monospace,monospace';
      ctx.fillText(d.displayId || '', 48, 200);
      ctx.fillStyle = '#cccccc';
      ctx.font = '24px system-ui,sans-serif';
      const lines = [
        'Name: ' + ((d.firstName || '') + ' ' + (d.lastName || '')).trim(),
        'Submitted: ' + fmtTime(d.createdAt),
      ];
      if (approved && d.confirmedAt) lines.push('Approved: ' + fmtTime(d.confirmedAt));
      let y = 260;
      ctx.font = '24px system-ui,sans-serif';
      for (const line of lines) { ctx.fillText(line, 48, y); y += 44; }
      return canvas;
    }

    document.getElementById('btnSave').addEventListener('click', () => {
      const canvas = drawReceiptCanvas();
      if (!canvas) return;
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'GudEssence-' + (sessionData.displayId || 'reference') + '.png';
      a.click();
    });

    document.getElementById('btnShare').addEventListener('click', async () => {
      const canvas = drawReceiptCanvas();
      if (!canvas || !sessionData) return;
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      const file = new File([blob], 'GudEssence-' + sessionData.displayId + '.png', { type: 'image/png' });
      const statusLabel = sessionData.status === 'confirmed' ? 'Approved' : sessionData.status === 'denied' ? 'Not approved' : 'Pending';
      const text = 'GŪDESSENCE ' + (sessionData.displayId || '') + ' — ' + statusLabel;
      try {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: 'GŪDESSENCE Signup', text, files: [file] });
          return;
        }
      } catch (_) {}
      document.getElementById('btnSave').click();
    });

    function phoneDigits(value) {
      let d = String(value || '').replace(/\\D/g, '');
      if (d.length > 11) d = d.slice(0, 11);
      if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
      return d.slice(0, LIMITS.phoneMaxDigits);
    }

    function formatUsPhoneDisplay(digits) {
      const d = phoneDigits(digits);
      if (!d) return '';
      if (d.length <= 3) return '(' + d;
      if (d.length <= 6) return '(' + d.slice(0, 3) + ') ' + d.slice(3);
      return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
    }

    function isValidUsPhone(digits) {
      return US_PHONE_RE.test(phoneDigits(digits));
    }

    function syncPhoneInput() {
      const digits = phoneDigits(phoneInput.value);
      const formatted = formatUsPhoneDisplay(digits);
      if (phoneInput.value !== formatted) phoneInput.value = formatted;
      phoneInput.classList.toggle('phone-valid', digits.length === LIMITS.phoneMaxDigits && isValidUsPhone(digits));
      phoneInput.classList.toggle('phone-invalid', digits.length > 0 && digits.length === LIMITS.phoneMaxDigits && !isValidUsPhone(digits));
    }

    phoneInput.addEventListener('input', syncPhoneInput);
    phoneInput.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text') || '';
      phoneInput.value = formatUsPhoneDisplay(text);
      syncPhoneInput();
    });

    function clientValidate(body) {
      if (!body.firstName.trim()) return 'First name is required';
      if (body.firstName.length > LIMITS.firstNameMax) return 'First name is too long';
      if (!NAME_RE.test(body.firstName)) return 'First name contains invalid characters';
      if (body.lastName.length > LIMITS.lastNameMax) return 'Last name is too long';
      if (body.lastName && !NAME_RE.test(body.lastName)) return 'Last name contains invalid characters';
      if (!body.email && !body.phone) return 'Please enter email or phone';
      if (body.email && body.email.length > LIMITS.emailMax) return 'Email is too long';
      if (body.email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(body.email)) return 'Invalid email address';
      const digits = phoneDigits(body.phone);
      if (body.phone && digits.length < LIMITS.phoneMinDigits) {
        return 'Enter a ' + LIMITS.phoneDigits + '-digit US phone number';
      }
      if (digits.length > LIMITS.phoneMaxDigits) {
        return 'Phone must be exactly ' + LIMITS.phoneDigits + ' digits';
      }
      if (digits && !isValidUsPhone(digits)) {
        return 'Enter a valid US phone number (area code cannot start with 0 or 1)';
      }
      return null;
    }

    btnSignUpAgain.addEventListener('click', resetToForm);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.className = 'msg';
      msg.textContent = '';
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Signing up…';
      const fd = new FormData(form);
      const body = {
        eventId: EVENT_ID,
        firstName: (fd.get('firstName') || '').toString().trim(),
        lastName: (fd.get('lastName') || '').toString().trim(),
        email: (fd.get('email') || '').toString().trim(),
        phone: phoneDigits((fd.get('phone') || '').toString()),
      };
      const err = clientValidate(body);
      if (err) {
        msg.className = 'msg error';
        msg.textContent = err;
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Sign Up';
        return;
      }
      try {
        const res = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Sign up failed');
        if (!data.signupId) throw new Error('Signup failed');
        btnSubmit.textContent = 'Sign Up';
        btnSubmit.disabled = false;
        requestNotifyPermission();
        startPolling(data);
      } catch (err) {
        msg.className = 'msg error';
        msg.textContent = err.message || 'Something went wrong. Try again.';
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Sign Up';
      }
    });

    (function restoreSession() {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        if (!saved.signupId) return;
        fetchStatus(saved.signupId).then((data) => {
          if (!data) { sessionStorage.removeItem(STORAGE_KEY); return; }
          if (data.status === 'denied') {
            const merged = { ...saved, ...data };
            saveSession(merged);
            notifyStatusChange('denied', merged);
            renderReceipt(merged, { notify: true, skipReturn: false });
            return;
          }
          startPolling({ ...saved, ...data });
        });
      } catch { sessionStorage.removeItem(STORAGE_KEY); }
    })();
  </script>
</body>
</html>`;
}
