/**
 * SOC THINK public information architecture: one small source for business
 * navigation and page ownership. This is NOT a CMS, exam catalog, product
 * registry, permission rule, or payment authority.
 * Canonical design: docs/architecture/SOCTHINK_SITE_ARCHITECTURE_MASTER.md
 */
/** Three user goals, not a list of internal businesses.
 * Legacy URLs remain classified for breadcrumbs; this is NOT a second nav.
 */
export const PRIMARY_BUSINESS_NAV = [
  {id:"career",href:"/career",zh:"岗位方向",en:"Roles"},
  {id:"skills",href:"/learn",zh:"学习与实训",en:"Learn"},
  {id:"practice",href:"/practice",zh:"模拟笔试与面试",en:"Practice"},
] as const;

/** Historical ownership is kept until the math classroom moves to its
 * own endpoint. It does not confer navigation, sales or search eligibility.
 */
export type SiteBusinessId = "exams" | "resources" | "career" | "skills" |
  "assessments" | "store" | "practice";
const LEGACY_BUSINESS_PATHS:readonly {id:SiteBusinessId;href:string}[]=[
  {id:"exams",href:"/assessments"},
  {id:"resources",href:"/resources"},
  {id:"skills",href:"/skill-labs"},
  {id:"assessments",href:"/assessment-center"},
  {id:"store",href:"/shop"},
];

/** Public URLs that are outside their owner's URL prefix for legacy reasons. */
export const BUSINESS_SUBROUTES:readonly {path:string;owner:SiteBusinessId;role:string}[] = [
  {path:"/arithmetic",owner:"exams",role:"school-math-practice"},
  {path:"/math",owner:"exams",role:"classroom-math-portal"},
  {path:"/math",owner:"exams",role:"classroom-math-portal"},
  {path:"/math-practice",owner:"exams",role:"school-math-practice"},
  {path:"/competitions",owner:"exams",role:"competition-mocks"},
  {path:"/review",owner:"exams",role:"mistake-review"},
  {path:"/exam-planner",owner:"exams",role:"personal-exam-calendar"},
  {path:"/events",owner:"exams",role:"competition-companion"},
  {path:"/verification",owner:"exams",role:"math-proof-records"},
];

/** Execution-only public routes have an owner but must never appear as L1.
 * The account/student dashboard remains a cross-cutting facility, not a new
 * learning business. An exam result is not a product and cannot be indexed.
 */
export const EXAM_EXECUTION_PREFIXES = ["/exam", "/result", "/report"] as const;

/** Classification is for breadcrumbs/navigation, never for access control. */
export function businessForPublicPath(rawPath:string):SiteBusinessId|null {
  const pathname=rawPath.split(/[?#]/)[0].replace(/\/+$/,"") || "/";
  const branch=PRIMARY_BUSINESS_NAV.find(x=>
    pathname===x.href || pathname.startsWith(x.href+"/"));
  if(branch)return branch.id;
  const legacy=LEGACY_BUSINESS_PATHS.find(x=>
    pathname===x.href || pathname.startsWith(x.href+"/"));
  if(legacy)return legacy.id;
  if(EXAM_EXECUTION_PREFIXES.some(prefix=>
    pathname===prefix||pathname.startsWith(prefix+"/")))return "exams";
  const subordinate=BUSINESS_SUBROUTES.find(x=>
    pathname===x.path || pathname.startsWith(x.path+"/"));
  return subordinate?.owner??null;
}

/** Keep already-indexed hashes discoverable without retaining false categories. */
export function legacyExamHashDestination(hash:string):string|null {
  if(hash==="domain-career")return "/career";
  if(hash==="domain-interest")return "/assessment-center";
  return null;
}
