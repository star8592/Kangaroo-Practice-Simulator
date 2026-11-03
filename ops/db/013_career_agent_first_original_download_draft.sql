-- Career AI Agent original engineering pack. PRIVATE asset delivery pending.
-- A catalogue draft is deliberately NOT an approved sale.
-- Resource bytes and asset SHA256 must be staged and independently verified first.
BEGIN;
INSERT INTO billing_products
 (id,tier,period,product_kind,content_kind,content_id,title_zh,amount_minor,
  currency,enabled,rights_approved,delivery_verified,access_restricted)
VALUES
 ('career_agent_lab_pack_v1',NULL,NULL,'item','resource','career_agent_lab_pack_v1',
  'AI Agent工程实战与24题岗位面试训练包（源码＋手册）',490,
  'CNY',false,false,false,true)
ON CONFLICT(id) DO NOTHING;
COMMIT;
