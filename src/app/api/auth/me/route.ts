import { NextRequest, NextResponse } from "next/server";
import { updateStudent, userFromRequest } from "@/lib/auth";
import {PARENT_SESSION_COOKIE,parentFromSessionToken,setWechatDisplayName} from "@/lib/parent-auth";

function currentUser(req: NextRequest) {
  return userFromRequest(req);
}

export async function GET(req: NextRequest) {
  const user = currentUser(req);
  return user
    ? NextResponse.json({ user })
    : NextResponse.json({ error: "not logged in" }, { status: 401 });
}

export async function PATCH(req: NextRequest) {
  // Unified account-profile mutation: use the existing PATCH route rather
  // than adding a new Next handler. Owner is always the verified WeChat
  // session; students with legacy independent sessions use the old path below.
  const parent=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  if(parent?.active&&(parent.wechatId||parent.wechatOpenId)){
    const origin=req.headers.get("origin"),host=req.headers.get("host");
    const local=req.nextUrl.hostname==="localhost"&&process.env.NODE_ENV==="development";
    if(!origin||!(local?origin==="http://localhost:3000":
      ["https://socthink.cn","https://www.socthink.cn"].includes(origin))||
      !host||!["socthink.cn","www.socthink.cn","localhost:3000"].includes(host))
      return NextResponse.json({error:"操作来源无效"},{status:403,headers:{"Cache-Control":"no-store"}});
    try{
      if(!req.headers.get("content-type")?.startsWith("application/json"))
        return NextResponse.json({error:"请求格式无效"},{status:415});
      const wire=await req.text();
      if(Buffer.byteLength(wire,"utf8")>1024)
        return NextResponse.json({error:"请求过长"},{status:413});
      const body=JSON.parse(wire);
      if(body?.profileAction!=="set-wechat-display-name")
        return NextResponse.json({error:"资料修改操作不支持"},{status:400});
      const updated=setWechatDisplayName(parent.id,body.name);
      return NextResponse.json({ok:true,name:updated.name},{headers:{"Cache-Control":"no-store"}});
    }catch{
      return NextResponse.json({error:"请输入2至30个字的有效姓名或昵称，不可使用通用占位名称"},{status:400});
    }
  }
  const user = currentUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (user.role !== "student") {
    return NextResponse.json({ error: "仅学生账号可修改学生资料" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const grade = Number(body?.grade);
    const school = String(body?.school ?? "").trim();
    const avatarKey = body?.avatarKey === undefined ? user.avatarKey : String(body.avatarKey);

    if (!name || name.length > 50) {
      return NextResponse.json({ error: "姓名或昵称请填写 1–50 个字符" }, { status: 400 });
    }
    if (!Number.isInteger(grade) || grade < 1 || grade > 13) {
      return NextResponse.json({ error: "年级必须为 1–13" }, { status: 400 });
    }
    if (school.length > 80) {
      return NextResponse.json({ error: "学校名称不能超过 80 个字符" }, { status: 400 });
    }

    const updated = updateStudent(user.id, { name, grade, school, avatarKey, onboardingCompleted: true });
    return NextResponse.json({ user: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 400 },
    );
  }
}
