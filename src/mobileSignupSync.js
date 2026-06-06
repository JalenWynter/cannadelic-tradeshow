/** Poll cloud signup relay and sync pending signups into the local kiosk DB */

export function createMobileSignupSync(config, handlers, onUpdate) {
  if (!config?.relayApiUrl || !config?.relayApiKey || !config?.eventId) {
    return { start: () => {}, getStatus: () => ({ mode: 'disabled' }) };
  }

  let timer = null;
  let lastSyncAt = null;
  let lastError = null;
  let connected = false;

  const headers = {
    Authorization: `Bearer ${config.relayApiKey}`,
    'Content-Type': 'application/json',
  };

  const syncOnce = async () => {
    try {
      const url = new URL('/api/signup/pending', config.relayApiUrl);
      url.searchParams.set('eventId', config.eventId);
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`Relay responded ${res.status}`);
      const data = await res.json();
      connected = true;
      lastError = null;
      lastSyncAt = new Date().toISOString();

      let changed = 0;
      for (const remote of data.signups || []) {
        if (remote.status !== 'pending') continue;
        const result = handlers.importRemoteSignup(remote);
        if (result?.imported) changed += 1;
      }

      const confirmedUrl = new URL('/api/signup/confirmed-recent', config.relayApiUrl);
      confirmedUrl.searchParams.set('eventId', config.eventId);
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
              remote,
              remote.confirmedByStaff || 'Staff',
              remote.confirmedByKiosk || 'Phone Staff Monitor'
            );
          }
          if (result?.success && !result?.already) changed += 1;
        }
      }

      const deniedUrl = new URL('/api/signup/denied-recent', config.relayApiUrl);
      deniedUrl.searchParams.set('eventId', config.eventId);
      const deniedRes = await fetch(deniedUrl, { headers });
      if (deniedRes.ok) {
        const deniedData = await deniedRes.json();
        for (const remote of deniedData.signups || []) {
          const result = handlers.importDeclinedRemoteSignup?.(
            remote,
            remote.deniedByStaff || 'Staff',
            remote.deniedByKiosk || 'Phone Staff Monitor'
          );
          if (result?.imported) changed += 1;
        }
      }

      changed += await syncPendingStatusesFromRelay();
      changed += await pushLocalActionsToRelay();

      onUpdate?.();
    } catch (err) {
      connected = false;
      lastError = err.message?.includes('401')
        ? 'API key mismatch — relayApiKey must match RELAY_API_KEY on relay'
        : err.message;
      console.error('Mobile signup sync failed:', err.message);
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
    const pending = handlers.getPendingMobileSignups() || [];
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
      syncOnce();
      timer = setInterval(syncOnce, config.syncIntervalMs || 2000);
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
        publicSignupUrl: config.publicSignupUrl,
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
