export function registerPwa(onUpdate) {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) onUpdate?.();
        });
      });
    } catch (error) {
      console.warn('PWA registration skipped', error);
    }
  });
}
