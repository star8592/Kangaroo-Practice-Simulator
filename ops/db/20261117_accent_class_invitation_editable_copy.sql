-- Persistent teacher-owned copy for the existing independently signed class invitation.
-- All access continues through teacher(db,...), tenant-scoped RLS, and the existing
-- accent.class_invitations table; no new user table, role or database service.
BEGIN;
ALTER TABLE accent.class_invitations
  ADD COLUMN IF NOT EXISTS message_template text,
  ADD COLUMN IF NOT EXISTS template_key text;
COMMENT ON COLUMN accent.class_invitations.message_template IS
  'Teacher-edited invitation prose with {{邀请链接}} placeholder, never a signed URL';
COMMENT ON COLUMN accent.class_invitations.template_key IS
  'Selected presentation template: warm, concise, or formal';
COMMIT;
