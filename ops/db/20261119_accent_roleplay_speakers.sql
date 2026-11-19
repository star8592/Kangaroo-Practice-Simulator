-- R56 additive assignment-item role labels; never change scorer text.
-- Run under the existing Accent PostgreSQL migration owner BEFORE deploying the
-- classroom Next.js API that reads this column.
BEGIN;
ALTER TABLE accent.class_assignment_items
  ADD COLUMN IF NOT EXISTS speaker_label varchar(24);
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='accent_assignment_speaker_label_format'
   AND conrelid='accent.class_assignment_items'::regclass) THEN
  ALTER TABLE accent.class_assignment_items
   ADD CONSTRAINT accent_assignment_speaker_label_format CHECK (
    speaker_label IS NULL OR speaker_label ~ '^[A-Za-z][A-Za-z0-9_.-]{0,23}$');
 END IF;
END $$;
COMMIT;
