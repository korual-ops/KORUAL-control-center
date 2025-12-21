-- schema.sql
-- PostgreSQL 13+ 권장

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  username text NOT NULL UNIQUE,
  pw_hash text NOT NULL,                -- SHA-256 hex 등(현재 시트 형태 유지)
  full_name text,
  email text,
  role text NOT NULL DEFAULT 'GUEST',   -- ADMIN / MANAGER / GUEST 등
  display_name text,

  mfa_enabled boolean NOT NULL DEFAULT false,

  last_login_at timestamptz,
  last_ip inet,

  fail_count int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  active boolean NOT NULL DEFAULT true,

  created_by text,
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 로그인 감사 로그
CREATE TABLE IF NOT EXISTS login_audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  username text,
  user_id uuid,
  success boolean NOT NULL,
  ip inet,
  user_agent text,
  reason text,                          -- WRONG_PW, LOCKED, INACTIVE, OK 등
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_audit_logs_created_at ON login_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_audit_logs_username ON login_audit_logs(username);

-- 관리자 액션 로그(선택)
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_username text,
  action text NOT NULL,                 -- e.g. UNLOCK_USER, SET_ROLE, SET_ACTIVE
  target_username text,
  meta jsonb,
  ip inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at DESC);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
