#!/usr/bin/env python3
"""Build a read-only inventory of all web pages and API endpoints.
Literal source links are evidence hints; missing references are NOT proof of orphan pages.
"""
import collections
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
APP = ROOT / "src" / "app"
QUOTE = chr(96)
OWNERS = {
    "/assessments": "全部考试",
    "/resources": "真题资料",
    "/career": "职业岗位",
    "/skill-labs": "技能实训",
    "/assessment-center": "测评中心",
    "/shop": "数字商城",
}
EXAMS = ("/arithmetic", "/math-practice", "/competitions", "/events", "/exam-planner", "/review", "/exam", "/result", "/report")
UTILITIES = ("/account", "/membership", "/login", "/parent", "/student", "/verification")
POLICIES = ("/privacy", "/terms", "/digital-purchase-policy")

def url_for(file, ending):
    rel = file.relative_to(APP).as_posix()
    return "/" if rel == ending else "/" + rel[:-(len(ending) + 1)]

def classify(url):
    if url == "/":
        return "全站首页", "L0", "public"
    if url == "/search":
        return "全站搜索", "L0", "noindex"
    if url == "/assessment-center/sql-lab":
        return "技能实训（旧路径永久重定向）", "redirect", "public-redirect"
    if url.startswith("/admin"):
        return "运营后台", "private", "restricted"
    if url.startswith(POLICIES):
        return "政策和帮助", "support", "public"
    if url.startswith(UTILITIES):
        return "账户和记录", "flow", "private-or-conditional"
    for prefix, owner in OWNERS.items():
        if url == prefix:
            return owner, "L1", "public"
        if url.startswith(prefix + "/"):
            tail = url[len(prefix) + 1:]
            return owner, ("L3" if "[" in tail or "/" in tail else "L2"), "conditional"
    if url.startswith(EXAMS):
        return "全部考试（兼容旧短路径）", ("L4" if url.startswith(("/exam/", "/report", "/result", "/review")) else "L2"), "conditional"
    return "未分配", "unknown", "unknown"

sources = []
for directory in ("src/app", "src/components", "src/lib"):
    for file in (ROOT / directory).rglob("*"):
        if file.suffix not in (".tsx", ".ts", ".jsx", ".js") or "/api/" in file.as_posix() or file.name in ("sitemap.ts", "robots.ts"):
            continue
        sources.append((file.relative_to(ROOT).as_posix(), file.read_text(encoding="utf-8", errors="replace")))
reference_pattern = re.compile(r"""['"\x60](/[A-Za-z0-9_/.\[\]{}$?&=#%-]+)['"\x60]""")
references = collections.defaultdict(set)
for filename, body in sources:
    for match in reference_pattern.finditer(body):
        path = match.group(1).split("?")[0].split("#")[0].rstrip("/") or "/"
        references[path].add(filename)

def incoming_links(url, own_source):
    found = set()
    dynamic_prefix = url.split("[", 1)[0] if "[" in url else None
    for literal, files in references.items():
        matches = literal == url or (
            dynamic_prefix is not None and literal.startswith(dynamic_prefix)
            and len(literal) > len(dynamic_prefix)
        )
        if matches:
            found.update(f for f in files if f != own_source)
    return sorted(found)

pages = []
for file in APP.rglob("page.tsx"):
    url = url_for(file, "page.tsx")
    source = file.relative_to(ROOT).as_posix()
    owner, level, access = classify(url)
    incoming = incoming_links(url, source)
    pages.append(dict(url=url, source=source, owner=owner, level=level, access=access, incoming=incoming))
pages.sort(key=lambda x: x["url"])
nested_main = [p for p in pages if re.search(r"<main(?:\s|>)", (ROOT / p["source"]).read_text(encoding="utf-8"))]

api_routes = []
for file in APP.rglob("route.ts"):
    url = url_for(file, "route.ts")
    owner = classify(url[4:] if url.startswith("/api/") else url)[0]
    if url.startswith(("/api/auth", "/api/access")):
        owner = "统一账户/授权"
    elif url.startswith("/api/payments"):
        owner = "支付/统一账本"
    elif url == "/api/release":
        owner = "全站版本和状态"
    elif url.startswith("/api/admin"):
        owner = "运营后台"
    elif url.startswith("/api/miniapp"):
        owner = "小程序契约"
    elif url.startswith(("/api/parent", "/api/family")):
        owner = "历史账户/家庭接口"
    elif url.startswith("/api/student"):
        owner = "成绩及账户"
    elif url.startswith("/api/internal"):
        owner = "内部服务"
    elif url.startswith(("/api/assessment",)):
        owner = "测评中心"
    elif url.startswith(("/api/competition", "/api/arithmetic", "/api/academic-events", "/api/exams", "/api/exam-sessions", "/api/math-engine", "/api/solutions", "/api/grade")):
        owner = "全部考试"
    api_routes.append(dict(url=url, owner=owner))
api_routes.sort(key=lambda x: x["url"])

miniapp = sorted(f.relative_to(ROOT).as_posix() for f in (ROOT / "apps/miniapp/src/pages").rglob("index.tsx"))
candidates = [p for p in pages if not p["incoming"] and p["owner"] not in ("运营后台", "账户和记录")]
head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
summary = dict(
    code_sha=head, pages=len(pages), api_routes=len(api_routes), miniapp_pages=len(miniapp),
    candidate_count=len(candidates), candidate_urls=[p["url"] for p in candidates],
    nested_main_count=len(nested_main), nested_main_urls=[p["url"] for p in nested_main],
    owners=dict(collections.Counter(p["owner"] for p in pages)),
)
lines = [
    "# SOC THINK 逐页页面架构归属审计总账",
    "",
    "> 唯一架构权威仍是 [全站信息架构总纲](SOCTHINK_SITE_ARCHITECTURE_MASTER.md)。本文是由当前代码生成的逐页审计附录，不能用来替代总纲。",
    "",
    "代码快照：" + QUOTE + head + QUOTE,
    "",
    "本次枚举：**" + str(len(pages)) + " 个网页模板、" + str(len(api_routes)) + " 个 API handler、" + str(len(miniapp)) + " 个小程序页面源文件**。动态路由仅按文件模板计数，不等于线上真实 URL 数。",
    "",
    "**审计方法界限：**通过源码扫描寻找字面 URL 引用。JSX 运行时拼链、重定向、搜索结果、历史外链、登录后可见入口、微信小程序导航与数据库商品实例可能无法由静态搜索发现。无引用只列为候选，不能直接宣布为孤儿；线上可用性仍需浏览器与真实 HTTP 核实。",
    "",
    "## 1. 网页逐页总表",
    "",
    "| 路由模板 | 主归属 | 层级 | 权限/索引边界 | 源码中的入口线索（最多 2 条） |",
    "| --- | --- | --- | --- | --- |",
]
for page in pages:
    evidence = "、".join(QUOTE + p + QUOTE for p in page["incoming"][:2]) or "未检出字面路径，待核实"
    lines.append("| " + QUOTE + page["url"] + QUOTE + " | " + page["owner"] + " | " + page["level"] + " | " + page["access"] + " | " + evidence + " |")
lines += [
    "",
    "## 2. 未检出源码入口的候选页面",
    "",
    "下面每项仍可能由动态 URL、考试状态跳转、个人中心或搜索发现。逐项找实证，不能直接删除。",
    "",
    "| 页面 | 优先检查 |",
    "| --- | --- |",
]
for page in candidates:
    lines.append("| " + QUOTE + page["url"] + QUOTE + " | 上级页面入口、实际业务流、旧 URL 兼容、breadcrumb、canonical |")
lines += [
    "",
    "## 3. API handler 归属（不是公众页面）",
    "",
    "| API 模板 | 业务或基础设施 |",
    "| --- | --- |",
]
for item in api_routes:
    lines.append("| " + QUOTE + item["url"] + QUOTE + " | " + item["owner"] + " |")
lines += ["", "## 4. 小程序独立页面"]
for file in miniapp:
    lines.append("- " + QUOTE + file + QUOTE)
lines += [
    "",
    "## 5. 根布局与页面重复 main 地标",
    "",
    "根布局 src/app/layout.tsx 已声明一个 main。以下页面代码中仍直接含有 main 标签，必须审查为重复主地标的风险，不应简单断言 CSS 不受影响。",
]
for page in nested_main:
    lines.append("- " + QUOTE + page["url"] + QUOTE + " — " + QUOTE + page["source"] + QUOTE)
lines += [
    "",
    "## 6. 每一行真正完成所需的验收",
    "",
    "1. **归属**：唯一主 owner，L1/L2/L3/L4 层级，允许跨业务推荐但不能多重面包屑。",
    "2. **可达**：首页/六大业务父页/业务详情/真实数据库目录能到达；有一条合理返回路；明确静态与动态 URL；历史书签不断链。",
    "3. **事实**：官网来源/真实年份/权利/可练和可售状态/正确内容和标题；免费、待验证和付费的 CTA 不混淆。",
    "4. **索引**：公开内容 canonical 唯一；订单/结果/账户/后台 noindex 与服务端权限隔离；Sitemap、robots、真实 200/3xx/404 一致。",
    "5. **交互**：手机、平板、桌面实际点击；顶部菜单、面包屑、开始考试、完成、回退、登录、授权下载路径；不能以 HTTP 200 充当支付或交付成功。",
    "",
    "将这一总账作为 Issue #268 的明细附件；修复只写入已有 owner 及数据源，不新增一级『在线练习』『考试管理』『书库』或第二支付账本，也不设置新发布门禁。**只有实际全路径验证完才能把候选孤儿页改标为已确认。**",
    "",
]
report = ROOT / "docs/architecture/SOCTHINK_PAGE_ROUTE_INVENTORY.md"
report.write_text("\n".join(lines), encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False))
