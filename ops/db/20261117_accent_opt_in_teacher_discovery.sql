-- Phase 1 teacher discovery: a teacher must OPT IN to publish a class.
-- No paid status or student roster is ever exposed by public discovery.
-- Existing invitations are private by default; records stay tenant-owned.
BEGIN;
ALTER TABLE accent.class_invitations
 ADD COLUMN IF NOT EXISTS discoverable boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS listing_class_name text,
 ADD COLUMN IF NOT EXISTS listing_teacher_name text,
 ADD COLUMN IF NOT EXISTS listing_intro text;
CREATE INDEX IF NOT EXISTS idx_class_invitations_discoverable
 ON accent.class_invitations(updated_at DESC) WHERE discoverable=true AND enabled=true;
DROP POLICY IF EXISTS public_opt_in_teacher_discovery ON accent.class_invitations;
CREATE POLICY public_opt_in_teacher_discovery ON accent.class_invitations
 FOR SELECT USING (discoverable=true AND enabled=true);
COMMIT;
