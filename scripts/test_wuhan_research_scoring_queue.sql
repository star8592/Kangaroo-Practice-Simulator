-- Run only against disposable database with real ticket/archive/erasure candidate schema.
DO $$
DECLARE cap_i integer; a text:='par_'||repeat('a',16); b text:='par_'||repeat('b',16);
 t jsonb; r text; k uuid; j jsonb; h text:=repeat('a',64); p jsonb;
BEGIN
 t:=exam_access_draft.issue_research_ticket(a,1,'WH01',extract(epoch FROM clock_timestamp()+interval '1 hour')::bigint);
 r:=t->>'attempt_id';
 IF exam_access_draft.enqueue_research_scoring(a,r,'WH01',h)<>'not_available' THEN RAISE EXCEPTION 'unclaimed'; END IF;
 PERFORM exam_access_draft.claim_research_ticket(t->>'ticket','WH01',a,1);
 IF exam_access_draft.enqueue_research_scoring(b,r,'WH01',h)<>'not_available' THEN RAISE EXCEPTION 'wrong owner'; END IF;
 IF exam_access_draft.enqueue_research_scoring(a,r,'WH02',h)<>'not_available' THEN RAISE EXCEPTION 'wrong paper'; END IF;
 IF exam_access_draft.enqueue_research_scoring(a,r,'WH01',h)<>'queued' THEN RAISE EXCEPTION 'enqueue'; END IF;
 IF exam_access_draft.enqueue_research_scoring(a,r,'WH01',h)<>'already_queued' THEN RAISE EXCEPTION 'duplicate'; END IF;
 IF exam_access_draft.enqueue_research_scoring(a,r,'WH01',repeat('b',64))<>'conflict' THEN RAISE EXCEPTION 'changed manifest'; END IF;
 j:=exam_access_draft.claim_research_scoring(); k:=(j->>'lease_id')::uuid;
 IF j->>'attempt_id' IS DISTINCT FROM r OR k IS NULL THEN RAISE EXCEPTION 'claim'; END IF;
 IF exam_access_draft.claim_research_scoring() IS NOT NULL THEN RAISE EXCEPTION 'double claim'; END IF;
 IF exam_access_draft.read_research_scoring(b,r) IS NOT NULL THEN RAISE EXCEPTION 'wrong owner read'; END IF;
 IF exam_access_draft.read_research_scoring(a,r)->>'state' IS DISTINCT FROM 'leased' THEN RAISE EXCEPTION 'owner read'; END IF;
 IF exam_access_draft.finish_research_scoring(r,gen_random_uuid(),true)<>'stale_lease' THEN RAISE EXCEPTION 'stale lease'; END IF;
 IF exam_access_draft.finish_research_scoring(r,k,true)<>'atomic_archive_required' THEN RAISE EXCEPTION 'missing report'; END IF;
 IF exam_access_draft.finish_research_scoring(r,k,false)<>'queued' THEN RAISE EXCEPTION 'retry'; END IF;
 IF exam_access_draft.claim_research_scoring() IS NOT NULL THEN RAISE EXCEPTION 'backoff'; END IF;
 UPDATE exam_access_draft.research_scoring_job SET available_at=clock_timestamp() WHERE attempt_id=r;
 j:=exam_access_draft.claim_research_scoring(); k:=(j->>'lease_id')::uuid;
 UPDATE exam_access_draft.research_scoring_job SET lease_until=clock_timestamp()-interval '1 second' WHERE attempt_id=r;
 j:=exam_access_draft.claim_research_scoring();
 IF (j->>'try')::int<>3 OR (j->>'lease_id')::uuid=k THEN RAISE EXCEPTION 'lease recovery'; END IF;
 IF exam_access_draft.finish_research_scoring(r,k,false)<>'stale_lease' THEN RAISE EXCEPTION 'old worker'; END IF;
 p:=jsonb_build_object('attempt_id',r,'paper_id','WH01','finalized',true,'billable',false,'official_score',false,
 'report_status','research','total_score',NULL,'total_tasks',18,'items',(SELECT jsonb_agg(jsonb_build_object('question',i)) FROM generate_series(1,18)i),
 'rubric_sha256',repeat('a',64),'report_evidence_sha256',repeat('b',64));
 IF exam_access_draft.complete_research_scoring(a,r,k,h,p)<>'stale_lease' THEN RAISE EXCEPTION 'stale archive'; END IF;
 IF exam_access_draft.complete_research_scoring(a,r,(j->>'lease_id')::uuid,repeat('b',64),p)<>'manifest_conflict' THEN RAISE EXCEPTION 'manifest conflict'; END IF;
 IF exam_access_draft.complete_research_scoring(b,r,(j->>'lease_id')::uuid,h,p)<>'not_available' THEN RAISE EXCEPTION 'wrong owner archive'; END IF;
 IF exam_access_draft.complete_research_scoring(a,r,(j->>'lease_id')::uuid,h,p)<>'completed' THEN RAISE EXCEPTION 'complete'; END IF;
 IF exam_access_draft.read_research_report(a,r) IS DISTINCT FROM p THEN RAISE EXCEPTION 'archive missing'; END IF;
 IF exam_access_draft.erase_research_report(a,r)<>'erased' THEN RAISE EXCEPTION 'erase'; END IF;
 IF exam_access_draft.enqueue_research_scoring(a,r,'WH01',h)<>'not_available' THEN RAISE EXCEPTION 'erasure'; END IF;
 IF exam_access_draft.claim_research_scoring() IS NOT NULL THEN RAISE EXCEPTION 'terminal reclaim'; END IF;
 IF exam_access_draft.read_research_scoring(a,r) IS NOT NULL THEN RAISE EXCEPTION 'erased read'; END IF;
 t:=exam_access_draft.issue_research_ticket(a,1,'WH01',extract(epoch FROM clock_timestamp()+interval '1 hour')::bigint);
 r:=t->>'attempt_id';
 PERFORM exam_access_draft.claim_research_ticket(t->>'ticket','WH01',a,1);
 PERFORM exam_access_draft.enqueue_research_scoring(a,r,'WH01',h);
 PERFORM exam_access_draft.claim_research_scoring();
 UPDATE exam_access_draft.research_scoring_job SET tries=3,lease_until=clock_timestamp()-interval '1 second' WHERE attempt_id=r;
 IF exam_access_draft.read_research_scoring(a,r)->>'state' IS DISTINCT FROM 'failed' THEN RAISE EXCEPTION 'exhausted lease'; END IF;
 IF exam_access_draft.claim_research_scoring() IS NOT NULL THEN RAISE EXCEPTION 'exhausted reclaim'; END IF;
 FOR cap_i IN 1..3 LOOP
  t:=exam_access_draft.issue_research_ticket(a,1,'WH01',extract(epoch FROM clock_timestamp()+interval '1 hour')::bigint);
  r:=t->>'attempt_id';
  PERFORM exam_access_draft.claim_research_ticket(t->>'ticket','WH01',a,1);
  IF exam_access_draft.enqueue_research_scoring(a,r,'WH01',h) IS DISTINCT FROM (CASE WHEN cap_i<=2 THEN 'queued' ELSE 'owner_limit' END) THEN RAISE EXCEPTION 'owner cap'; END IF;
 END LOOP;
 RAISE NOTICE 'R89_QUEUE_ATOMIC_AND_ADMISSION_PASS';
END $$;
