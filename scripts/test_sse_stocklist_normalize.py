#!/usr/bin/env python3
import json
from normalize_sse_stocklist import normalize

def fixture():
    return {"pageHelp":{"total":3,"data":[
      {"COMPANY_CODE":"600054","COMPANY_ABBR":"黄山旅游","SECURITY_CODE_A":"600054","SECURITY_CODE_B":"900942","SECURITY_ABBR_A":"黄山旅游","SECURITY_ABBR_B":"黄山B股","LISTING_DATE":"1997-05-06","LISTING_BOARD":"0"},
      {"COMPANY_CODE":"688001","COMPANY_ABBR":"华兴源创","SECURITY_CODE_A":"688001","SECURITY_CODE_B":"-","SECURITY_ABBR_A":"华兴源创","SECURITY_ABBR_B":"-","LISTING_DATE":"2019-07-22","LISTING_BOARD":"1"},
      {"COMPANY_CODE":"900939","COMPANY_ABBR":"汇丽B","SECURITY_CODE_A":"-","SECURITY_CODE_B":"900939","SECURITY_ABBR_A":"-","SECURITY_ABBR_B":"汇丽B","LISTING_DATE":"2026-11-02","LISTING_BOARD":"0"}
    ]}}

if __name__=="__main__":
    o=fixture()
    m,groups,securities=normalize(json.dumps(o,ensure_ascii=False).encode(),"2026-11-01")
    assert m["rawIssuerRows"]==3
    assert m["expandedSecurityRows"]==4
    assert m["aShares"]==2 and m["bShares"]==2
    assert m["aAndBGroupedCompanies"]==1
    assert m["listDateAfterObservation"]==1
    assert groups[0]["securityCodes"]==["600054","900942"]
    assert groups[2]["securityCodes"]==["900939"]
    assert all(x["listingStatus"]=="official_list_entry_not_employment_proof" for x in securities)
    o["pageHelp"]["total"]=4
    try:
        normalize(json.dumps(o).encode(),"2026-11-01")
    except ValueError as e: assert "SSE_INCOMPLETE_LIST" in str(e)
    else: raise AssertionError("Partial source must not be silently accepted")
    o["pageHelp"]["total"]=3
    o["pageHelp"]["data"][1]["SECURITY_CODE_A"]="600054"
    try:normalize(json.dumps(o,ensure_ascii=False).encode(),"2026-11-01")
    except ValueError as e:assert "DUPLICATE_SECURITY" in str(e)
    else:raise AssertionError("Duplicate securities must be rejected")
    print("SSE_STOCK_LIST_TEST=PASS")
