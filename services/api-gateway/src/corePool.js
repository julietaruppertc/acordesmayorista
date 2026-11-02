// Optional DEC-09 pool: no retries and no background work in legacy single-target mode.
function createCorePool(urls, { intervalMs = 5000, timeoutMs = 1000 } = {}) {
  if (!urls.length || urls.some(value => !value)) throw new Error('CORE_SERVICE_URLS requiere destinos.');
  if (![intervalMs, timeoutMs].every(value => Number.isInteger(value) && value > 0 && value <= 60000)) {
    throw new Error('Intervalo y timeout de salud deben estar entre 1 y 60000 ms.');
  }
  const targets = [...new Set(urls.map(value => {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) throw new Error('Destino Core invalido.');
    return url.origin;
  }))];
  const healthy = new Set();
  let cursor = 0;
  let timer;
  let running;
  let stopped = false;
  async function refresh() {
    if (running) return running;
    running = Promise.all(targets.map(async target => {
      let ok = false;
      try {
        // /ready checks the shared database, not only process liveness.
        const response = await fetch(target + '/ready', {
          signal: AbortSignal.timeout(timeoutMs), redirect: 'error'
        });
        ok = response.ok;
        await response.body?.cancel();
      } catch { /* timeout, DNS and connection failures exclude this target */ }
      if (!stopped && ok) healthy.add(target);
      else healthy.delete(target);
    })).finally(() => { running = undefined; });
    return running;
  }
  return {
    targets,
    refresh,
    async start() {
      stopped = false;
      await refresh();
      if (!timer && !stopped) {
        timer = setInterval(() => { void refresh(); }, intervalMs);
        timer.unref();
      }
    },
    stop() { stopped = true; clearInterval(timer); timer = undefined; healthy.clear(); },
    markUnavailable(target) { healthy.delete(target); },
    next() {
      for (let count = 0; count < targets.length; count++) {
        const target = targets[cursor];
        cursor = (cursor + 1) % targets.length;
        if (healthy.has(target)) return target;
      }
      return null;
    }
  };
}
module.exports = createCorePool;
