/** Editable teacher-facing copy. The invitation URL always comes from the signed class API. */
export const INVITATION_LINK_FIELD = "{{邀请链接}}";
export const INVITATION_CLASS_FIELD = "{{班级名称}}";
export const INVITATION_TEACHER_FIELD = "{{老师称呼}}";
export const INVITATION_TEMPLATE_KEYS = ["warm", "concise", "formal"] as const;
export type InvitationTemplateKey = (typeof INVITATION_TEMPLATE_KEYS)[number];

export const INVITATION_TEMPLATES: Record<InvitationTemplateKey, {label: string; text: string}> = {
  warm: {
    label: "温暖鼓励 · 家长群推荐",
    text: [
      "📚 {{班级名称}}",
      "",
      "各位同学、家长好！",
      "",
      "为了帮助孩子养成良好的英语朗读习惯，提升发音准确度和口语表达能力，我们开通了专属的英语跟读训练班！",
      "",
      "✨ 在这里，孩子可以：",
      "✅ 跟随标准发音进行英语朗读练习",
      "✅ 完成老师布置的英语跟读作业",
      "✅ 获得智能发音评分，了解需要改进的地方",
      "✅ 让老师及时了解练习情况，提供针对性的指导",
      "",
      "🎯 如何加入班级？",
      "1. 点击下方专属邀请链接，或扫描老师分享的二维码。",
      "2. 使用微信登录，并填写学生姓名。",
      "3. 提交入班申请，等待{{老师称呼}}审核通过。",
      "",
      "🔗 班级专属邀请链接：",
      "{{邀请链接}}",
      "",
      "🌱 每天坚持一点点，让英语开口更自然、表达更自信！",
      "",
      "期待大家加入，一起开启英语跟读之旅！",
      "",
      "—— {{老师称呼}}",
      "SOC THINK · 英语跟读课堂",
    ].join("\n"),
  },
  concise: {
    label: "简洁通知 · 班级群",
    text: [
      "📚 {{班级名称}} · 入班通知",
      "",
      "同学们、家长们好！{{老师称呼}}的英语跟读班已经开放入班。",
      "",
      "孩子可以在线跟读、完成作业、查看发音评分，老师会跟进练习情况。",
      "",
      "加入步骤：",
      "① 点击链接或扫描邀请二维码",
      "② 微信登录并填写学生姓名",
      "③ 申请入班，等待{{老师称呼}}审核",
      "",
      "🔗 立即申请加入：",
      "{{邀请链接}}",
      "",
      "欢迎大家一起坚持练习！",
      "—— {{老师称呼}}",
    ].join("\n"),
  },
  formal: {
    label: "正式专业 · 家校通知",
    text: [
      "【{{班级名称}}｜英语跟读课程邀请】",
      "",
      "尊敬的家长、亲爱的同学：",
      "",
      "为进一步提升学生英语朗读的规范性、发音准确度及口语表达能力，现邀请各位加入{{班级名称}}。",
      "",
      "课程支持标准发音示范、在线跟读训练、作业提交与智能评分。教师将结合练习记录给予针对性反馈。",
      "",
      "入班指引：",
      "一、点击下方专属链接或扫描二维码。",
      "二、通过微信登录并填写学生真实姓名。",
      "三、提交入班申请，等待教师审核通过。",
      "",
      "班级专属链接：",
      "{{邀请链接}}",
      "",
      "感谢各位家长的支持与配合！",
      "",
      "{{老师称呼}}",
      "SOC THINK · 英语跟读课堂",
    ].join("\n"),
  },
};

export function teacherDisplayName(className: string): string {
  const match = className.match(/([^·|｜]+老师)/u);
  return match ? match[1].trim() : "任课老师";
}

/** A teacher may change the prose but never the actual signed destination URL. */
export function validateInvitationTemplate(text: unknown): text is string {
  return typeof text === "string" &&
    [...text].length >= 35 && [...text].length <= 1400 &&
    (text.match(/\{\{邀请链接\}\}/g) || []).length === 1 &&
    !text.includes("\u0000") &&
    !text.includes("\u2028") && !text.includes("\u2029");
}

export function renderInvitationTemplate(
  template: string, className: string, url: string, poster = false,
): string {
  return template
    .replaceAll(INVITATION_CLASS_FIELD, className)
    .replaceAll(INVITATION_TEACHER_FIELD, teacherDisplayName(className))
    .replaceAll(INVITATION_LINK_FIELD, poster ? "（请扫描下方二维码申请入班）" : url);
}

export function classInvitationMessage(className: string, url: string): string {
  return renderInvitationTemplate(INVITATION_TEMPLATES.warm.text, className, url);
}
