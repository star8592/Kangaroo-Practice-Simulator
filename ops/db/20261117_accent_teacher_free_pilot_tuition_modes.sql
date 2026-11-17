-- Teacher uses the educational platform free of charge during the pilot.
-- Only describes how the teacher presents tuition for their own class;
-- NEVER creates products/orders, price commitments or teacher billing debt.
BEGIN;
ALTER TABLE accent.class_invitations
 ADD COLUMN IF NOT EXISTS student_fee_mode text NOT NULL DEFAULT 'not_specified';
DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_constraint WHERE conrelid='accent.class_invitations'::regclass AND conname='accent_class_invitation_student_fee_mode_check'
 ) THEN
   ALTER TABLE accent.class_invitations
     ADD CONSTRAINT accent_class_invitation_student_fee_mode_check
     CHECK (student_fee_mode IN ('not_specified','teacher_managed','free_for_students'));
 END IF;
END $$;
COMMENT ON COLUMN accent.class_invitations.student_fee_mode IS
 'Class tuition information only. Teacher platform usage remains free in the pilot; no platform tuition collection';
COMMIT;
