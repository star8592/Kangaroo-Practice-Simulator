-- Allow the existing unprivileged accentclass runtime to remove a verified
-- enrollment in its scoped tenant, using the existing FORCE RLS policy.
-- The application re-checks teacher authority before performing this action.
-- No user accounts, recording tables or grades are granted DELETE rights.
BEGIN;
GRANT DELETE ON TABLE accent.class_enrollments TO accentclass;
COMMIT;
