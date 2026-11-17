-- Independent class invitation, never tied to a particular assignment.
-- No existing student, teacher, order, recording or grade rows are rewritten.
BEGIN;
ALTER TABLE accent.class_join_requests ALTER COLUMN assignment_id DROP NOT NULL;
CREATE TABLE IF NOT EXISTS accent.class_invitations (
 tenant_id uuid NOT NULL,
 class_id uuid NOT NULL,
 rotation uuid NOT NULL DEFAULT gen_random_uuid(),
 enabled boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (tenant_id,class_id),
 FOREIGN KEY (tenant_id,class_id) REFERENCES accent.classes(tenant_id,id) ON DELETE CASCADE
);
ALTER TABLE accent.class_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE accent.class_invitations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_boundary ON accent.class_invitations;
CREATE POLICY tenant_boundary ON accent.class_invitations
 USING (tenant_id=COALESCE(NULLIF(current_setting('app.tenant_id',true),''),
  '00000000-0000-0000-0000-000000000000')::uuid)
 WITH CHECK (tenant_id=COALESCE(NULLIF(current_setting('app.tenant_id',true),''),
  '00000000-0000-0000-0000-000000000000')::uuid);
DO $grant$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='accentclass') THEN
  GRANT SELECT,INSERT,UPDATE ON accent.class_invitations TO accentclass;
 END IF;
END $grant$;
-- Students may list ONLY their own enrolled class IDs/titles across teacher
-- tenants; teacher-roster and score visibility stay tenant scoped.
DROP POLICY IF EXISTS student_own_enrollment_directory ON accent.class_enrollments;
CREATE POLICY student_own_enrollment_directory ON accent.class_enrollments
 FOR SELECT USING (
  role='student' AND account_id=COALESCE(NULLIF(current_setting('app.account_id',true),''),
   '00000000-0000-0000-0000-000000000000')::uuid
 );
DROP POLICY IF EXISTS student_own_membership_directory ON accent.memberships;
CREATE POLICY student_own_membership_directory ON accent.memberships
 FOR SELECT USING (
  role='student' AND account_id=COALESCE(NULLIF(current_setting('app.account_id',true),''),
   '00000000-0000-0000-0000-000000000000')::uuid
 );
DROP POLICY IF EXISTS student_own_class_directory ON accent.classes;
CREATE POLICY student_own_class_directory ON accent.classes
 FOR SELECT USING (
  EXISTS(SELECT 1 FROM accent.class_enrollments e
   WHERE e.tenant_id=classes.tenant_id AND e.class_id=classes.id
    AND e.role='student' AND e.account_id=COALESCE(NULLIF(current_setting('app.account_id',true),''),
     '00000000-0000-0000-0000-000000000000')::uuid)
 );
-- The teacher's class label is visible only to a student already enrolled
-- in one of this teacher's classes. No roster or reports are exposed.
DROP POLICY IF EXISTS teacher_label_for_enrolled_student ON accent.memberships;
CREATE POLICY teacher_label_for_enrolled_student ON accent.memberships
 FOR SELECT USING (
  role='teacher' AND EXISTS (
   SELECT 1 FROM accent.classes c
   JOIN accent.class_enrollments e ON e.tenant_id=c.tenant_id AND e.class_id=c.id
   WHERE c.tenant_id=memberships.tenant_id
     AND c.lead_teacher_id=memberships.account_id
     AND e.role='student'
     AND e.account_id=COALESCE(NULLIF(current_setting('app.account_id',true),''),
      '00000000-0000-0000-0000-000000000000')::uuid
  )
 );
COMMIT;
