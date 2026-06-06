/** Poll cloud signup relay and sync pending signups into the local kiosk DB */

import { signupStreamForEventId } from './retreatInterest.js';

function buildSyncStreams(config) {
  const streams = [
    { eventId: config.eventId, signupStream: 'booth' },
  ];
  const colombiaEventId = config.colombiaEventId;
  if (colombiaEventId && colombiaEventId !== config.eventId) {
    streams.push({ eventId: colombiaEventId, signupStream: 'colombia_retreat' });
  }
  return streams;
}

export function createMobileSignupSync(config, handlers, onUpdate) {
  if (!config?.relayApiUrl || !config?.relayApiKey || !config?.eventId) {
    return { start: () => {}, getStatus: () => ({ mode: 'disabled' }) };
  }

  const syncStreams = buildSyncStreams(config);
  let timer = null;
  let lastSyncAt = null;
  let lastError = null;
  let connected = false;
  let lastErrorLogAt = 0;
  let consecutiveFailures = 0;

  const headers = {
    Authorization: `Bearer ${config.relayApiKey}`,
    'Content-Type': 'application/json',
  };

  const relayHealthOk = async () => {
    try {
      const res = await fetch(`${config.relayApiUrl.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(8000) });
      return res.ok;
    } catch {
      return false;
    }
  };

  const logSyncError = (message) => {
    const now = Date.now();
    if (now - lastErrorLogAt < 30_000) return;
    lastErrorLogAt = now;
    const hint = consecutiveFailures >= 3
      ? ' — relay unreachable; use npm run dev:local for offline dev or check Railway deploy'
      : '';
    console.error(`Mobile signup sync failed: ${message}${hint}`);
  };

  const syncEventStream = async (stream) => {
    let changed = 0;
    const { eventId, signupStream } = stream;

    const url = new URL('/api/signup/pending', config.relayApiUrl);
    url.searchParams.set('eventId', eventId);
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Relay responded ${res.status} for ${eventId}`);
    const data = await res.json();

    for (const remote of data.signups || []) {
      if (remote.status !== 'pending') continue;
      const result = handlers.importRemoteSignup({
        ...remote,
        eventId,
        signupStream: signupStream || signupStreamForEventId(eventId),
      });
      if (result?.imported) changed += 1;
    }

    const confirmedUrl = new URL('/api/signup/confirmed-recent', config.relayApiUrl);
    confirmedUrl.searchParams.set('eventId', eventId);
    const confirmedRes = await fetch(confirmedUrl, { headers });
    if (confirmedRes.ok) {
      const confirmedData = await confirmedRes.json();
      for (const remote of confirmedData.signups || []) {
        let result = handlers.confirmByRemoteSignupId(
          remote.signupId,
          remote.confirmedByStaff || 'Staff',
          remote.confirmedByKiosk || 'Phone Staff Monitor'
        );
        if (!result && handlers.importConfirmedRemoteSignup) {
          result = handlers.importConfirmedRemoteSignup(
            { ...remote, eventId, signupStream: signupStream || signupStreamForEventId(eventId) },
            remote.confirmedByStaff || 'Staff',
            remote.confirmedByKiosk || 'Phone Staff Monitor'
          );
        }
        if (result?.success && !result?.already) changed += 1;
      }
    }

    const deniedUrl = new URL('/api/signup/denied-recent', config.relayApiUrl);
    deniedUrl.searchParams.set('eventId', eventId);
    const deniedRes = await fetch(deniedUrl, { headers });
    if (deniedRes.ok) {
      const deniedData = await deniedRes.json();
      for (const remote of deniedData.signups || []) {
        const result = handlers.importDeclinedRemoteSignup?.(
          { ...remote, eventId, signupStream: signupStream || signupStreamForEventId(eventId) },
          remote.deniedByStaff || 'Staff',
          remote.deniedByKiosk || 'Phone Staff Monitor'
        );
        if (result?.imported) changed += 1;
      }
    }

    return changed;
  };

  const syncOnce = async () => {
    try {
      if (consecutiveFailures >= 2 && !(await relayHealthOk())) {
        throw new Error('Relay health check failed — cloud relay offline or redeploying');
      }

      let changed = 0;
      for (const stream of syncStreams) {
        changed += await syncEventStream(stream);
      }

      connected = true;
      lastError = null;
      consecutiveFailures = 0;
      lastSyncAt = new Date().toISOString();

      changed += await syncPendingStatusesFromRelay();
      changed += await pushLocalActionsToRelay();

      onUpdate?.();
    } catch (err) {
      connected = false;
      consecutiveFailures += 1;
      lastError = err.message?.includes('401')
        ? 'API key mismatch — relayApiKey must match RELAY_API_KEY on relay'
        : err.message;
      logSyncError(lastError);
    }
  };

  const confirmRemoteSignup = async (remoteSignupId, staffName, kioskLabel) => {
    if (!remoteSignupId) return false;
    try {
      const res = await fetch(`${config.relayApiUrl}/api/signup/${remoteSignupId}/confirm`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ staffName, kioskLabel }),
      });
      if (!res.ok) throw new Error(`Confirm relay failed (${res.status})`);
      return true;
    } catch (err) {
      console.error(`Failed to confirm remote signup on relay (${remoteSignupId}):`, err.message);
      return false;
    }
  };

  const denyRemoteSignup = async (remoteSignupId, staffName, kioskLabel) => {
    if (!remoteSignupId) return false;
    try {
      const res = await fetch(`${config.relayApiUrl}/api/signup/${remoteSignupId}/deny`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ staffName, kioskLabel }),
      });
      if (!res.ok) throw new Error(`Deny relay failed (${res.status})`);
      return true;
    } catch (err) {
      console.error(`Failed to deny remote signup on relay (${remoteSignupId}):`, err.message);
      return false;
    }
  };

  const pushLocalActionsToRelay = async () => {
    let pushed = 0;

    for (const item of handlers.getContactsNeedingRelayConfirm?.() || []) {
      try {
        const res = await fetch(
          `${config.relayApiUrl}/api/signup/${encodeURIComponent(item.remoteSignupId)}/status/public`
        );
        if (!res.ok) continue;
        const data = await res.json();
        if (data.status === 'confirmed') continue;
        if (data.status !== 'pending') continue;
        const ok = await confirmRemoteSignup(item.remoteSignupId, item.staffName, item.kioskLabel);
        if (ok) {
          pushed += 1;
          console.log(`Relay synced approval for ${item.displayId || item.remoteSignupId}`);
        }
      } catch {
        // retry on next sync interval
      }
    }

    for (const item of handlers.getContactsNeedingRelayDeny?.() || []) {
      try {
        const res = await fetch(
          `${config.relayApiUrl}/api/signup/${encodeURIComponent(item.remoteSignupId)}/status/public`
        );
        if (!res.ok) continue;
        const data = await res.json();
        if (data.status === 'denied') continue;
        if (data.status !== 'pending') continue;
        const ok = await denyRemoteSignup(item.remoteSignupId, item.staffName, item.kioskLabel);
        if (ok) {
          pushed += 1;
          console.log(`Relay synced decline for ${item.displayId || item.remoteSignupId}`);
        }
      } catch {
        // retry on next sync interval
      }
    }

    return pushed;
  };

  const syncPendingStatusesFromRelay = async () => {
    let updated = 0;
    const pending = handlers.getAllPendingMobileSignups?.() || handlers.getPendingMobileSignups() || [];
    for (const local of pending) {
      if (!local.remote_signup_id) continue;
      try {
        const res = await fetch(
          `${config.relayApiUrl}/api/signup/${encodeURIComponent(local.remote_signup_id)}/status/public`
        );
        if (!res.ok) continue;
        const data = await res.json();
        if (data.status === 'confirmed') {
          const result = handlers.confirmByRemoteSignupId(
            local.remote_signup_id,
            data.confirmedByStaff || 'Staff',
            data.confirmedByKiosk || 'Phone Staff Monitor'
          );
          if (result?.success) updated += 1;
        } else if (data.status === 'denied') {
          const result = handlers.denyByRemoteSignupId(
            local.remote_signup_id,
            data.deniedByStaff || 'Staff',
            data.deniedByKiosk || 'Phone Staff Monitor',
            data
          );
          if (result?.success) updated += 1;
        }
      } catch {
        // ignore per-signup status errors during sync
      }
    }
    return updated;
  };

  return {
    start() {
      if (timer) return;
      (async () => {
        for (let attempt = 1; attempt <= 5; attempt += 1) {
          if (await relayHealthOk()) break;
          if (attempt === 5) {
            lastError = 'Relay not reachable on startup — waiting for cloud relay';
            logSyncError(lastError);
          } else {
            await new Promise((r) => setTimeout(r, 2000 * attempt));
          }
        }
        syncOnce();
        timer = setInterval(syncOnce, config.syncIntervalMs || 2000);
      })();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    confirmRemoteSignup,
    denyRemoteSignup,
    getStatus() {
      return {
        mode: 'cloud',
        connected,
        lastSyncAt,
        lastError,
        eventId: config.eventId,
        colombiaEventId: config.colombiaEventId || null,
        syncStreams: syncStreams.map((s) => s.eventId),
        publicSignupUrl: config.publicSignupUrl,
        publicColombiaSignupUrl: config.publicColombiaSignupUrl || null,
        relayApiUrl: config.relayApiUrl,
        localDev: Boolean(config.localDev),
        tunnelActive: Boolean(config.tunnelActive),
        tunnelProvider: config.tunnelProvider || null,
        deploymentMode: config.deploymentMode || 'cloud',
        phoneNetworkHint: config.phoneNetworkHint || null,
      };
    },
  };
}
