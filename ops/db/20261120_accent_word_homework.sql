-- R57 vocabulary-only homework: not a sentence set and not a sentence score.
-- This migration is additive and keeps all R56 assignment tables unchanged.
BEGIN;
CREATE TABLE IF NOT EXISTS accent.word_assignments (
 tenant_id uuid NOT NULL,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 class_id uuid NOT NULL,
 assigned_by uuid NOT NULL,
 title text NOT NULL CHECK (length(btrim(title)) BETWEEN 2 AND 160),
 token_digest bytea NOT NULL UNIQUE CHECK (octet_length(token_digest)=32),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,id),
 CHECK(expires_at>created_at),
 FOREIGN KEY(tenant_id,class_id) REFERENCES accent.classes(tenant_id,id),
 FOREIGN KEY(tenant_id,assigned_by) REFERENCES accent.memberships(tenant_id,account_id)
);
CREATE TABLE IF NOT EXISTS accent.word_assignment_items (
 tenant_id uuid NOT NULL,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 assignment_id uuid NOT NULL,
 ordinal int NOT NULL CHECK(ordinal BETWEEN 1 AND 40),
 target_word text NOT NULL CHECK(length(btrim(target_word)) BETWEEN 1 AND 60),
 PRIMARY KEY(tenant_id,id),
 UNIQUE(tenant_id,assignment_id,id),
 UNIQUE(tenant_id,assignment_id,ordinal),
 FOREIGN KEY(tenant_id,assignment_id) REFERENCES accent.word_assignments(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS accent.word_assignment_attempts (
 tenant_id uuid NOT NULL,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 assignment_id uuid NOT NULL,
 item_id uuid NOT NULL,
 student_id uuid NOT NULL,
 client_request_id uuid NOT NULL,
 score double precision NOT NULL CHECK(score>=0 AND score<=100),
 model_version text NOT NULL CHECK(length(model_version) BETWEEN 1 AND 120),
 result_json jsonb NOT NULL,
 recording_asset_key text NOT NULL,
 audio_retention_until timestamptz NOT NULL,
 recording_deleted_at timestamptz,
 recorded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,id),
 UNIQUE(tenant_id,assignment_id,student_id,client_request_id),
 FOREIGN KEY(tenant_id,assignment_id,item_id) REFERENCES accent.word_assignment_items(tenant_id,assignment_id,id),
 FOREIGN KEY(tenant_id,student_id) REFERENCES accent.memberships(tenant_id,account_id)
);
CREATE TABLE IF NOT EXISTS accent.word_assignment_receipts (
 tenant_id uuid NOT NULL,
 assignment_id uuid NOT NULL,
 student_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','submitted')),
 claimed_at timestamptz NOT NULL DEFAULT now(),
 submitted_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,assignment_id,student_id),
 CHECK ((status='in_progress' AND submitted_at IS NULL) OR (status='submitted' AND submitted_at IS NOT NULL)),
 FOREIGN KEY(tenant_id,assignment_id) REFERENCES accent.word_assignments(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,student_id) REFERENCES accent.memberships(tenant_id,account_id)
);
CREATE INDEX IF NOT EXISTS word_attempt_student_hour ON accent.word_assignment_attempts(tenant_id,student_id,recorded_at DESC);
CREATE INDEX IF NOT EXISTS word_attempt_teacher_report ON accent.word_assignment_attempts(tenant_id,assignment_id,student_id,recorded_at DESC);
DO $policy$
DECLARE tbl text;
BEGIN
 FOREACH tbl IN ARRAY ARRAY['word_assignments','word_assignment_items','word_assignment_attempts','word_assignment_receipts'] LOOP
  EXECUTE format('ALTER TABLE accent.%I ENABLE ROW LEVEL SECURITY',tbl);
  EXECUTE format('ALTER TABLE accent.%I FORCE ROW LEVEL SECURITY',tbl);
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='accent' AND tablename=tbl AND policyname='tenant_boundary') THEN
   EXECUTE format(
     'CREATE POLICY tenant_boundary ON accent.%I FOR ALL USING ('||
     'tenant_id=COALESCE(NULLIF(current_setting(''app.tenant_id'',true),''''),'||
     '''00000000-0000-0000-0000-000000000000'')::uuid) WITH CHECK ('||
     'tenant_id=COALESCE(NULLIF(current_setting(''app.tenant_id'',true),''''),'||
     '''00000000-0000-0000-0000-000000000000'')::uuid)',tbl);
  END IF;
 END LOOP;
END $policy$;
-- Existing production runtime uses the non-owner accentclass role. A DDL
-- migration does NOT automatically grant it rights over newly created tables.
DO $grant$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='accentclass') THEN
  GRANT SELECT,INSERT,UPDATE ON
   accent.word_assignments,accent.word_assignment_items,
   accent.word_assignment_attempts,accent.word_assignment_receipts TO accentclass;
 END IF;
END $grant$;
COMMIT;
