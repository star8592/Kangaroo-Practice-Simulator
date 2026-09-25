export const STUDENT_AVATARS = [
  { key: "rocket", emoji: "🚀", label: "火箭" },
  { key: "fox", emoji: "🦊", label: "小狐狸" },
  { key: "panda", emoji: "🐼", label: "熊猫" },
  { key: "owl", emoji: "🦉", label: "猫头鹰" },
  { key: "dino", emoji: "🦖", label: "小恐龙" },
  { key: "robot", emoji: "🤖", label: "机器人" },
  { key: "cat", emoji: "🐱", label: "小猫" },
  { key: "whale", emoji: "🐳", label: "小鲸鱼" },
] as const;

export type StudentAvatarKey = (typeof STUDENT_AVATARS)[number]["key"];
export const DEFAULT_STUDENT_AVATAR: StudentAvatarKey = "rocket";

export function isStudentAvatarKey(value: unknown): value is StudentAvatarKey {
  return typeof value === "string" && STUDENT_AVATARS.some((item) => item.key === value);
}

export function studentAvatarEmoji(value: unknown) {
  return STUDENT_AVATARS.find((item) => item.key === value)?.emoji
    ?? STUDENT_AVATARS.find((item) => item.key === DEFAULT_STUDENT_AVATAR)!.emoji;
}
