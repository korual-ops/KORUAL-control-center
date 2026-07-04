export const korualConfig = {
  appName: import.meta.env.VITE_KORUAL_APP_NAME || 'KORUAL Platform',
  publicMode: import.meta.env.VITE_KORUAL_PUBLIC_MODE !== 'false',
  requireHttps: import.meta.env.VITE_KORUAL_REQUIRE_HTTPS !== 'false',
  sessionTimeoutMinutes: Number(import.meta.env.VITE_KORUAL_SESSION_TIMEOUT_MINUTES || 30),
  apiBaseUrl: import.meta.env.VITE_KORUAL_API_BASE_URL || '',
  supportEmail: import.meta.env.VITE_KORUAL_SUPPORT_EMAIL || 'support@korual.com',
  security: {
    publicWifiSafe: true,
    exposeSecretKeysInClient: false,
    adminRequiresLogin: true,
    autoLogoutEnabled: true,
    qrShareEnabled: true,
  },
  modules: {
    ai: true,
    commerce: true,
    travel: true,
    cloud: true,
    finance: false,
    reseller: true,
  },
};

export function getRuntimeSecurityStatus() {
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

  return {
    httpsReady: isHttps || isLocalhost,
    publicWifiReady: (isHttps || isLocalhost) && korualConfig.security.adminRequiresLogin,
    warning: !isHttps && !isLocalhost ? 'HTTPS deployment is required before sharing on public Wi-Fi.' : null,
  };
}
