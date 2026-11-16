-- M1 platform authorization registry. No existing student, parent, classroom,
-- vocabulary or billing table is modified. Install in dedicated PG18 database.
BEGIN;
CREATE SCHEMA IF NOT EXISTS platform;
CREATE TABLE IF NOT EXISTS platform.role_grants (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject text NOT NULL CHECK (subject ~ '^par_[a-f0-9]{18}$'),
  capability text NOT NULL CHECK (capability ~ '^[a-z][a-z0-9_.]{2,80}$'),
  role text NOT NULL CHECK (role IN ('teacher','module-admin')),
  scope_kind text NOT NULL CHECK (scope_kind IN ('product','organization')),
  scope_id text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active','revoked')),
  granted_by text NOT NULL CHECK (granted_by ~ '^par_[a-f0-9]{18}$'),
  granted_at timestamptz NOT NULL DEFAULT now(),
  changed_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CHECK ((scope_kind='product' AND scope_id='')
       OR (scope_kind='organization' AND scope_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')),
  CHECK ((state='active' AND revoked_at IS NULL) OR (state='revoked' AND revoked_at IS NOT NULL)),
  UNIQUE(subject,capability,role,scope_kind,scope_id)
);
CREATE INDEX IF NOT EXISTS role_grants_active_subject_idx
  ON platform.role_grants(subject,capability)
  WHERE state='active';
CREATE TABLE IF NOT EXISTS platform.role_grant_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject text NOT NULL,
  capability text NOT NULL,
  role text NOT NULL,
  scope_kind text NOT NULL,
  scope_id text NOT NULL,
  action text NOT NULL CHECK(action IN ('grant','revoke')),
  actor text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS role_grant_audit_subject_idx
  ON platform.role_grant_audit(subject,recorded_at DESC);
COMMIT;
