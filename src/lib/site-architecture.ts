/**
 * SOC THINK public information architecture: one small source for business
 * navigation and page ownership. This is NOT a CMS, exam catalog, product
 * registry, permission rule, or payment authority.
 * Canonical design: docs/architecture/SOCTHINK_SITE_ARCHITECTURE_MASTER.md
 */
export const PRIMARY_BUSINESS_NAV = [
  {id:"exams",href:"/assessments",zh:"全部考试",en:"All exams"},
  {id:"resources",href:"/resources",zh:"真题资料",en:"Papers"},
  {id:"career",href:"/career",zh:"职业岗位",en:"Careers"},
  {id:"skills",href:"/skill-labs",zh:"技能实训",en:"Skill labs"},
  {id:"assessments",href:"/assessment-center",zh:"测评中心",en:"Assessments"},
  {id:"store",href:"/shop",zh:"数字商城",en:"Digital store"},
] as const;

export type SiteBusinessId = typeof PRIMARY_BUSINESS_NAV[number]["id"];

/** Public URLs that are outside their owner's URL prefix for legacy reasons. */
export const BUSINESS_SUBROUTES:readonly {path:string;owner:SiteBusinessId;role:string}[] = [
  {path:"/arithmetic",owner:"exams",role:"school-math-practice"},
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
