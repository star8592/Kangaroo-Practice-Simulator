import type {CareerFamilyId} from "./career-demand";

/** Customer-facing discovery taxonomy. Industry/role names are navigation
 * vocabulary, not individually verified hiring posts or government codes.
 * Broad sector organisation informed by the 2022 national occupation
 * classification and common domestic employer titles; our 13 shelves are
 * independent UI categories, NOT the official eight statutory major groups.
 */
type RoleSegmentSeed=Readonly<{
  label:string;family:CareerFamilyId|null;roles:string;
}>;
type RoleGroupSeed=Readonly<{
  id:string;title:string;segments:readonly RoleSegmentSeed[];
}>;
const SOURCE_NOTE="https://www.ndrc.gov.cn/fggz/jyysr/jysrsbxf/202210/t20221031_1340470.html";
const SEEDS:readonly RoleGroupSeed[]=[
  {
    "id": "digital",
    "title": "互联网与软件",
    "segments": [
      {
        "label": "软件开发",
        "family": "software",
        "roles": "Java开发工程师、前端开发工程师、Python开发工程师、Go开发工程师、全栈开发工程师、客户端开发工程师、移动端开发工程师、嵌入式软件工程师、后端架构师、数据库开发工程师"
      },
      {
        "label": "软件测试与质量",
        "family": "software",
        "roles": "软件测试工程师、测试开发工程师、自动化测试工程师、性能测试工程师、移动端测试工程师、测试项目经理"
      },
      {
        "label": "网络安全与运维",
        "family": "software",
        "roles": "运维工程师、SRE工程师、DevOps工程师、云平台运维工程师、网络工程师、信息安全工程师、安全运营工程师、系统管理员"
      }
    ]
  },
  {
    "id": "intelligence",
    "title": "人工智能与数据",
    "segments": [
      {
        "label": "AI研发与应用",
        "family": "ai",
        "roles": "机器学习工程师、算法工程师、大模型应用工程师、智能体开发工程师、计算机视觉工程师、自然语言处理工程师、推荐算法工程师、语音算法工程师、模型评测工程师、AI产品解决方案工程师"
      },
      {
        "label": "数据分析与工程",
        "family": "data",
        "roles": "数据分析师、数据工程师、数据开发工程师、商业分析师、BI分析师、数据治理工程师、数据质量工程师、数据仓库工程师、统计分析师、实验分析师、数据科学家"
      }
    ]
  },
  {
    "id": "product-ops",
    "title": "产品与商业运营",
    "segments": [
      {
        "label": "产品管理与策略",
        "family": "product",
        "roles": "产品经理、策略产品经理、数据产品经理、平台产品经理、商业化产品经理、需求分析师、产品运营经理、项目产品经理、用户研究员"
      },
      {
        "label": "电商与零售运营",
        "family": "operations",
        "roles": "商品运营专员、电商运营专员、品类运营经理、店铺运营专员、平台运营专员、直播电商运营专员、选品专员、商品定价专员、零售经营分析师"
      },
      {
        "label": "用户增长与内容运营",
        "family": "operations",
        "roles": "用户增长运营、活动运营、会员运营、私域运营、社区运营、内容运营、用户留存运营、增长分析师"
      }
    ]
  },
  {
    "id": "business",
    "title": "市场营销与销售",
    "segments": [
      {
        "label": "市场品牌传播",
        "family": "marketing",
        "roles": "品牌经理、市场营销专员、市场调研分析师、广告投放优化师、新媒体营销专员、公关专员、营销策划师、市场活动经理、媒介策划"
      },
      {
        "label": "销售与客户拓展",
        "family": "sales",
        "roles": "销售代表、大客户经理、区域销售经理、渠道经理、商务拓展经理、销售运营专员、海外销售专员、工业技术销售、售前咨询顾问、客户成功经理、销售分析师"
      },
      {
        "label": "方案与商务管理",
        "family": "sales",
        "roles": "招投标专员、解决方案经理、商务经理、售前技术顾问、销售项目经理、商务谈判专员"
      }
    ]
  },
  {
    "id": "finance",
    "title": "金融会计与审计",
    "segments": [
      {
        "label": "会计税务与财务",
        "family": "finance",
        "roles": "财务会计、总账会计、成本会计、税务专员、预算分析师、财务分析师、资金管理专员、财务BP、管理会计、财务共享专员"
      },
      {
        "label": "金融业务与投资",
        "family": "finance",
        "roles": "金融分析师、证券研究助理、投融资专员、量化研究员、投资经理助理、银行客户经理、信贷分析师、财富顾问"
      },
      {
        "label": "审计与风控",
        "family": "finance",
        "roles": "内审专员、审计助理、财务风控专员、合规风控分析师、反欺诈分析师、财务内控专员"
      }
    ]
  },
  {
    "id": "industry",
    "title": "制造业与工业工程",
    "segments": [
      {
        "label": "机械电气及自动化",
        "family": null,
        "roles": "机械设计工程师、电气工程师、自动化工程师、设备工程师、工艺工程师、工业工程师、PLC工程师、机器人调试工程师、生产计划工程师"
      },
      {
        "label": "工业质量与可靠性",
        "family": "supply",
        "roles": "质量工程师、供应商质量工程师、质量体系工程师、可靠性工程师、质量检验工程师、质量改进工程师、FMEA工程师、APQP项目工程师、生产质量主管"
      },
      {
        "label": "制造生产管理",
        "family": null,
        "roles": "制造项目经理、生产主管、车间主管、生产运营经理、精益生产工程师、生产调度专员"
      }
    ]
  },
  {
    "id": "supply",
    "title": "采购供应链与物流",
    "segments": [
      {
        "label": "采购与寻源",
        "family": "procurement",
        "roles": "采购专员、采购工程师、战略采购经理、供应商开发专员、供应商管理专员、采购成本分析师、间接采购专员、国际采购专员"
      },
      {
        "label": "计划与供应链",
        "family": "supply",
        "roles": "供应链专员、供应链计划工程师、需求预测分析师、库存管理专员、物料计划专员、供应链数据分析师、S&OP计划专员、订单履约专员"
      },
      {
        "label": "物流仓储与贸易",
        "family": "logistics",
        "roles": "物流规划专员、仓储运营主管、物流调度员、运输运营专员、跨境物流专员、进出口单证专员、报关员、供应链交付经理、仓库数据分析师"
      }
    ]
  },
  {
    "id": "people",
    "title": "组织人事与行政",
    "segments": [
      {
        "label": "人力资源管理",
        "family": "hr",
        "roles": "招聘专员、HRBP、培训发展专员、薪酬绩效专员、组织发展专员、员工关系专员、人才发展经理、人力资源数据分析师"
      },
      {
        "label": "行政及企业管理",
        "family": null,
        "roles": "行政专员、办公室主任、企业运营专员、综合管理专员、企业项目专员、董事会事务专员、档案管理专员"
      }
    ]
  },
  {
    "id": "legal",
    "title": "法务合规与治理",
    "segments": [
      {
        "label": "企业法务",
        "family": "legal",
        "roles": "法务专员、合同管理专员、知识产权专员、法律顾问助理、诉讼管理专员、合同审核专员"
      },
      {
        "label": "监管与内控",
        "family": "legal",
        "roles": "数据合规专员、隐私合规专员、贸易合规专员、内控合规专员、反洗钱专员、合规调查员"
      }
    ]
  },
  {
    "id": "creative",
    "title": "设计传媒与游戏",
    "segments": [
      {
        "label": "设计与用户体验",
        "family": "design",
        "roles": "UI设计师、UX设计师、视觉设计师、交互设计师、品牌设计师、平面设计师、动效设计师、商业插画师、用户体验研究员"
      },
      {
        "label": "影视传媒与内容",
        "family": null,
        "roles": "视频剪辑师、编导、短视频策划、文案策划、影视后期制作、播客制作人、编辑记者、内容制作人"
      },
      {
        "label": "游戏与互动产品",
        "family": "games",
        "roles": "游戏策划、游戏数值策划、游戏系统策划、关卡设计师、游戏运营、游戏数据分析师、技术美术、游戏客户端开发工程师"
      }
    ]
  },
  {
    "id": "construction",
    "title": "建筑能源与环保",
    "segments": [
      {
        "label": "建筑设计与工程",
        "family": null,
        "roles": "建筑设计师、结构工程师、施工工程师、工程造价师、BIM工程师、工程项目经理、建筑机电工程师"
      },
      {
        "label": "能源及电力",
        "family": null,
        "roles": "电力系统工程师、新能源项目工程师、光伏系统工程师、储能系统工程师、电网运维工程师、电气设计师"
      },
      {
        "label": "环保与可持续发展",
        "family": null,
        "roles": "碳管理专员、环境工程师、ESG分析师、节能工程师、环保运营专员"
      }
    ]
  },
  {
    "id": "health",
    "title": "医药健康与生命科学",
    "segments": [
      {
        "label": "医疗技术与服务",
        "family": null,
        "roles": "临床数据管理员、医学检验技师、护理管理专员、医疗器械销售、医院运营专员、健康管理师"
      },
      {
        "label": "医药研发与注册",
        "family": null,
        "roles": "药物研发助理、临床试验专员、医学事务专员、药品注册专员、药物警戒专员、药企质量专员"
      }
    ]
  },
  {
    "id": "public",
    "title": "教育培训与服务",
    "segments": [
      {
        "label": "教育与培训",
        "family": null,
        "roles": "课程研发专员、教研员、培训讲师、教育产品经理、教育运营专员、学习顾问"
      },
      {
        "label": "客户与服务交付",
        "family": "customer_service",
        "roles": "客户服务专员、客户体验专员、售后技术支持、客服质检专员、客户投诉处理专员、服务运营专员、实施交付顾问、技术支持工程师"
      },
      {
        "label": "公共与社会服务",
        "family": null,
        "roles": "公共项目专员、社会服务专员、社区项目运营、公共关系事务专员"
      }
    ]
  }
];

export type CareerRole=Readonly<{
  id:string;title:string;segment:string;groupId:string;groupTitle:string;
  family:CareerFamilyId|null;
}>;
export type CareerRoleGroup=Readonly<{
  id:string;title:string;segments:readonly {name:string;family:CareerFamilyId|null;roles:readonly CareerRole[]}[];
  roleCount:number;
}>;
export const CAREER_ROLE_TAXONOMY_SOURCE=SOURCE_NOTE;
const slug=(groupId:string,segment:number,position:number)=>
  groupId+"-"+String(segment+1).padStart(2,"0")+"-"+String(position+1).padStart(2,"0");
export const CAREER_ROLE_GROUPS:readonly CareerRoleGroup[]=SEEDS.map(group=>{
  const segments=group.segments.map((seg,i)=>({
    name:seg.label,family:seg.family,
    roles:seg.roles.split("、").map((title,j):CareerRole=>({
      id:slug(group.id,i,j),title,segment:seg.label,groupId:group.id,
      groupTitle:group.title,family:seg.family,
    })),
  }));
  return {id:group.id,title:group.title,segments,
    roleCount:segments.reduce((sum,s)=>sum+s.roles.length,0)};
});
export const CAREER_ROLES:readonly CareerRole[]=CAREER_ROLE_GROUPS.flatMap(
  group=>group.segments.flatMap(s=>s.roles));
export function searchCareerRoles(query:string,groupId:string=""):CareerRole[]{
  const q=query.trim().toLocaleLowerCase("zh-CN").slice(0,60);
  return CAREER_ROLES.filter(role=>(!groupId||role.groupId===groupId)&&
    (!q||[role.title,role.groupTitle,role.segment].join(" ").toLocaleLowerCase("zh-CN").includes(q)));
}
export function getCareerRole(roleId:string):CareerRole|undefined{
  return CAREER_ROLES.find(x=>x.id===roleId);
}
export function validateCareerRoleTaxonomy():string[]{
  const errors:string[]=[];
  const ids=new Set<string>(),names=new Set<string>();
  for(const g of CAREER_ROLE_GROUPS){
    if(g.roleCount<5)errors.push("group too sparse:"+g.id);
    if(g.segments.length<2)errors.push("group lacks subcategories:"+g.id);
    for(const s of g.segments)for(const role of s.roles){
      if(ids.has(role.id))errors.push("duplicate role id:"+role.id);
      ids.add(role.id);
      const norm=role.title.replaceAll(" ","");
      if(names.has(norm))errors.push("duplicate role name:"+norm);
      names.add(norm);
      if(!role.title.trim()||role.title.length<2)errors.push("role title invalid:"+role.id);
      if(!s.name.trim())errors.push("segment invalid:"+role.id);
    }
  }
  if(CAREER_ROLE_GROUPS.length<10||CAREER_ROLES.length<120)
    errors.push("catalog too small");
  return errors;
}
