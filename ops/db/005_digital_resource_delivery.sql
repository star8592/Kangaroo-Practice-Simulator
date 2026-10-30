-- One authoritative billing ledger owns every file entitlement.
-- Storage is private, content-addressed by SHA256 and never under /public.
-- All assets are unpublished and fail-closed until specifically reviewed.
BEGIN;
CREATE TABLE IF NOT EXISTS billing_resource_assets (
  resource_id text PRIMARY KEY
    CHECK (resource_id ~ '^[A-Za-z0-9_.-]{4,120}$'),
  sha256 char(64) NOT NULL
    CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  size_bytes bigint NOT NULL
    CHECK (size_bytes > 0 AND size_bytes <= 104857600),
  file_name text NOT NULL
    CHECK (length(file_name) BETWEEN 1 AND 180 AND
           file_name !~ '[[:cntrl:]]' AND
           position('/' in file_name) = 0 AND
           position(chr(92) in file_name) = 0),
  mime_type text NOT NULL CHECK (mime_type IN (
    'application/pdf','application/zip','application/octet-stream',
    'text/plain','text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  )),
  rights_approved boolean NOT NULL DEFAULT false,
  delivery_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- A historical sale cannot be silently switched to unrelated file bytes.
-- New editions use a new resource_id; rights may still be disabled to stop
-- delivery if the legal permission changes.
CREATE OR REPLACE FUNCTION billing_guard_sold_resource_asset()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM billing_orders o
      WHERE o.product_kind='item' AND o.content_kind='resource'
        AND o.content_id=OLD.resource_id AND o.state IN ('paid','refunded')) THEN
    IF TG_OP='DELETE' THEN
      RAISE EXCEPTION 'Sold resource metadata may not be deleted';
    END IF;
    IF NEW.resource_id IS DISTINCT FROM OLD.resource_id
      OR NEW.sha256 IS DISTINCT FROM OLD.sha256
      OR NEW.size_bytes IS DISTINCT FROM OLD.size_bytes
      OR NEW.file_name IS DISTINCT FROM OLD.file_name
      OR NEW.mime_type IS DISTINCT FROM OLD.mime_type THEN
      RAISE EXCEPTION 'Sold resource file metadata is immutable';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS billing_resource_sold_guard ON billing_resource_assets;
CREATE TRIGGER billing_resource_sold_guard
  BEFORE UPDATE OR DELETE ON billing_resource_assets
  FOR EACH ROW EXECUTE FUNCTION billing_guard_sold_resource_asset();
COMMIT;
