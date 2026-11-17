/** Both the text invitation and the QR poster use the same teacher-facing wording. */
export const INVITATION_GREETING = "各位同学、家长好！";
export const INVITATION_OVERVIEW = "欢迎加入英语跟读训练班！孩子可以练习英语发音、完成老师布置的跟读作业；老师也能了解练习情况，给予有针对性的反馈。";
export const INVITATION_STEPS = [
  "点击班级专属链接，或扫描邀请海报上的二维码",
  "使用微信登录，并填写学生姓名",
  "提交入班申请，等待老师审核通过",
] as const;
export const INVITATION_CLOSING = "每天坚持一点点，让英语开口更自然、更自信！";

export function classInvitationMessage(className: string, url: string): string {
  return [
    "📚 " + className + "｜英语跟读入班邀请",
    "",
    INVITATION_GREETING,
    "",
    INVITATION_OVERVIEW,
    "",
    "🎯 加入方式",
    ...INVITATION_STEPS.map((step, index) => String(index + 1) + ". " + step),
    "",
    "🔗 班级专属入口",
    url,
    "",
    "🌱 " + INVITATION_CLOSING,
    "",
    "—— " + className,
  ].join("\n");
}
