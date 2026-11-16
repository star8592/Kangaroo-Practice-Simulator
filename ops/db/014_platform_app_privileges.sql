-- R180 least-privilege DML grant AFTER an authorized operator has created
-- the dedicated database and the socthink_platform_app LOGIN role.
-- Does NOT set or print a password and does NOT create a superuser.
-- Execute as the DB owner inside the dedicated socthink_platform database.
BEGIN;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA platform TO socthink_platform_app;
GRANT SELECT, INSERT, UPDATE ON platform.role_grants TO socthink_platform_app;
GRANT SELECT, INSERT ON platform.role_grant_audit TO socthink_platform_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA platform TO socthink_platform_app;
COMMIT;
