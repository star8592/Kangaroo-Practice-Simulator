-- SOC THINK classroom: allow a verified site owner to directly designate an
-- already-verified WeChat account as a teacher without self-applying first.
-- Application code sets app.classroom_admin=YES only after isSiteOwner(session).
-- Existing self-application and revocation rules remain unchanged.
BEGIN;
DO $body$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_policies
   WHERE schemaname='accent'
     AND tablename='teacher_access_requests'
     AND policyname='accent_teacher_request_admin_direct_grant'
 ) THEN
   CREATE POLICY accent_teacher_request_admin_direct_grant
     ON accent.teacher_access_requests FOR INSERT
     WITH CHECK (
       current_setting('app.classroom_admin',true)='yes'
       AND state='approved'
       AND reviewed_by IS NOT NULL
       AND reviewed_at IS NOT NULL
     );
 END IF;
END
$body$;
COMMIT;
