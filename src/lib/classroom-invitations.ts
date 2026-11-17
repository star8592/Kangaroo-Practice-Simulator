import crypto from "node:crypto";
import {readOrCreateSecret,userDataPath} from "./user-data-store";
const secretFile=userDataPath("class-invitation-signing-secret.txt");
export function classInvitationToken(tenant:string,cl:string,rotation:string):string{
 return crypto.createHmac("sha256",readOrCreateSecret(secretFile))
  .update("socthink-class-invitation-v1").update("\0")
  .update(tenant).update("\0").update(cl).update("\0").update(rotation)
  .digest("hex");
}
export function verifyClassInvitation(tenant:string,cl:string,rotation:string,token:string):boolean{
 if(!/^[a-f0-9]{64}$/.test(token))return false;
 const expected=classInvitationToken(tenant,cl,rotation);
 return crypto.timingSafeEqual(Buffer.from(expected,"hex"),Buffer.from(token,"hex"));
}
export function classInvitationLink(tenant:string,cl:string,rotation:string):string{
 return "https://socthink.cn/english/pronunciation/join/"+tenant+"/"+cl+"/"+
  classInvitationToken(tenant,cl,rotation);
}
