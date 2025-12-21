// app/page.jsx
// Next.js App Router 기준
// - 미인증: 로그인 UI 렌더
// - 인증: 대시보드 렌더
// - ADMIN: 유저 목록까지 동일 페이지에 렌더

export const dynamic = 'force-dynamic';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

// Server-side: whoami
async function fetchWhoAmI() {
  try {
    const r = await fetch(`${API_BASE}/auth/whoami`, {
      cache: 'no-store',
      credentials: 'include'
    });
    const j = await r.json().catch(() => ({}));
    return { status: r.status, ...j };
  } catch {
    return { ok: false, error: 'NETWORK_ERROR' };
  }
}

// Server-side: admin users list
async function fetchAdminUsers() {
  try {
    const r = await fetch(`${API_BASE}/admin/users`, {
      cache: 'no-store',
      credentials: 'include'
    });
    const j = await r.json().catch(() => ({}));
    return { status: r.status, ...j };
  } catch {
    return { ok: false, error: 'NETWORK_ERROR' };
  }
}

export default async function Page() {
  if (!API_BASE) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-xl w-full rounded-2xl border p-6">
          <div className="text-xl font-semibold">Missing env</div>
          <div className="mt-2 text-sm text-gray-600">
            NEXT_PUBLIC_API_BASE가 설정되지 않았습니다. 예: https://your-cloud-run-url
          </div>
        </div>
      </div>
    );
  }

  const me = await fetchWhoAmI();
  const isAuthed = !!me?.ok;
  const isAdmin = isAuthed && me?.user?.role === 'ADMIN';

  const users = isAdmin ? await fetchAdminUsers() : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {isAuthed ? (
        <AuthedView me={me} users={users} />
      ) : (
        <LoginView apiBase={API_BASE} initialError={me?.error} />
      )}
    </main>
  );
}

/* ---------------------------
   Client Components
---------------------------- */

function AuthedView({ me, users }) {
  // client로 안 바꿔도 렌더는 되지만,
  // 로그아웃/리프레시 등 인터랙션 때문에 client 처리
  // 아래 컴포넌트만 client로 분리
  return (
    <div className="p-8">
      <div className="text-xs tracking-[0.35em] text-cyan-200/80">KORUAL CONTROL CENTER</div>
      <div className="mt-2 text-3xl font-semibold">Dashboard</div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <InfoCard
          title="Session"
          lines={[
            `username: ${me.user.username}`,
            `display: ${me.user.display_name}`,
            `role: ${me.user.role}`
          ]}
        />
        <InfoCard
          title="Security"
          lines={[
            `mfa: ${String(!!me.user.mfa_enabled)}`,
            `last_ip: ${String(me.user.last_ip || '')}`,
            `last_login: ${String(me.user.last_login_at || '')}`
          ]}
        />
        <ActionCard apiBase={API_BASE} />
      </div>

      {me.user.role === 'ADMIN' ? (
        <div className="mt-10">
          <div className="text-lg font-semibold">Admin Users</div>
          <div className="mt-3 text-sm text-white/60">
            관리자 권한으로 조회된 최근 사용자 목록(최대 200).
          </div>

          {users?.ok ? (
            <div className="mt-4 overflow-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
              <table className="min-w-[1100px] w-full text-sm">
                <thead className="bg-white/5">
                  <tr className="text-white/70">
                    <th className="p-3 text-left">username</th>
                    <th className="p-3 text-left">role</th>
                    <th className="p-3 text-left">active</th>
                    <th className="p-3 text-left">fail_count</th>
                    <th className="p-3 text-left">locked_until</th>
                    <th className="p-3 text-left">last_ip</th>
                    <th className="p-3 text-left">last_login_at</th>
                    <th className="p-3 text-left">created_at</th>
                    <th className="p-3 text-left">updated_at</th>
                  </tr>
                </thead>
                <tbody>
                  {users.users.map((u) => (
                    <tr key={u.id} className="border-t border-white/10">
                      <td className="p-3">{u.username}</td>
                      <td className="p-3">{u.role}</td>
                      <td className="p-3">{String(u.active)}</td>
                      <td className="p-3">{u.fail_count}</td>
                      <td className="p-3">{String(u.locked_until || '')}</td>
                      <td className="p-3">{String(u.last_ip || '')}</td>
                      <td className="p-3">{String(u.last_login_at || '')}</td>
                      <td className="p-3">{String(u.created_at || '')}</td>
                      <td className="p-3">{String(u.updated_at || '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              Admin users fetch failed: {String(users?.error || 'UNKNOWN')}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function InfoCard({ title, lines }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3 space-y-1 text-sm text-white/70">
        {lines.map((t, i) => (
          <div key={i} className="font-mono text-xs md:text-sm break-all">
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionCard({ apiBase }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6">
      <div className="text-sm font-semibold">Actions</div>
      <div className="mt-3 text-sm text-white/60">
        세션은 HttpOnly 쿠키로 유지됩니다. 로그아웃은 API를 호출해 쿠키를 제거합니다.
      </div>

      <div className="mt-5 flex gap-3">
        <LogoutButton apiBase={apiBase} />
        <RefreshButton />
      </div>
    </div>
  );
}

function RefreshButton() {
  return (
    <form>
      <button
        formAction={() => {}}
        onClick={(e) => {
          e.preventDefault();
          window.location.reload();
        }}
        className="rounded-xl border border-white/15 bg-black/20 hover:bg-black/30 px-4 py-2 text-sm"
        type="button"
      >
        Refresh
      </button>
    </form>
  );
}

/* ---------------------------
   Login View (Client)
---------------------------- */

function LoginView({ apiBase, initialError }) {
  return <LoginClient apiBase={apiBase} initialError={initialError} />;
}

function LoginClient({ apiBase, initialError }) {
  'use client';

  const { useState } = require('react');

  const [username, setUsername] = useState('KORUAL');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(initialError ? String(initialError) : '');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    try {
      const r = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const j = await r.json().catch(() => ({}));
      if (!j.ok) {
        setMsg(j.error || 'LOGIN_FAILED');
        return;
      }

      window.location.reload();
    } catch {
      setMsg('NETWORK_ERROR');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8">
        <div className="mb-6">
          <div className="text-xs tracking-[0.35em] text-cyan-200/80">KORUAL CONTROL CENTER</div>
          <h1 className="mt-2 text-2xl font-semibold">Secure Admin Login</h1>
          <div className="mt-2 text-sm text-white/60">
            Authorized access only. All sessions are audited.
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-white/70">USERNAME</label>
            <input
              className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-cyan-300/60"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-xs text-white/70">PASSWORD</label>
            <input
              className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-cyan-300/60"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </div>

          {msg ? (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {msg}
            </div>
          ) : null}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-cyan-500/20 border border-cyan-300/30 hover:bg-cyan-500/25 px-4 py-3 font-medium transition disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="text-xs text-white/40">
            By proceeding, you acknowledge monitoring and audit logging.
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------
   Logout (Client)
---------------------------- */

function LogoutButton({ apiBase }) {
  'use client';

  const { useState } = require('react');
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch(`${apiBase}/auth/logout`, { method: 'POST', credentials: 'include' });
    } finally {
      window.location.reload();
    }
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="rounded-xl border border-white/15 bg-black/20 hover:bg-black/30 px-4 py-2 text-sm disabled:opacity-60"
      type="button"
    >
      {loading ? 'Signing out...' : 'Logout'}
    </button>
  );
}
