-- R59: teacher-reviewed page text is persistent and class-scoped.
-- Never promote raw OCR to a student scoring target automatically.
BEGIN;
CREATE TABLE IF NOT EXISTS accent.teacher_book_page_reviews (
 tenant_id uuid NOT NULL,
 class_id uuid NOT NULL,
 book_id text NOT NULL CHECK(book_id='kids-box-student-1'),
 pdf_page integer NOT NULL CHECK(pdf_page BETWEEN 1 AND 94),
 reviewer_account_id uuid NOT NULL,
 reviewed_text text NOT NULL CHECK(length(btrim(reviewed_text)) BETWEEN 1 AND 12000),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 reviewed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,class_id,book_id,pdf_page),
 FOREIGN KEY(tenant_id,class_id) REFERENCES accent.classes(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,reviewer_account_id) REFERENCES accent.memberships(tenant_id,account_id)
);
ALTER TABLE accent.teacher_book_page_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE accent.teacher_book_page_reviews FORCE ROW LEVEL SECURITY;
DO $$
BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM pg_policies WHERE schemaname='accent'
   AND tablename='teacher_book_page_reviews' AND policyname='tenant_boundary'
 ) THEN
  CREATE POLICY tenant_boundary ON accent.teacher_book_page_reviews
    USING (tenant_id=COALESCE(NULLIF(current_setting('app.tenant_id',true),''),
      '00000000-0000-0000-0000-000000000000')::uuid)
    WITH CHECK (tenant_id=COALESCE(NULLIF(current_setting('app.tenant_id',true),''),
      '00000000-0000-0000-0000-000000000000')::uuid);
 END IF;
END $$;
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='accentclass') THEN
  GRANT SELECT,INSERT,UPDATE ON accent.teacher_book_page_reviews TO accentclass;
 END IF;
END $$;
COMMIT;
