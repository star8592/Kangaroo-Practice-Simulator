import assert from "node:assert/strict";
import {
 INVITATION_LINK_FIELD,INVITATION_TEMPLATES,INVITATION_TEMPLATE_KEYS,
 classInvitationMessage,renderInvitationTemplate,teacherDisplayName,
 validateInvitationTemplate,
} from "../src/features/english/pronunciation/class-invitation-copy";

const url="https://socthink.cn/english/pronunciation/join/tenant/class/signed-token";
const name="Candy老师 · 英语跟读测试班";
assert.equal(teacherDisplayName(name),"Candy老师");
for(const key of INVITATION_TEMPLATE_KEYS){
 const template=INVITATION_TEMPLATES[key].text;
 assert.ok(validateInvitationTemplate(template),key);
 const link=renderInvitationTemplate(template,name,url);
 const qr=renderInvitationTemplate(template,name,url,true);
 assert.equal(link.split(url).length-1,1);
 assert.ok(link.includes("Candy老师"),key);
 assert.ok(qr.includes("扫描下方二维码"));
 assert.ok(!qr.includes(url));
 assert.ok(!link.includes("{{邀请链接}}"));
}
assert.ok(classInvitationMessage(name,url).includes("Candy老师"));
assert.equal(validateInvitationTemplate("请点击 "+INVITATION_LINK_FIELD),false);
assert.equal(validateInvitationTemplate("通知文案："+("练习英语".repeat(20))),false);
assert.equal(validateInvitationTemplate(INVITATION_TEMPLATES.warm.text.replace(INVITATION_LINK_FIELD,"")),false);
assert.equal(validateInvitationTemplate(INVITATION_TEMPLATES.warm.text+INVITATION_LINK_FIELD),false);
console.log("TEACHER_INVITATION_COPY_PASS templates=3 variable-url=1");
