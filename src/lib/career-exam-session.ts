import crypto from "node:crypto";
import {readSignedJsonToken,signJsonToken} from "./auth-crypto";
import {readOrCreateSecret,userDataPath} from "./user-data-store";
import {getCareerFormalPaper} from "./career-formal-bank";

const SECONDS_GRACE=20;
const SECRET_FILE=userDataPath("career-formal-exam-session-secret.txt");
function secret(){return readOrCreateSecret(SECRET_FILE);}
type ExamClaims={
  aud:"career-formal-exam";id:string;revision:number;nonce:string;
  iat:number;exp:number;
};
export function createCareerExamSession(paperId:string,nowSeconds=Math.floor(Date.now()/1000)){
  const p=getCareerFormalPaper(paperId);
  if(!p)throw new Error("EXAM_NOT_FOUND");
  const deadline=nowSeconds+p.durationMinutes*60;
  const claims:ExamClaims={
    aud:"career-formal-exam",id:paperId,revision:p.revision,nonce:crypto.randomUUID(),
    iat:nowSeconds,exp:deadline+SECONDS_GRACE,
  };
  return {
    token:signJsonToken(claims,secret()),
    startedAt:nowSeconds*1000,
    deadlineAt:deadline*1000,
    durationMinutes:p.durationMinutes,
    paperId,
  };
}
export type CareerExamTokenVerdict="valid"|"expired"|"invalid";
export function verifyCareerExamSession(
  paperId:string,rawToken:unknown,nowSeconds=Math.floor(Date.now()/1000),
):CareerExamTokenVerdict{
  const p=getCareerFormalPaper(paperId);
  if(!p||typeof rawToken!=="string"||rawToken.length>2000||rawToken.length<30)
    return "invalid";
  const claims=readSignedJsonToken<ExamClaims>(rawToken,secret());
  if(!claims||claims.aud!=="career-formal-exam"||claims.id!==paperId||
    claims.revision!==p.revision||!/^[-a-f0-9]{36}$/.test(claims.nonce)||
    !Number.isInteger(claims.iat)||!Number.isInteger(claims.exp)||
    claims.iat>nowSeconds+5||claims.iat<nowSeconds-86400||
    claims.exp!==claims.iat+p.durationMinutes*60+SECONDS_GRACE)
    return "invalid";
  return nowSeconds>claims.exp?"expired":"valid";
}
