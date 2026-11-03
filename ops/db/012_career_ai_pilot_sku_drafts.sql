-- Original SOC THINK career AI interview offers, sourced from a real domestic
-- competitive scan on 2026-11-04; DRAFT ONLY. No offer is on sale after this SQL.
-- Buyer-facing price, quality, rights and delivery checks must all succeed
-- before approved operators separately enable these rows.
BEGIN;
INSERT INTO billing_products
 (id,tier,period,product_kind,content_kind,content_id,title_zh,amount_minor,
  currency,service_sessions,service_billing_mode,enabled,rights_approved,
  delivery_verified,access_restricted)
VALUES
 ('career_campus_1_v1',NULL,NULL,'service','career_interview','campus-software',
  '校招研发AI面试·1场',690,'CNY',1,'per_use',false,false,false,true),
 ('career_campus_30d10_v1',NULL,NULL,'service','career_interview','campus-software',
  '校招研发AI面试·30天10场',2990,'CNY',10,'monthly',false,false,false,true),
 ('career_social_1_v1',NULL,NULL,'service','career_interview','social-procurement',
  '社招采购AI面试·1场',690,'CNY',1,'per_use',false,false,false,true),
 ('career_social_30d10_v1',NULL,NULL,'service','career_interview','social-procurement',
  '社招采购AI面试·30天10场',2990,'CNY',10,'monthly',false,false,false,true)
ON CONFLICT(id) DO NOTHING;
-- Existing active orders and SKUs must never be mutated by draft seeding.
COMMIT;
