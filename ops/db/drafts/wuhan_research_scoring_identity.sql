-- Boolean-only lease access: no raw recording data for the archive role.
BEGIN;
GRANT EXECUTE ON FUNCTION exam_access_draft.inspect_scoring_stage_access(text,uuid) TO wuhan_scoring_archive;
COMMIT;
